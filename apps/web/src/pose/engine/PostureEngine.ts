import { MediaPipePose } from "../detection/MediaPipePose";
import { FeatureEngine } from "../features/FeatureEngine";
import type { StructuredLandmarks } from "../detection/types";
import { PostureIntelligence } from "../intelligence/PostureIntelligence";

type UpdatePayload = {
    psi: number | null;
    zone: "GREEN" | "YELLOW" | "RED";
    forward_dev: number;
    lateral_dev: number;
    shoulder_dev: number;
    recalibrated: boolean;
};

export class PostureEngine {
    private onUpdate?: (data: UpdatePayload) => void;
    private isMounted = true;  // flipped to false on stop() — prevents stale callbacks

    constructor(onUpdate?: (data: UpdatePayload) => void) {
        this.onUpdate = onUpdate;
    }

    private video!: HTMLVideoElement;
    private canvas!: HTMLCanvasElement;
    private pose!: MediaPipePose;

    private isRunning = false;

    private featureEngine = new FeatureEngine();
    private intelligence = new PostureIntelligence();

    async attach(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
        this.video = video;
        this.canvas = canvas;

        await this.setupCamera();

        this.pose = new MediaPipePose();
        await this.pose.initialize(canvas, this.handleResults);
    }

    // =============================

    private async setupCamera() {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 960 },
                height: { ideal: 720 },
                facingMode: "user",
            },
        });

        this.video.srcObject = stream;

        await new Promise((resolve) => {
            this.video.onloadedmetadata = () => {
                this.video.play();
                resolve(true);
            };
        });

        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
    }

    // =============================

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.loop();
    }

    stop() {
        this.isRunning = false;
        this.isMounted = false;
        this.onUpdate  = undefined;  // drop callback ref — prevents closure leaks

        if (this.video && this.video.srcObject) {
            const tracks = (this.video.srcObject as MediaStream).getTracks();
            tracks.forEach((track) => track.stop());
            this.video.srcObject = null;
        }
    }

    // =============================

    startCalibration() {
        this.intelligence.startCalibration();
    }

    isCalibrated() {
        return this.intelligence.isCalibrated();
    }

    // =============================

    private lastFrameTime = 0;
    private FRAME_INTERVAL = 1000 / 12;  // ~83ms — throttle to 12fps

    private loop = async () => {
        if (!this.isRunning || !this.isMounted) return;

        const now = performance.now();
        const elapsed = now - this.lastFrameTime;

        if (elapsed >= this.FRAME_INTERVAL) {
            this.lastFrameTime = now - (elapsed % this.FRAME_INTERVAL);
            await this.pose.send(this.video);
        }

        if (this.isRunning && this.isMounted) {
            requestAnimationFrame(this.loop);
        }
    };

    // =============================

    private handleResults = (landmarks: StructuredLandmarks) => {
        if (!this.isMounted || !this.onUpdate) return;

        const metrics = this.featureEngine.compute(landmarks);
        const output  = this.intelligence.update(metrics);

        if (!output) return;

        this.onUpdate({
            psi:          output.psi,
            zone:         output.zone,
            forward_dev:  output.forward_dev,
            lateral_dev:  output.lateral_dev,
            shoulder_dev: output.shoulder_dev,
            recalibrated: output.recalibrated,
        });
    };

    getSessionMetrics() {
        return this.intelligence.getSessionMetrics();
    }

    getRecalibrationCount() {
        return this.intelligence.recalibration_count;
    }
}