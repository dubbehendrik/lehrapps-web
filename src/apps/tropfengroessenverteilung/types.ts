export type Order = 0 | 1 | 2 | 3;
export interface Dataset { id: string; name: string; diameters: number[]; synthetic: boolean; }
export interface PlotSettings {
  datasetIds: string[]; orders: Order[]; cumulativeOrders: Order[]; distribution: boolean; cumulative: boolean;
  ordinate: 'share' | 'density' | 'logDensity'; logarithmicAxis: boolean;
  spacing: 'linear' | 'log'; binMode: 'width' | 'count'; width: number; ratio: number; count: number;
  quantileOrders: Order[]; percentiles: number[]; means: string[];
}
export interface WeightedPopulation { diameters: number[]; fractions: number[]; cumulative: number[]; }
export interface Histogram { edges: number[]; shares: number[]; density: number[]; logDensity: number[]; }
