import { describe, expect, it } from 'vitest';
import { classEdges, cumulativeAt, defaultSettings, excelCounts, histogram, momentMean, quantile, syntheticDatasets, validateDiameters, weightedPopulation } from '../src/apps/tropfengroessenverteilung/logic';
import { HEADER, parseRows } from '../src/apps/tropfengroessenverteilung/workbook';
import type { Order } from '../src/apps/tropfengroessenverteilung/types';
describe('Tropfengrößenverteilung – unabhängige Referenzen', () => {
  it('reproduces the 5 µm Excel class-midpoint reference, separately from synthetic drops', () => {
    const values = excelCounts.flatMap((n, k) => Array<number>(n).fill(2.5 + 5 * k));
    expect(values).toHaveLength(203);
    expect(momentMean(values, 1, 0)).toBeCloseTo(37.672413793103445, 10);
    expect(momentMean(values, 3, 2)).toBeCloseTo(46.132734530938123, 10);
    const volume = weightedPopulation(values, 3);
    expect(cumulativeAt(volume, 37.5)).toBeCloseTo(0.27585627497413981, 12);
    expect(cumulativeAt(volume, 47.5)).toBeCloseTo(0.52836642215419516, 12);
    expect(cumulativeAt(volume, 77.5)).toBeCloseTo(1, 12);
  });
  it('distinguishes number and volume in the 1000 small / 1 large example', () => {
    const values = [...Array<number>(1000).fill(10), 100];
    expect(cumulativeAt(weightedPopulation(values, 0), 10)).toBeCloseTo(1000 / 1001, 12);
    expect(cumulativeAt(weightedPopulation(values, 3), 10)).toBeCloseTo(0.5, 12);
    expect(momentMean(values, 3, 2)).toBeCloseTo(200 / 11, 10);
    expect(momentMean(values, 4, 3)).toBeCloseTo(55, 10);
  });
  it.each([0, 1, 2, 3] as Order[])('normalizes order %i, includes edge observations, and integrates both densities', order => {
    const pop = weightedPopulation([1, 2, 4, 8], order);
    const bins = histogram(pop, [1, 2, 4, 8]);
    expect(bins.shares.reduce((a, b) => a + b)).toBeCloseTo(1, 12);
    expect(bins.shares[0]).toBeCloseTo(pop.fractions[0], 12);
    expect(bins.shares[2]).toBeCloseTo(pop.fractions[2] + pop.fractions[3], 12);
    expect(bins.density.reduce((s, v, i) => s + v * (bins.edges[i + 1] - bins.edges[i]), 0)).toBeCloseTo(1, 12);
    expect(bins.logDensity.reduce((s, v, i) => s + v * Math.log10(bins.edges[i + 1] / bins.edges[i]), 0)).toBeCloseTo(1, 12);
  });
  it('uses empirical weighted quantiles, preserves ties and endpoints', () => {
    const pop = weightedPopulation([4, 1, 2, 2], 0);
    expect(quantile(pop, 0)).toBe(1); expect(quantile(pop, 0.5)).toBe(2); expect(quantile(pop, 1)).toBe(4);
    expect(cumulativeAt(pop, 2)).toBeCloseTo(0.75, 12);
    expect(cumulativeAt(pop, 0)).toBe(0);
    expect(() => quantile(pop, -0.1)).toThrow();
  });
  it('is invariant to class width and scale-consistent for all means', () => {
    const values = [10, 15, 25, 50, 90], pop = weightedPopulation(values, 3), expected = quantile(pop, 0.5);
    for (const width of [5, 10, 30]) {
      const bins = histogram(pop, classEdges(values, { ...defaultSettings(3), width }));
      expect(bins.shares.reduce((a, b) => a + b)).toBeCloseTo(1, 12);
      expect(quantile(pop, 0.5)).toBe(expected);
    }
    for (const [p, q] of [[1, 0], [3, 2], [4, 3]]) expect(momentMean(values.map(x => 10 * x), p, q)).toBeCloseTo(10 * momentMean(values, p, q), 10);
  });
  it('handles one identical diameter and rejects invalid sizes/settings', () => {
    for (const order of [0, 1, 2, 3] as Order[]) expect(quantile(weightedPopulation([25, 25], order), 0.5)).toBe(25);
    const edges = classEdges([25, 25], { ...defaultSettings(0), spacing: 'log', binMode: 'count', count: 5 });
    expect(edges[0]).toBeLessThan(25); expect(edges[5]).toBeGreaterThan(25);
    expect(() => validateDiameters([])).toThrow();
    for (const value of [0, -1, NaN, Infinity, 100001]) expect(() => validateDiameters([value])).toThrow();
    expect(() => classEdges([100], { ...defaultSettings(0), width: 0 })).toThrow();
    expect(() => classEdges([100], { ...defaultSettings(0), width: 0.01 })).toThrow();
    expect(() => classEdges([100], { ...defaultSettings(0), spacing: 'log', ratio: 1 })).toThrow();
    expect(() => classEdges([100], { ...defaultSettings(0), binMode: 'count', count: 2.5 })).toThrow();
  });
  it('produces reproducible, distinct synthetic populations in the intended magnitude', () => {
    const [a, b] = syntheticDatasets(), repeat = syntheticDatasets();
    expect(a.diameters).toHaveLength(4060); expect(b.diameters).toHaveLength(5000);
    expect(a.diameters).toEqual(repeat[0].diameters); expect(b.diameters).toEqual(repeat[1].diameters);
    expect(momentMean(a.diameters, 3, 2)).toBeGreaterThan(40); expect(momentMean(a.diameters, 3, 2)).toBeLessThan(55);
    expect(momentMean(b.diameters, 3, 2)).toBeGreaterThan(1.4 * momentMean(a.diameters, 3, 2));
    expect(quantile(weightedPopulation(b.diameters, 3), 0.9)).toBeLessThanOrEqual(180);
    expect(a.synthetic && b.synthetic).toBe(true);
  });
});
describe('Einzeltropfen-Template', () => {
  it('accepts numeric values, decimal commas, empty lines and scientific notation', () => {
    expect(parseRows([[HEADER], [10], ['12,5'], [], ['2.5e1']])).toEqual([10, 12.5, 25]);
  });
  it('rejects wrong headers, multiple columns, invalid rows, and empty data', () => {
    expect(() => parseRows([['Klassenmitte'], [5]])).toThrow();
    expect(() => parseRows([[HEADER, 'Anzahl'], [5, 10]])).toThrow();
    expect(() => parseRows([[HEADER], [0]])).toThrow('Zeile 2');
    expect(() => parseRows([[HEADER], ['abc']])).toThrow('Zeile 2');
    expect(() => parseRows([[HEADER]])).toThrow();
  });
});
