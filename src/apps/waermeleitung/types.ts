export type Axis = 'x' | 'y' | 'z';
export type Plane = 'XY' | 'XZ' | 'YZ';
export interface Parameters {
  size: [number, number, number]; // full dimensions in mm
  points: [number, number, number]; // full dimensions including surfaces
  alphas: [number, number, number, number, number, number]; // x-,x+,y-,y+,z-,z+
  conductivity: number; density: number; cp: number;
  initial: number; ambient: number; endTime: number; material: string;
}
export interface View { plane: Plane; position: number; time: number; smooth: boolean }
export interface AxisSolution { q: number[]; phase: number[]; coefficient: number[]; fo: number; tailBound: number; adiabatic: boolean }
export interface Slice {
  horizontal: Axis; vertical: Axis; normal: Axis;
  u: number[]; v: number[]; temperature: number[][];
  terms: number[]; errorBound: number; converged: boolean;
  bi: number[]; fo: number[]; center: number;
  profiles: { x: number[]; temperature: number[] }[];
}
export const defaults: Parameters = {
  size: [70,70,5], points: [101,101,41], alphas: [10,10,10,10,10,10],
  conductivity: 50, density: 7850, cp: 477, initial: 180, ambient: 20,
  endTime: 1800, material: 'Stahl (unlegiert, Lehrwert)',
};
