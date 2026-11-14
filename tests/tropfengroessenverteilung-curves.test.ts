import { describe, expect, it } from 'vitest';
import { cumulativeCurve, curveAt } from '../src/apps/tropfengroessenverteilung/curves';
import { histogram, quantile, weightedPopulation } from '../src/apps/tropfengroessenverteilung/logic';

describe('Darstellung der Summenverteilung', () => {
  it('connects weighted class sums with linear segments and interpolates marker positions on them', () => {
    const population = weightedPopulation([1, 3, 7, 9], 0);
    const bins = histogram(population, [0, 5, 10]);
    const curve = cumulativeCurve(population, bins, 'classified', false, 0);
    expect(curve.x).toEqual([0, 5, 10]); expect(curve.y).toEqual([0, 50, 100]);
    expect(curveAt(curve, 3)).toBeCloseTo(30, 12);
    expect(curveAt(curve, 7)).toBeCloseTo(70, 12);
    expect(curveAt(curve, -1)).toBe(0); expect(curveAt(curve, 10)).toBe(100);
    // Raw-data quantile remains 3, even though the approximation gives 30 % at that diameter.
    expect(quantile(population, 0.5)).toBe(3);
  });
  it('keeps the exact empirical steps, including repeated observations', () => {
    const population = weightedPopulation([1, 3, 3, 9], 0);
    const curve = cumulativeCurve(population, histogram(population, [0, 5, 10]), 'empirical', false, 0);
    expect(curveAt(curve, 2)).toBe(25); expect(curveAt(curve, 3)).toBe(75);
    expect(curveAt(curve, 8)).toBe(75); expect(curveAt(curve, 9)).toBe(100);
  });
  it('matches straight segments in logarithmic screen coordinates', () => {
    const population = weightedPopulation([2, 20], 0);
    const curve = cumulativeCurve(population, histogram(population, [1, 10, 100]), 'classified', true, 1);
    expect(curveAt(curve, Math.sqrt(10))).toBeCloseTo(25, 12);
    expect(curveAt(curve, Math.sqrt(1000))).toBeCloseTo(75, 12);
  });
  it('uses the selected quantity weighting, not counts, for the class sums', () => {
    const population = weightedPopulation([1, 2], 3);
    const curve = cumulativeCurve(population, histogram(population, [0, 1.5, 3]), 'classified', false, 0);
    expect(curveAt(curve, 1.5)).toBeCloseTo(100 / 9, 12);
    expect(curveAt(curve, 3)).toBe(100);
  });
});
