import { describe, it, expect } from "vitest";
import {
  defaults,
  fitAlpha,
  simulate,
  temperature,
  parsePaste,
  importRows,
  measurementsFromRows,
} from "../src/apps/temperaturprofil/logic";
import references from "./temperature-references.json";
describe("Python reference parity", () => {
  for (const [i, c] of references.fits.entries())
    it(`SciPy fit ${c.name} ${i}`, () => {
      const fit = fitAlpha(
        c.points.map(([time, temperature]) => ({ time, temperature })),
        c.params,
        c.start,
        c.end,
      );
      expect(fit.alpha).toBeCloseTo(c.alpha, 3);
      expect(fit.rmse).toBeCloseTo(c.rmse, 7);
      expect(fit.rSquared).toBeCloseTo(c.r2, 7);
    });
  for (const [i, c] of references.forward.entries())
    it(`NumPy forward ${i}`, () => {
      const actual = simulate(c.params);
      expect(actual.length).toBe(c.points.length);
      c.points.forEach(([t, T], j) => {
        expect(actual[j].time).toBe(t);
        expect(actual[j].temperature).toBeCloseTo(T, 10);
      });
    });
});
describe("edge cases", () => {
  it("fits shifted reference without moving it for interval", () => {
    const p = { ...defaults, alpha: 40, referenceTime: 10, endTime: 300 };
    const points = simulate(p);
    expect(fitAlpha(points, p, 100, 200).alpha).toBeCloseTo(40, 6);
    expect(temperature(10, p)).toBe(20);
  });
  it("rejects nonidentifiable temperatures", () =>
    expect(() =>
      fitAlpha(
        simulate(defaults),
        { ...defaults, ambientTemperature: 20 },
        0,
        100,
      ),
    ).toThrow());
  it("rejects too few points and invalid intervals", () => {
    expect(() => fitAlpha([], defaults, 0, 100)).toThrow();
    expect(() => fitAlpha(simulate(defaults), defaults, -1, 100)).toThrow();
  });
  it("rejects invalid inputs and point count", () => {
    for (const change of [
      { cp: 0 },
      { mass: -1 },
      { alpha: -1 },
      { step: NaN },
      { step: 0.0001 },
      { referenceTemperature: -300 },
    ])
      expect(() => simulate({ ...defaults, ...change })).toThrow();
  });
  it("supports decimal comma and empty measurement columns", () => {
    expect(parsePaste("10\t20,5\n20\t30")).toEqual([
      { time: 10, temperature: 20.5 },
      { time: 20, temperature: 30 },
    ]);
    const rows = [
      ["Zeit", "T"],
      ...[900, 0.1, 1, 20, 100].map((v) => [null, null, null, null, null, v]),
    ];
    expect(importRows(rows).measurements).toEqual([]);
  });
  it("rejects partial rows without silently changing pairs", () =>
    expect(() =>
      measurementsFromRows([
        [10, null],
        [null, 20],
      ]),
    ).toThrow());
  it("zero alpha and constant data have undefined R2", () => {
    const points = [0, 1, 2].map((time) => ({ time, temperature: 20 }));
    const f = fitAlpha(points, defaults, 0, 2);
    expect(f.alpha).toBe(0);
    expect(f.rSquared).toBeNull();
  });
});

it("reports legacy time-only rows on Excel import", () => {
  const rows = [
    ["Zeit", "T"],
    ...[900, 0.1, 1, 20, 100].map((v, i) => [
      i,
      i === 4 ? null : 20 + i,
      null,
      null,
      null,
      v,
    ]),
  ];
  const data = importRows(rows);
  expect(data.excludedRows).toBe(1);
  expect(data.measurements.length).toBe(4);
});
