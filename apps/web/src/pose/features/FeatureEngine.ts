import type { StructuredLandmarks, Landmarks } from "../detection/types";

export type FeatureMetrics = {
  forward_metric: number;
  lateral_metric: number;
  shoulder_metric: number;
};

export class FeatureEngine {
  // Forward + lateral: fast enough to catch real head movement (α=0.1)
  // Shoulder: much slower — shoulders jitter heavily from MediaPipe noise (α=0.04)
  private alpha_fast   = 0.1;
  private alpha_shoulder = 0.04;  // ~25 frame window — filters out jitter

  private smoothed_forward: number | null = null;
  private smoothed_lateral: number | null = null;
  private smoothed_shoulder: number | null = null;

  private ema(previous: number | null, current: number, alpha: number): number {
    if (previous === null) return current;
    return alpha * current + (1 - alpha) * previous;
  }

  compute(landmarks: StructuredLandmarks): FeatureMetrics | null {
    if (!landmarks) return null;

    const l: Landmarks = landmarks;

    const left_shoulder = l.left_shoulder;
    const right_shoulder = l.right_shoulder;
    const left_ear = l.left_ear;
    const right_ear = l.right_ear;

    // Midpoints (Y only)
    const shoulder_mid_y =
      (left_shoulder[1] + right_shoulder[1]) / 2;

    const ear_mid_y =
      (left_ear[1] + right_ear[1]) / 2;

    // Shoulder width (scale reference)
    const shoulder_width =
      Math.abs(left_shoulder[0] - right_shoulder[0]);

    let forward_metric = 0;
    let lateral_metric = 0;
    let shoulder_metric = 0;

    if (shoulder_width !== 0) {
      forward_metric =
        (ear_mid_y - shoulder_mid_y) / shoulder_width;

      // Normalize by shoulder_width for scale-invariance (matches Python benchmark)
      lateral_metric =
        Math.abs(left_ear[1] - right_ear[1]) / shoulder_width;

      shoulder_metric =
        Math.abs(left_shoulder[1] - right_shoulder[1]) /
        shoulder_width;
    }

    // EMA smoothing — shoulder uses slower alpha to suppress MediaPipe jitter
    this.smoothed_forward =
      this.ema(this.smoothed_forward, forward_metric, this.alpha_fast);

    this.smoothed_lateral =
      this.ema(this.smoothed_lateral, lateral_metric, this.alpha_fast);

    this.smoothed_shoulder =
      this.ema(this.smoothed_shoulder, shoulder_metric, this.alpha_shoulder);

    return {
      forward_metric: this.smoothed_forward!,
      lateral_metric: this.smoothed_lateral!,
      shoulder_metric: this.smoothed_shoulder!,
    };
  }
}