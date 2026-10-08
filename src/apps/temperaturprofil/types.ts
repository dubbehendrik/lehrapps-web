export interface Parameters {
  alpha: number;
  cp: number;
  area: number;
  mass: number;
  referenceTime: number;
  referenceTemperature: number;
  ambientTemperature: number;
  endTime: number;
  step: number;
}
export interface Measurement {
  time: number;
  temperature: number;
}
export interface Fit {
  alpha: number;
  rmse: number;
  rSquared: number | null;
  from: number;
  to: number;
  count: number;
  residuals: Measurement[];
}
export interface Curve {
  id: number;
  name: string;
  color: string;
  params: Parameters;
  source: string;
  fit: Fit | null;
  measurements: Measurement[];
  selected: boolean;
}
