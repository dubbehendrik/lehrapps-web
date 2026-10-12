export interface Segment {
  id: number;
  length: number; // mm
  diameter: number; // mm
  material: string;
  conductivity: number;
  density: number;
  cp: number;
  initial: number; // °C
  alpha: number; // W/(m² K)
}
export interface Contact {
  perfect: boolean;
  resistance: number; // AREA-specific R_K, m² K/W (user notation)
  shoulder: 'adiabatic' | 'convection';
  inheritAlpha: boolean;
  alpha: number;
}
export interface Boundary {
  kind: 'dirichlet' | 'neumann' | 'robin';
  temperature: number;
  flux: number; // W/m², outward positive at BOTH ends
  inheritAlpha: boolean;
  alpha: number;
}
export interface Parameters {
  segments: Segment[];
  contacts: Contact[];
  left: Boundary;
  right: Boundary;
  ambient: number;
  initial: number;
  alpha: number;
  initialPerSegment: boolean;
  alphaPerSegment: boolean;
  endTime: number;
}
export const defaultContact = (): Contact => ({perfect: true, resistance: 1e-3, shoulder: 'adiabatic', inheritAlpha: true, alpha: 10});
export const defaultSegment = (id = 1): Segment => ({id, length: 200, diameter: 10, material: 'steel', conductivity: 50, density: 7850, cp: 477, initial: 20, alpha: 10});
export const defaults = (): Parameters => ({
  segments: [defaultSegment()], contacts: [],
  left: {kind:'dirichlet',temperature:20,flux:0,inheritAlpha:true,alpha:10},
  right: {kind:'neumann',temperature:20,flux:0,inheritAlpha:true,alpha:10},
  ambient:100, initial:20, alpha:10, initialPerSegment:false, alphaPerSegment:false, endTime:1800,
});
export interface Mesh {
  x: number[]; // m, cell centers
  dx: number[];
  area: number[];
  capacity: number[]; // J/K
  segment: number[];
  conductivity: number[];
  initial: number[];
  conductance: number[]; // W/K between cell centers, includes contacts
  sink: number[]; // W/K to prescribed temperature/ambient
  source: number[]; // W, temperature-independent RHS
  boundaryConductance: [number, number];
  interfaces: { x:number; left:number; right:number; contact:number }[];
  length: number;
}
export interface Simulation {
  mesh: Mesh;
  times: number[];
  temperatures: number[][];
  stationary: number[] | null;
  stationaryKind: 'unique' | 'energy' | 'none';
  stationaryMessage: string;
  warnings: string[];
  cells: number;
  steps: number;
}
