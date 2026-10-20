import createPlotlyComponent from "react-plotly.js/factory";
// @ts-expect-error Plotly distributes this browser bundle without declarations.
import Plotly from "plotly.js-gl3d-dist-min";
import type { Data } from "plotly.js";
import type { Selected } from "./types";
import { mul, numeric, type Fraction } from "./logic";
const Plot = createPlotlyComponent(Plotly);
const colors = [
  "#164a87",
  "#007053",
  "#a34c00",
  "#8a3882",
  "#a02727",
  "#346875",
];
export function SpacePlot({
  qs,
  exps,
  dims,
  names,
  originVectors,
}: {
  qs: Selected[];
  exps: Fraction[];
  dims: number[];
  names: string[];
  originVectors: boolean;
}) {
  let cursor = [0, 0, 0];
  const data: Data[] = [];
  qs.forEach((q, i) => {
    const vector = dims.map((j) => numeric(mul(q.dimensions[j], exps[i])));
    const start = originVectors ? [0, 0, 0] : [...cursor];
    const end = start.map((x, j) => x + vector[j]);
    cursor = cursor.map((x, j) => x + vector[j]);
    const color = colors[i % colors.length];
    data.push({
      type: "scatter3d",
      mode: "lines+markers+text",
      x: [start[0], end[0]],
      y: [start[1], end[1]],
      z: [start[2], end[2]],
      text: ["", q.symbol + (q.subscript ? " " + q.subscript : "")],
      textposition: "top center",
      name: q.symbol,
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
        showlegend: false,
        hoverinfo: "skip",
      } as Data);
  });
  data.push({
    type: "scatter3d",
    mode: "lines+markers",
    x: [0, cursor[0]],
    y: [0, cursor[1]],
    z: [0, cursor[2]],
    name: "Resultierende",
    line: { color: "#111", dash: "dash", width: 5 },
  });
  return (
    <figure aria-label="Dreidimensionaler Dimensionsraum">
      <figcaption>
        <h3>Dimensionsraum · 3D</h3>
        <p>
          Mit der Maus drehen, mit dem Mausrad zoomen. Alle Koordinaten sind
          Exponenten, keine physikalischen Messwerte.
        </p>
      </figcaption>
      <Plot
        data={data}
        layout={{
          autosize: true,
          height: 480,
          margin: { l: 0, r: 0, b: 0, t: 15 },
          scene: {
            xaxis: { title: { text: `Exponent ${names[dims[0]]}` } },
            yaxis: { title: { text: `Exponent ${names[dims[1]]}` } },
            zaxis: { title: { text: `Exponent ${names[dims[2]]}` } },
            aspectmode: "data",
          },
          legend: { orientation: "h" },
          uirevision: JSON.stringify(dims),
        }}
        config={{ responsive: true, displaylogo: false }}
        useResizeHandler
        style={{ width: "100%", height: 480 }}
      />
    </figure>
  );
}
