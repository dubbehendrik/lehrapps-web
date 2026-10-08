import { describe, it, expect } from "vitest";
import refs from "./hx-references.json";
import {
  solve,
  processTarget,
  processPath,
  saturationPressure,
  diagramY,
  diagramTemperature,
  compatible,
  example,
  HEAT,
  COOL,
  ISENTHALP,
  FREE,
  type Key,
  type Process,
  type State,
} from "../src/apps/hx-diagramm/logic";
import { svgChart } from "../src/apps/hx-diagramm/diagram";
import { exportFrames } from "../src/apps/hx-diagramm/exports";
function compare(actual: State, expected: State) {
  for (const k of ["T", "x", "phi", "rho", "h", "dew"] as const) {
    if (expected[k] === null) expect(actual[k]).toBeNull();
    else expect(actual[k]).toBeCloseTo(expected[k]!, 7);
  }
}
describe("Python parity: all ten pairs, pressures, winter and chart boundaries", () => {
  for (const [i, r] of refs.states.entries())
    it(`reference ${i}: ${r.pair.join("/")} at ${r.p} hPa`, () => {
      if (r.error)
        expect(() =>
          solve(r.pair as [Key, Key], r.values as [number, number], r.p),
        ).toThrow();
      else
        compare(
          solve(r.pair as [Key, Key], r.values as [number, number], r.p),
          r.state as State,
        );
    });
});
describe("Python process paths including dew point and condensate", () => {
  for (const [i, r] of refs.processes.entries())
    it(`process ${i}: ${r.kind}`, () => {
      const end = processTarget(r.start, r.kind as Process, r.goal, r.p);
      compare(end, r.end);
      const result = processPath(r.start, end, r.kind as Process, r.p);
      expect(result.points).toHaveLength(r.path.length);
      result.points.forEach((s, i) => compare(s, r.path[i]));
      expect(result.water).toEqual(r.water);
    });
});
it("rejects supersaturation, duplicate variables, nonfinite inputs and undefined dry-air temperature", () => {
  for (const [pair, values] of [
    [
      ["T", "phi"],
      [20, 101],
    ],
    [
      ["T", "x"],
      [10, 20],
    ],
    [
      ["x", "phi"],
      [0, 0],
    ],
    [
      ["T", "T"],
      [20, 20],
    ],
    [
      ["T", "h"],
      [NaN, 30],
    ],
    [
      ["T", "phi"],
      [41, 30],
    ],
  ] as [[Key, Key], [number, number]][])
    expect(() => solve(pair, values)).toThrow();
  for (const p of [499, 1201, NaN])
    expect(() => solve(["T", "phi"], [20, 50], p)).toThrow();
});
it("rejects ice separation while allowing dry subzero cooling", () => {
  expect(() =>
    processTarget(solve(["T", "phi"], [20, 50]), COOL, -5, 950),
  ).toThrow(/Vereisung/);
  const dry = solve(["T", "phi"], [0, 10]);
  expect(processTarget(dry, COOL, -10, 950).x).toBe(dry.x);
});
it("preserves water convention and continuity", () => {
  expect(saturationPressure(-10)).toBeCloseTo(286.45, 0);
  expect(
    Math.abs(saturationPressure(-1e-7) - saturationPressure(1e-7)),
  ).toBeLessThan(0.0001);
});
it("rejects direction and incompatible endpoints", () => {
  const a = solve(["T", "phi"], [20, 50]),
    b = solve(["T", "phi"], [30, 60]);
  expect(() => processTarget(a, HEAT, 10, 950)).toThrow();
  expect(() => processTarget(a, COOL, 30, 950)).toThrow();
  expect(() => processTarget(a, ISENTHALP, 1, 950)).toThrow();
  expect(() => processPath(a, b, HEAT, 950)).toThrow(/Endpunkte/);
  expect(compatible(a, b, 950)).toEqual([FREE]);
});
it("pressure invalidates old process and explicit recalculation repairs it", () => {
  const rows = example("Sommer", 950);
  const a = solve(rows[0].pair, rows[0].values, 1013.25);
  expect(() => solve(rows[1].pair, rows[1].values, 1013.25)).toThrow(/Sättigung/);
  const b = processTarget(a, COOL, rows[1].values[0], 1013.25);
  const c = processTarget(b, HEAT, rows[2].values[0], 1013.25);
  expect(() => processPath(a, b, COOL, 1013.25)).not.toThrow();
  expect(() => processPath(b, c, HEAT, 1013.25)).not.toThrow();
});
it("projection roundtrip and valid SVG export", () => {
  for (const [t, x] of [
    [-15, 0],
    [20, 8],
    [40, 20],
  ])
    expect(diagramTemperature(diagramY(t, x), x)).toBeCloseTo(t, 12);
  const rows = example("Sommer", 950),
    states = rows.map((r) => solve(r.pair, r.values));
  const scene = svgChart(
    950,
    states,
    rows.map((r) => r.process),
  );
  expect(scene.messages).toEqual([]);
  expect(scene.svg).toContain("<polygon");
  expect(scene.svg).toContain("Punkt 3");
  expect(scene.svg).not.toMatch(/NaN|Infinity/);
});
it("Excel data preserves names as literal strings and includes model notes", () => {
  const rows = example("Winter", 950);
  rows[0].name = "=1+1";
  const data = exportFrames(
    rows,
    rows.map((r) => solve(r.pair, r.values)),
    950,
  );
  expect(data.points[0].Name).toBe("=1+1");
  expect(data.processes).toHaveLength(2);
  expect(data.notes.some((r) => r.Beschreibung.includes("Vereisung"))).toBe(
    true,
  );
});
