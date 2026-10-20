import type { Data } from "plotly.js";
import type { Selected } from "./types";
import { mul, numeric, type Fraction } from "./logic";
const colors = [
  "#164a87",
  "#007053",
  "#a34c00",
  "#8a3882",
  "#a02727",
  "#346875",
];
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function plotSymbol(q: Selected) {
  const [base, ...indices] = q.symbol.split("_");
  const sub = [...indices, q.subscript].filter(Boolean);
  return (
    escape(base) + (sub.length ? `<sub>${escape(sub.join(","))}</sub>` : "")
  );
}
export function vectorPlotData(
  qs: Selected[],
  exps: Fraction[],
  dims: number[],
  originVectors: boolean,
): Data[] {
  let cursor = Array.from({ length: dims.length }, () => 0);
  const data: Data[] = [];
  const is3D = dims.length === 3;
  qs.forEach((q, i) => {
    const vector = dims.map((j) => numeric(mul(q.dimensions[j], exps[i])));
    const start = originVectors ? vector.map(() => 0) : [...cursor];
    const end = start.map((x, j) => x + vector[j]);
    cursor = cursor.map((x, j) => x + vector[j]);
    const color = colors[i % colors.length];
    const name = plotSymbol(q);
    const legendgroup = `quantity-${q.key}`;
    if (is3D) {
      data.push({
        type: "scatter3d",
        mode: "lines+markers+text",
        x: [start[0], end[0]],
        y: [start[1], end[1]],
        z: [start[2], end[2]],
        text: ["", name],
        textposition: "top center",
        name,
        legendgroup,
        line: { color, width: 6 },
        marker: { size: 3, color },
      });
      if (vector.some((x) => x))
        data.push({
          type: "cone",
          x: [end[0]],
          y: [end[1]],
          z: [end[2]],
          u: [vector[0]],
          v: [vector[1]],
          w: [vector[2]],
          anchor: "tip",
          sizemode: "absolute",
          sizeref: 0.3,
          showscale: false,
          colorscale: [
            [0, color],
            [1, color],
          ],
          legendgroup,
          showlegend: false,
          hoverinfo: "skip",
        } as Data);
    } else {
      data.push({
        type: "scatter",
        mode: "lines+markers+text",
        x: [start[0] ?? 0, end[0] ?? 0],
        y: [start[1] ?? 0, end[1] ?? 0],
        name,
        legendgroup,
        text: ["", name],
        textposition: "top center",
        line: { color, width: 2 },
        marker: {
          color,
          symbol: ["circle", "arrow"],
          size: [0, vector.some((x) => x) ? 13 : 0],
          angleref: "previous",
        },
      } as Data);
    }
  });
  data.push(
    is3D
      ? {
          type: "scatter3d",
          mode: "lines+markers",
          x: [0, cursor[0]],
          y: [0, cursor[1]],
          z: [0, cursor[2]],
          name: "Resultierende",
          line: { color: "#111", dash: "dash", width: 5 },
        }
      : ({
          type: "scatter",
          mode: "lines+markers",
          x: [0, cursor[0] ?? 0],
          y: [0, cursor[1] ?? 0],
          name: "Resultierende",
          line: { color: "#111", dash: "dash", width: 3 },
          marker: {
            color: "#111",
            symbol: ["circle", "arrow"],
            size: [0, cursor.some((x) => x) ? 13 : 0],
            angleref: "previous",
          },
        } as Data),
  );
  return data;
}
