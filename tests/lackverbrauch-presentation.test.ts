import { expect, it } from "vitest";
import {
  formatValue,
  formatInput,
  chartLayout,
  chartTraces,
} from "../src/apps/lackverbrauchsrechnung/presentation";
import { DEFAULTS } from "../src/apps/lackverbrauchsrechnung/logic";

it("limits displayed decimals while keeping the exact default takt", () => {
  expect(formatValue(1234.5678)).toBe("1.234,57");
  expect(formatValue(1.2)).toBe("1,2");
  expect(formatInput(DEFAULTS.takt)).toBe("1.17");
  expect(DEFAULTS.takt).toBe(7 / 6);
  expect(formatValue(null)).toBe("–");
});
it("keeps small nonzero values visible using at most two mantissa decimals", () => {
  expect(formatInput(0.000123456)).toBe("1.23e-4");
  expect(formatValue(0.000123456)).toBe("1,23E-4");
  expect(formatValue(-0.000123456)).toBe("-1,23E-4");
  expect(formatInput(0)).toBe("0");
});
it("anchors the bounded legend above the plot and away from the x-axis", () => {
  const layout = chartLayout("Kumulierter Lackverbrauch");
  expect(layout.legend).toMatchObject({ yanchor: "bottom", maxheight: 100 });
  expect(layout.legend!.y).toBeGreaterThan(1);
});

it("formats hover values without rounding the plotted data", () => {
  const trace = chartTraces(
    [{ name: "Test", params: { ...DEFAULTS, area: 0.0001 }, color: "#0072B2" }],
    "Kumulierter Lackverbrauch",
    "Tag",
  )[0];
  expect(trace.customdata[1][0]).toBe("0,14");
  expect(trace.customdata[1][1]).toMatch(/E-/);
  expect(trace.y[1]).toBeGreaterThan(0);
});
