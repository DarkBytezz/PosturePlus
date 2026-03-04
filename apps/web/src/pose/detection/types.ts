export type Landmarks = {
  left_shoulder: [number, number];
  right_shoulder: [number, number];
  left_ear: [number, number];
  right_ear: [number, number];
  left_hip: [number, number];
  right_hip: [number, number];
  nose: [number, number];
};

export type StructuredLandmarks = Landmarks | null;