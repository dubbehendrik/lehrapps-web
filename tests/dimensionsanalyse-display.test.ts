import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { quantities } from "../src/apps/dimensionsanalyse/data";
import { fraction, exact } from "../src/apps/dimensionsanalyse/logic";
import { readExponent } from "../src/apps/dimensionsanalyse/ExponentControl";
import { Matrix, MatrixEquation } from "../src/apps/dimensionsanalyse/Notation";
import {
  vectorPlotData,
  plotSymbol,
} from "../src/apps/dimensionsanalyse/plotData";
const qs = ["rho", "v", "L", "eta"].map((id, key) => ({
  ...quantities.find((q) => q.id === id)!,
  key,
  subscript: "",
  description: "",
}));
describe("Dimensionsanalyse: Darstellung und Eingabe", () => {
  it("erhält dezimale und gebrochene Exponenten exakt", () => {
    expect(exact(readExponent("-0,125"))).toBe("-1/8");
    expect(exact(readExponent("1/3"))).toBe("1/3");
    expect(exact(readExponent("0.55"))).toBe("11/20");
    expect(() => readExponent("1/0")).toThrow();
    expect(() => readExponent("101")).toThrow();
    expect(() => readExponent("201/2")).toThrow();
  });
  it("verwendet native Klammermatrizen und gesetzte Indizes", () => {
    const html = renderToStaticMarkup(
      createElement(Matrix, {
        matrix: [[fraction(1, 2), fraction(-1)]],
        columns: ["c_p", "L_1"],
      }),
    );
    expect(html).toContain("<mtable");
    expect(html).toContain("<mfrac");
    expect(html).toContain("<msub");
    expect(html).not.toContain("<table");
  });
  it("setzt Malpunkt, doppelte Matrixunterstreichung und Vektorpfeil in die Kontrolle", () => {
    const html = renderToStaticMarkup(
      createElement(MatrixEquation, {
        values: Array.from({ length: 7 }, () => fraction(0)),
      }),
    );
    expect(html).not.toContain("↔");
    expect(html.match(/<munder/g)).toHaveLength(2);
    expect(html).toContain("→");
    expect(html).toContain("·");
    expect(html).toContain("<mover");
  });
  it("gruppiert in 3D Pfeilschaft und Kegelspitze für die Legende", () => {
    const data = vectorPlotData(
      qs,
      qs.map(() => fraction(1)),
      [0, 1, 2],
      false,
    );
    const shaft = data[0] as any,
      head = data[1] as any;
    expect(shaft.type).toBe("scatter3d");
    expect(head.type).toBe("cone");
    expect(shaft.legendgroup).toBe(head.legendgroup);
    expect(head.showlegend).toBe(false);
  });
  it("bindet 2D-Pfeilspitzen an ihre Spur und unterstützt Ursprungspfeile", () => {
    const chain = vectorPlotData(
      qs,
      qs.map(() => fraction(1)),
      [0, 1],
      false,
    ) as any[];
    const origin = vectorPlotData(
      qs,
      qs.map(() => fraction(1)),
      [0, 1],
      true,
    ) as any[];
    expect(chain).toHaveLength(5);
    expect(chain[1].x[0]).toBe(1);
    expect(origin[1].x[0]).toBe(0);
    expect(origin[1].y[0]).toBe(0);
    expect(chain[0].marker.symbol).toEqual(["circle", "arrow"]);
    expect(chain[0].marker.angleref).toBe("previous");
  });
  it("setzt Plotly-Indizes ohne ungeschützte HTML-Eingaben", () => {
    expect(plotSymbol({ ...qs[0], symbol: "c_p", subscript: "2" })).toBe(
      "c<sub>p,2</sub>",
    );
    expect(plotSymbol({ ...qs[0], subscript: "<img>" })).toContain(
      "&lt;img&gt;",
    );
  });
});
