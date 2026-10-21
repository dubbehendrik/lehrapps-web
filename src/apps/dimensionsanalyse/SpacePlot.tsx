import createPlotlyComponent from "react-plotly.js/factory";
// @ts-expect-error Plotly distributes this browser bundle without declarations.
import Plotly from "plotly.js-gl3d-dist-min";
import type { Data } from "plotly.js";
import type { Selected } from "./types";
import type { Fraction } from "./logic";
import { vectorPlotData } from "./plotData";
const Plot = createPlotlyComponent(Plotly);
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
  const data = vectorPlotData(qs, exps, dims, originVectors);
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
          legend: { orientation: "h", groupclick: "togglegroup" },
          uirevision: JSON.stringify(dims),
        }}
        config={{ responsive: true, displaylogo: false }}
        useResizeHandler
        style={{ width: "100%", height: 480 }}
      />
    </figure>
  );
}
