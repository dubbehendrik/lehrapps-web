import type { Histogram, WeightedPopulation } from './types';
export interface CumulativeCurve { x: number[]; y: number[]; mode: 'classified' | 'empirical'; logarithmicAxis: boolean; }
/** Classification changes only this visual approximation, never raw-data statistics. */
export function cumulativeCurve(population: WeightedPopulation, bins: Histogram, mode: CumulativeCurve['mode'], logarithmicAxis: boolean, displayLow: number): CumulativeCurve {
  if (mode === 'empirical') return { x: [displayLow, ...population.diameters, bins.edges.at(-1)!], y: [0, ...population.cumulative.map(v => 100 * v), 100], mode, logarithmicAxis };
  let total = 0;
  const y = [0, ...bins.shares.map(v => (total += v * 100))]; y[y.length - 1] = 100;
  return { x: [displayLow, ...bins.edges.slice(1)], y, mode, logarithmicAxis };
}
/** Interpolate in the displayed axis coordinate, matching Plotly's straight segments. */
export function curveAt(curve: CumulativeCurve, diameter: number): number {
  const { x, y } = curve;
  if (diameter < x[0]) return 0;
  if (diameter >= x[x.length - 1]) return 100;
  let lo = 0, hi = x.length;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (x[mid] <= diameter) lo = mid + 1; else hi = mid; }
  const i = Math.max(0, lo - 1);
  if (curve.mode === 'empirical') return y[i];
  const transform = (v: number) => curve.logarithmicAxis ? Math.log(v) : v;
  const fraction = (transform(diameter) - transform(x[i])) / (transform(x[i + 1]) - transform(x[i]));
  return y[i] + fraction * (y[i + 1] - y[i]);
}
