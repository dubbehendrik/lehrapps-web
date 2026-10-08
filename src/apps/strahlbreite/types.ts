export interface Measurement {
  position: number;
  thickness: number;
}
export interface SingleProfile {
  x: number[];
  y: number[];
  maximum: number;
  halfWidth: number | null;
  halfBounds: [number, number] | null;
  peakPosition: number;
}
export interface Coating {
  x: number[];
  y: number[];
  maximum: number;
  automaticThickness: number;
  overlapPercent: number;
  overlapFactor: number;
}
