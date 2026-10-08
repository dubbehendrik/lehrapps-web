import { describe, expect, it } from "vitest";
import examples from "../src/apps/strahlbreite/examples.json";
import references from "./strahlbreite-references.json";
import {
  buildCoating,
  buildSingleProfile,
  measurementsFromRows,
  raisedCosine,
  validateMeasurements,
} from "../src/apps/strahlbreite/logic";
import { evaluateSpline, fitCubicSpline } from "../src/lib/fitpack";
const close = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected)).toBeLessThan(
    1e-8 * Math.max(1, Math.abs(expected)),
  );
describe("SciPy / Streamlit reference parity", () => {
  for (const c of references.cases)
    it(`${c.name}: s=${c.smoothing}, ${c.tracks} tracks, Δy=${c.spacing}`, () => {
      const p = buildSingleProfile(
        examples.find((e) => e.name === c.name)!.points,
        c.smoothing,
      );
      close(p.maximum, c.maximum);
      expect(p.halfWidth).toBe(c.halfWidth);
      expect(p.y.length).toBe(c.profileY.length);
      p.y.forEach((y, i) => close(y, c.profileY[i]));
      const total = buildCoating(p, c.tracks, c.spacing);
      close(total.maximum, c.totalMaximum);
      close(total.automaticThickness, c.automaticThickness);
      expect(total.x.length).toBe(c.totalCount);
      c.totalSamples.forEach((sample) => {
        close(total.x[sample.index], sample.x);
        close(total.y[sample.index], sample.y);
      });
    });
});
describe("Special cases and validation", () => {
  const points = examples[0].points;
  it("retains cubic polynomials, including nonuniform coordinates", () => {
    const x = [-4, -2, 0, 1, 3, 8],
      f = (v: number) => 2 + 3 * v - v * v + 0.1 * v ** 3;
    for (const s of [0, 5, 20]) {
      const spline = fitCubicSpline(x, x.map(f), s);
      for (const v of [-3, -1, 0.5, 2, 7])
        close(evaluateSpline(spline, v), f(v));
    }
  });
  it("drops incomplete rows and ignores extra columns", () => {
    expect(
      measurementsFromRows([
        ["x", "y"],
        [0, 0, 9],
        [1, 2],
        [null, 2],
        [2, null],
        [2, 3],
        [3, 0],
      ]),
    ).toEqual([
      { position: 0, thickness: 0 },
      { position: 1, thickness: 2 },
      { position: 2, thickness: 3 },
      { position: 3, thickness: 0 },
    ]);
  });
  it("rejects text instead of guessing numeric or date values", () =>
    expect(() =>
      measurementsFromRows([
        ["x", "y"],
        ["1", "2"],
      ]),
    ).toThrow("Zeile 2"));
  it("rejects insufficient, duplicated, unsorted, negative, nonfinite and zero profiles", () => {
    expect(validateMeasurements(points.slice(0, 3))).toBeTruthy();
    for (const bad of [
      [...points].reverse(),
      [{ ...points[0] }, ...points],
      points.map((p) => ({ ...p, thickness: -1 })),
      points.map((p) => ({ ...p, position: NaN })),
      points.map((p) => ({ ...p, thickness: 0 })),
    ])
      expect(validateMeasurements(bad)).toBeTruthy();
  });
  it("keeps 10% cosine edges", () => {
    close(raisedCosine(0, 0, 100), 0);
    close(raisedCosine(5, 0, 100), 0.5);
    close(raisedCosine(50, 0, 100), 1);
    close(raisedCosine(100, 0, 100), 0);
  });
  it("checks smoothing and track limits", () => {
    for (const s of [-1, 21, NaN])
      expect(() => buildSingleProfile(points, s)).toThrow();
    const p = buildSingleProfile(points, 0);
    for (const n of [0, 101, 1.5, NaN])
      expect(() => buildCoating(p, n, 1)).toThrow();
    for (const spacing of [0, 0.09, p.halfWidth! + 1, NaN])
      expect(() => buildCoating(p, 15, spacing)).toThrow();
    close(buildCoating(p, 15, p.halfWidth!).overlapPercent, 0);
    close(buildCoating(p, 15, p.halfWidth! / 3).overlapFactor, 3);
  });
  it("limits total raster size before allocating", () => {
    const p = buildSingleProfile(
      [
        { position: 0, thickness: 0 },
        { position: 15000, thickness: 10 },
        { position: 30000, thickness: 10 },
        { position: 49000, thickness: 0 },
      ],
      0,
    );
    expect(() => buildCoating(p, 100, p.halfWidth!)).toThrow("50.000");
  });
  it("reports unresolvable half-width without breaking single-profile results", () => {
    const p = buildSingleProfile(
      [
        { position: 0, thickness: 0 },
        { position: 0.5, thickness: 0 },
        { position: 1, thickness: 10 },
        { position: 2, thickness: 0 },
      ],
      0,
    );
    expect(p.halfWidth).toBeNull();
    expect(() => buildCoating(p, 1, 0.1)).toThrow("Halbhöhenbreite");
  });
});

import splineReferences from "./strahlbreite-spline-references.json";
import { readSheet } from "read-excel-file/node";
describe("Arbitrary uploaded profiles / FITPACK parity", () => {
  for (const [i, c] of splineReferences.entries())
    it(`spline ${i}: ${c.x.length} points, s=${c.smoothing}`, () => {
      const f = fitCubicSpline(c.x, c.y, c.smoothing);
      close(f.residual, c.residual);
      c.sampleX.forEach((x, j) => close(evaluateSpline(f, x), c.sampleY[j]));
    });
  for (const e of examples)
    it(`imports original Excel example ${e.name}`, async () => {
      const rows = await readSheet(`public/strahlbreite/${e.file}`, 1);
      const points = measurementsFromRows(rows);
      expect(points.length).toBe(e.points.length);
      points.forEach((p, i) => {
        close(p.position, e.points[i].position);
        close(p.thickness, e.points[i].thickness);
      });
    });
});
