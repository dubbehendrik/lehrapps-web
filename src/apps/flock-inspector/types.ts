export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; width: number; height: number };
export type Fiber = {
  id: string;
  points: Point[];
  status: "accepted" | "review" | "excluded";
  reason: string;
  manual: boolean;
};
export type ImageRecord = {
  id: string;
  name: string;
  material: string;
  sample: string;
  series: string;
  dataUrl: string;
  originalDataUrl?: string;
  width: number;
  height: number;
  calibration?: { points: [Point, Point]; mm: number };
  scale: Point;
  exclusions: Rect[];
  roi?: Rect;
  fibers: Fiber[];
  settings: {
    contrast: number;
    minPixels: number;
    polarity: "dark" | "light";
    crosshair: boolean;
  };
};
export type Project = {
  format: "flock-inspector";
  version: 1;
  name: string;
  images: ImageRecord[];
  comparison: {
    mode: "series" | "material";
    a: string;
    b: string;
    alpha: number;
  };
};
