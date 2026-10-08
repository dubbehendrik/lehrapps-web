import type { Data, Layout } from "plotly.js";
import { simulate } from "./logic";
import type { Curve, Measurement, Parameters } from "./types";
const fmt = (n: number) => Number(n.toPrecision(6)).toLocaleString("de-DE");
export function parameterText(c: Curve) {
  const p = c.params;
  return `${c.name}<br>α = ${fmt(p.alpha)} W/(m² K)<br>${c.source}<br>A = ${fmt(p.area)} m² · m = ${fmt(p.mass)} kg<br>cₚ = ${fmt(p.cp)} J/(kg K)<br>t<sub>ref</sub> = ${fmt(p.referenceTime)} s · T<sub>ref</sub> = ${fmt(p.referenceTemperature)} °C<br>T∞ = ${fmt(p.ambientTemperature)} °C<br>Endzeit = ${fmt(p.endTime)} s · Δt = ${fmt(p.step)} s${c.fit ? `<br>Fit: ${c.fit.from}–${c.fit.to} s · n = ${c.fit.count}<br>RMSE = ${fmt(c.fit.rmse)} °C · R² = ${c.fit.rSquared === null ? "nicht definiert" : fmt(c.fit.rSquared)}` : ""}`;
}
const esc = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
export function buildPlot(
  curves: Curve[],
  points: Measurement[],
  source: string,
  preview: Parameters | null,
  factor: number,
  interval: [number, number] | null,
  height: number,
  ranges?: number[][],
  compact = false,
) {
  const data: Data[] = [];
  const addPoints = (p: Measurement[], name: string, color: string) =>
    data.push({
      x: p.map((v) => v.time / factor),
      y: p.map((v) => v.temperature),
      mode: "markers",
      type: "scatter",
      name: esc(name),
      marker: { color, size: 5, symbol: "circle-open" },
    });
  if (points.length) addPoints(points, source || "Messung", "#333333");
  curves.forEach((c, i) => {
    const values = simulate(c.params);
    data.push({
      x: values.map((v) => v.time / factor),
      y: values.map((v) => v.temperature),
      type: "scatter",
      mode: "lines",
      name: esc(c.name),
      line: {
        color: c.color,
        width: 3,
        dash: (["solid", "dash", "dot", "dashdot"] as const)[i % 4],
      },
    });
    if (
      c.measurements.length &&
      JSON.stringify(c.measurements) !== JSON.stringify(points)
    )
      addPoints(c.measurements, `${c.name}: ${c.source}`, c.color);
  });
  if (preview) {
    const values = simulate(preview);
    data.push({
      x: values.map((v) => v.time / factor),
      y: values.map((v) => v.temperature),
      mode: "lines",
      type: "scatter",
      name: "Vorschau",
      line: { color: "#777777", dash: "dash", width: 2 },
    });
  }
  const actualHeight = compact
    ? height + curves.length * 210
    : Math.max(height, curves.length * 210 + 150);
  const layout: Partial<Layout> = {
    height: actualHeight,
    margin: { l: 65, r: 20, t: 30, b: compact ? 80 + curves.length * 210 : 80 },
    font: { size: 15 },
    xaxis: {
      title: { text: `Zeit [${factor === 60 ? "min" : "s"}]` },
      domain: curves.length && !compact ? [0, 0.58] : [0, 1],
      ...(ranges ? { range: ranges[0] as [number, number] } : {}),
    },
    yaxis: {
      title: { text: "Temperatur [°C]" },
      ...(ranges ? { range: ranges[1] as [number, number] } : {}),
    },
    legend: { orientation: "h", y: -0.15 },
    annotations: curves.map((c, i) => ({
      xref: "paper",
      yref: "paper",
      x: compact ? 0.02 : 0.62,
      y: compact
        ? -0.22 - (i * 210) / (height - 110)
        : 1 - (i * 210) / (actualHeight - 110),
      xanchor: "left",
      yanchor: "top",
      text: parameterText({ ...c, name: esc(c.name), source: esc(c.source) }),
      showarrow: false,
      align: "left",
      font: { size: 12, color: c.color },
      bordercolor: c.color,
      borderwidth: 1,
      borderpad: 7,
      bgcolor: "#fff",
    })),
    shapes: interval
      ? [
          {
            type: "rect",
            xref: "x",
            yref: "paper",
            x0: interval[0] / factor,
            x1: interval[1] / factor,
            y0: 0,
            y1: 1,
            fillcolor: "#164a87",
            opacity: 0.12,
            line: { width: 1 },
            layer: "below",
          },
        ]
      : [],
    uirevision: JSON.stringify([factor, ranges]),
  };
  return { data, layout };
}
