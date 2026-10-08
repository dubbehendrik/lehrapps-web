import { describe, it, expect } from "vitest";
import refs from "./lackverbrauch-references.json";
import {
  calculate,
  DEFAULTS,
  METHODS,
  PLANS,
  traces,
  CHARTS,
  type Parameters,
} from "../src/apps/lackverbrauchsrechnung/logic";
import { exportFrames } from "../src/apps/lackverbrauchsrechnung/exports";
describe("Python-Referenzfälle", () => {
  for (const [i, c] of refs.entries())
    it(`Referenz ${i}: ${c.params.method}, ${c.params.plan}, ${c.params.period}`, () => {
      const actual = calculate(c.params as Parameters);
      for (const [k, v] of Object.entries(c.result)) {
        if (k === "periods") continue;
        if (v === null) expect(actual[k as keyof typeof actual]).toBeNull();
        else
          expect(actual[k as keyof typeof actual]).toBeCloseTo(v as number, 7);
      }
      for (let j = 0; j < 4; j++)
        for (const [k, v] of Object.entries(c.result.periods[j])) {
          if (typeof v === "number")
            expect(actual.periods[j][k]).toBeCloseTo(v, 6);
          else expect(actual.periods[j][k]).toBe(v);
        }
    });
});
it("unabhängige Materialbilanz", () => {
  const r = calculate({
    ...DEFAULTS,
    plan: PLANS[1],
    rate: 120,
    shifts: 1,
    net_hours: 8,
    weeks: 40,
  });
  expect(r.mass_piece).toBeCloseTo(0.25);
  expect(r.litres_piece).toBeCloseTo(0.2);
  expect(r.periods[3]["Lackverbrauch [L]"]).toBeCloseTo(38400);
});
it("Pause beeinflusst nur Spritzstrom", () => {
  const a = calculate(DEFAULTS),
    b = calculate({ ...DEFAULTS, pause: 0 });
  expect(a.periods).toEqual(b.periods);
  expect(a.spray_litres_min).toBeGreaterThan(b.spray_litres_min);
});
it("inaktive Eingaben werden ignoriert", () => {
  expect(() =>
    calculate({ ...DEFAULTS, method: METHODS[2], epsilon: NaN, rho_fk: NaN }),
  ).not.toThrow();
});
for (const update of [
  { mng: 0 },
  { epsilon: 101 },
  { area: NaN },
  { pause: 70, takt: 1 },
  { net_hours: 9 },
  { shifts: 3, shift_hours: 9 },
  { days: 1.5 },
  { weeks: 53 },
  { price: -1 },
  { plan: PLANS[2], target: 1.5 },
  { area: 1e308, thickness: 1e308 },
])
  it(`weist ungültige Eingabe zurück ${JSON.stringify(update)}`, () =>
    expect(() => calculate({ ...DEFAULTS, ...update })).toThrow());
it("100% MNG und kostenloser Lack", () => {
  const r = calculate({ ...DEFAULTS, mng: 100, price: 0 });
  expect(r.loss_piece).toBe(0);
  expect(r.cost_piece).toBe(0);
});
it("Diagramme und Export enthalten gleiche Endwerte", () => {
  const s = { name: "Test", params: DEFAULTS, color: "#0072B2" };
  const lines = traces([s], CHARTS[0], "Jahr");
  expect(lines[0].y.at(-1)).toBeCloseTo(
    Number(calculate(DEFAULTS).periods[3]["Lackverbrauch [L]"]),
  );
  const f = exportFrames([s]);
  expect(f.summary).toHaveLength(4);
  expect(f.timeline).toHaveLength(404);
});
