import { Pose } from "@mediapipe/pose";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { POSE_CONNECTIONS } from "@mediapipe/pose";

export class MediaPipePose {
  private pose: Pose;
  private canvasCtx: CanvasRenderingContext2D | null = null;

  constructor() {
    this.pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  private extractLandmarks(results: any) {
    if (!results.poseLandmarks) return null;

    const lm = results.poseLandmarks;

    return {
      left_shoulder: [lm[11].x, lm[11].y],
      right_shoulder: [lm[12].x, lm[12].y],
      left_ear: [lm[7].x, lm[7].y],
      right_ear: [lm[8].x, lm[8].y],
      left_hip: [lm[23].x, lm[23].y],
      right_hip: [lm[24].x, lm[24].y],
      nose: [lm[0].x, lm[0].y],
    };
  }

  async initialize(

    canvas: HTMLCanvasElement,
    onResults: (results: any) => void
  ) {
    this.canvasCtx = canvas.getContext("2d");

    this.pose.onResults((results) => {
      if (!this.canvasCtx) return;

      this.canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks) {
        drawConnectors(this.canvasCtx, results.poseLandmarks, POSE_CONNECTIONS);
        drawLandmarks(this.canvasCtx, results.poseLandmarks);
      }

      const structured = this.extractLandmarks(results);
      onResults(structured);
    });
  }

  async send(video: HTMLVideoElement) {
    await this.pose.send({ image: video });
  }
}