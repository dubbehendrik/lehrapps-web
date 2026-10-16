import { describe, it, expect } from "vitest";
import {
  HEAT,
  COOL,
  ISOTHERM,
  ISENTHALP,
  FREE,
  solve,
  state,
  processTarget,
  processTargetBy,
  processTargetKeys,
  processPath,
  processRow,
  storedProcessGoal,
  type Process,
  type State,
} from "../src/apps/hx-diagramm/logic";
function compare(a: State, b: State) {
  for (const key of ["T", "x", "phi", "h", "rho"] as const)
    expect(a[key]).toBeCloseTo(b[key], 7);
}
it("isothermal humidification to 60 % keeps temperature constant", () => {
  const start = solve(["T", "phi"], [20, 50]);
  const end = processTargetBy(start, ISOTHERM, "phi", 60, 950);
  expect(end.T).toBe(20);
  expect(end.phi).toBeCloseTo(60, 9);
  expect(end.x).toBeGreaterThan(start.x);
  expect(
    processPath(start, end, ISOTHERM, 950).points.every((p) => p.T === 20),
  ).toBe(true);
});
describe("every allowed endpoint variable recovers the same physical endpoint", () => {
  const cases: [Process, [number, number], number][] = [
    [HEAT, [20, 50], 30],
    [COOL, [30, 60], 10],
    [ISOTHERM, [20, 50], 9],
    [ISENTHALP, [30, 10], 6],
  ];
  for (const [kind, input, goal] of cases)
    for (const key of processTargetKeys(kind)) {
      if (kind === COOL && key === "phi") continue; // the 10 °C endpoint is on the saturated plateau
      it(`${kind} with ${key}`, () => {
        const a = solve(["T", "phi"], input),
          expected = processTarget(a, kind, goal, 950);
        const actual = processTargetBy(a, kind, key, expected[key], 950);
        compare(actual, expected);
        expect(() => processPath(a, actual, kind, 950)).not.toThrow();
        const r = processRow(actual, kind, key, expected[key], "Endpunkt");
        compare(solve(r.pair, r.values), actual);
        expect(storedProcessGoal(r, actual)).toEqual({
          key,
          value: expected[key],
        });
      });
    }
});
it("cooling to relative humidity below 100 % has a unique endpoint before dew", () => {
  const a = solve(["T", "phi"], [30, 60]),
    b = processTargetBy(a, COOL, "phi", 80, 950);
  expect(b.T).toBeLessThan(a.T);
  expect(b.T).toBeGreaterThan(a.dew!);
  expect(b.x).toBe(a.x);
  expect(b.phi).toBeCloseTo(80, 8);
  const stored = processRow(b, COOL, "phi", 80);
  expect(
    processPath(a, solve(stored.pair, stored.values), COOL, 950).water,
  ).toBe(0);
});
it("rejects saturation as a cooling stop when a whole path section satisfies it", () => {
  expect(() =>
    processTargetBy(solve(["T", "phi"], [30, 60]), COOL, "phi", 100, 950),
  ).toThrow(/nicht eindeutig/);
  expect(() =>
    processTargetBy(solve(["T", "phi"], [10, 100]), COOL, "phi", 100, 950),
  ).toThrow(/nicht eindeutig/);
});
it("permits the unique water-reference dew endpoint below zero, not ice separation", () => {
  const a = solve(["T", "phi"], [-5, 60]),
    b = processTargetBy(a, COOL, "phi", 100, 950);
  expect(b.T).toBeCloseTo(a.dew!, 7);
  expect(b.x).toBeCloseTo(a.x, 8);
  expect(() => processTargetBy(a, COOL, "h", b.h - 1, 950)).toThrow(
    /nicht erreichbar/,
  );
});
it("keeps cold dry cooling and enthalpy endpoints valid", () => {
  const a = solve(["T", "phi"], [0, 10]),
    b = processTarget(a, COOL, -10, 950);
  compare(processTargetBy(a, COOL, "h", b.h, 950), b);
});
it("rejects wrong process directions, unreachable goals and nonfinite inputs", () => {
  const a = solve(["T", "phi"], [20, 50]);
  for (const [kind, key, value] of [
    [HEAT, "phi", 80],
    [HEAT, "h", a.h - 1],
    [COOL, "phi", 20],
    [COOL, "h", a.h + 1],
    [ISENTHALP, "T", 30],
    [ISOTHERM, "phi", 101],
    [ISOTHERM, "phi", NaN],
  ] as const)
    expect(() => processTargetBy(a, kind, key, value, 950)).toThrow();
  expect(() => processTargetBy(a, HEAT, "x", a.x, 950)).toThrow(
    /keinen Endpunkt/,
  );
  expect(() => processTargetBy(a, ISENTHALP, "h", a.h, 950)).toThrow();
  expect(() => processTargetBy(a, FREE, "T", 20, 950)).toThrow();
});
it("dry-air relative humidity never specifies a temperature", () => {
  const dry = state(20, 0);
  for (const kind of [HEAT, COOL] as const)
    for (const value of [0, 50])
      expect(() => processTargetBy(dry, kind, "phi", value, 950)).toThrow(
        /eindeutigen/,
      );
});
it("preserves exact user target through pressure change and explicit recalculation", () => {
  const a = solve(["T", "phi"], [20, 30]),
    value = 60.123456789;
  const b = processTargetBy(a, ISOTHERM, "phi", value, 950),
    r = processRow(b, ISOTHERM, "phi", value);
  const nextA = solve(["T", "phi"], [25, 30], 1013.25),
    goal = storedProcessGoal(r, solve(r.pair, r.values, 1013.25));
  expect(goal).toEqual({ key: "phi", value });
  const nextB = processTargetBy(
    nextA,
    ISOTHERM,
    goal.key,
    goal.value!,
    1013.25,
  );
  expect(nextB.T).toBe(25);
  expect(nextB.phi).toBeCloseTo(value, 9);
});
it("handles legacy rows without target metadata", () => {
  const a = solve(["T", "phi"], [20, 50]);
  const r = processRow(a, HEAT, "T", 20);
  delete r.targetKey;
  expect(storedProcessGoal(r, null)).toEqual({ key: "T", value: 20 });
});
