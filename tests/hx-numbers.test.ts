import { describe, expect, it } from "vitest";
import {
  formatNumber,
  parseNumber,
  editableNumber,
  excelNumberFormat,
} from "../src/apps/hx-diagramm/numbers";
import { svgChart } from "../src/apps/hx-diagramm/diagram";
import { solve, FREE } from "../src/apps/hx-diagramm/logic";
describe("Mollier German number display", () => {
  it.each([
    [1234.567, "1.234,57"],
    [1.125, "1,13"],
    [0, "0"],
    [-0, "0"],
    [0.005, "0,01"],
    [-1234.567, "-1.234,57"],
    [99999, "99.999"],
    [100000, "1 · 10⁵"],
    [-100000, "-1 · 10⁵"],
    [123456, "1,23 · 10⁵"],
    [0.0001234, "1,23 · 10⁻⁴"],
    [-0.000001234, "-1,23 · 10⁻⁶"],
    [Infinity, "—"],
    [NaN, "—"],
  ] as const)("formats %s as %s", (n, text) =>
    expect(formatNumber(n)).toBe(text),
  );
  it.each([
    ["1.234,56", 1234.56],
    ["1,23456", 1.23456],
    ["0,0001", 0.0001],
    ["1,23e-4", 0.000123],
    ["1.234", 1234],
    ["-10,25", -10.25],
    ["1e5", 100000],
  ])("parses %s without guessing decimal periods", (text, n) =>
    expect(parseNumber(text)).toBe(n),
  );
  it.each(["", "-", "1,2,3", "1.23", "1.2345", "1e", "Infinity", "1e999"])(
    "rejects invalid input %s",
    (text) => expect(parseNumber(text)).toBeNaN(),
  );
  it("keeps exact calculation values through focus/blur representations", () => {
    const n = 1.12345678901234;
    expect(formatNumber(n)).toBe("1,12");
    expect(parseNumber(editableNumber(n))).toBe(n);
  });
  it("uses numeric Excel formats with matching scientific boundaries", () => {
    expect(excelNumberFormat(99999)).toContain("#,##0.##");
    expect(excelNumberFormat(100000)).toContain("E+00");
    expect(excelNumberFormat(0.0001)).toContain("E+00");
  });
});
it("exports empty diagrams and validates pressure even without states", () => {
  const { svg, messages } = svgChart(1013.25, [], []);
  expect(messages).toEqual([]);
  expect(svg).toContain("p = 1.013,25 hPa");
  expect(svg).toContain("ρ = 1,");
  expect(svg).not.toContain("Punkt 1");
  expect(() => svgChart(NaN, [], [])).toThrow();
  expect(() => svgChart(499, [], [])).toThrow();
});
it("localizes visible SVG tooltips without corrupting SVG coordinates", () => {
  const s = solve(["T", "phi"], [20, 50]);
  const { svg } = svgChart(950, [s], [FREE]);
  const tooltip = svg.match(/<title>(.*?)<\/title>/)?.[1];
  expect(tooltip).toContain(`ρ = ${formatNumber(s.rho)}`);
  expect(tooltip).toContain(`x = ${formatNumber(s.x)}`);
  expect(tooltip).not.toMatch(/\d\.\d/);
  expect(svg).toMatch(/points="\d+\.\d+,/);
});
