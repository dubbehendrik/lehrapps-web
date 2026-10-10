import { expect, it } from "vitest";
import examples from "../src/apps/strahlbreite/examples.json";
import { buildCoating, buildSingleProfile, evaluateInterior, measurementsFromRows, referenceSpeedFromRows, speedFactor } from "../src/apps/strahlbreite/logic";

it("reads speed without changing legacy measurements", () => {
  const rows = [["Ort", "Dicke", null, "Bahngeschwindigkeit [mm/s]", 250], ...examples[0].points.map((p) => [p.position, p.thickness])];
  expect(referenceSpeedFromRows(rows)).toBe(250);
  expect(measurementsFromRows(rows)).toEqual(examples[0].points);
  expect(referenceSpeedFromRows([["Ort", "Dicke"]])).toBeNull();
  expect(referenceSpeedFromRows([[null, null, null, "Bahngeschwindigkeit [mm/s]", null]])).toBeNull();
  for (const value of [0, -1, Infinity, "250", 801]) expect(() => referenceSpeedFromRows([[null, null, null, "Bahngeschwindigkeit [mm/s]", value]])).toThrow();
});
it("halves mean and extrema at double speed, preserving relative waviness", () => {
  const profile = buildSingleProfile(examples[1].points, 0);
  const total = buildCoating(profile, 15, profile.halfWidth! / 2);
  const original = evaluateInterior(total, profile, 15, profile.halfWidth! / 2)!;
  const factor = speedFactor(250, 500);
  const scaled = evaluateInterior({ ...total, y: total.y.map((v) => v * factor) }, profile, 15, profile.halfWidth! / 2)!;
  expect(scaled.mean).toBeCloseTo(original.mean / 2, 10);
  expect(scaled.minimum).toBeCloseTo(original.minimum / 2, 10);
  expect(scaled.maximum).toBeCloseTo(original.maximum / 2, 10);
  expect(scaled.waviness).toBeCloseTo(original.waviness!, 10);
  expect(speedFactor(250, 250)).toBe(1);
  expect(speedFactor(300, 800)).toBe(0.375);
  expect(speedFactor(300, 0.01)).toBe(30000);
  for (const speed of [0, -1, NaN, Infinity, 800.01]) expect(() => speedFactor(250, speed)).toThrow();
  expect(evaluateInterior(buildCoating(profile, 1, 76), profile, 1, 76)).toBeNull();
});
it("assigns 300 mm/s to each teaching example", () => {
  for (const example of examples) expect(example.referenceSpeed).toBe(300);
});
it("integrates a constant interior at fractional bounds without bias", () => {
  const profile = buildSingleProfile(examples[0].points, 0);
  const total = buildCoating(profile, 15, 117.3);
  const result = evaluateInterior({ ...total, y: total.y.map(() => 7) }, profile, 15, 117.3)!;
  expect(result.mean).toBeCloseTo(7, 12);
  expect(result.waviness).toBe(0);
  expect(result.end - result.start).toBeGreaterThanOrEqual(117.3);
});
