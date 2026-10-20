import { Chart } from "../../components/Chart";
import type { Selected } from "./types";
import type { Fraction } from "./logic";
import { vectorPlotData } from "./plotData";
export function Vector2D({
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
  return (
    <Chart
      title={
        originVectors
          ? "Dimensionsprojektion · 2D"
          : "Vektorzug im Dimensionsraum"
      }
      description={
        originVectors
          ? "Alle skalierten Dimensionsvektoren beginnen am Ursprung. Die gestrichelte Resultierende zeigt ihre Summe."
          : "Pfeile Spitze an Schaft; die gestrichelte Linie zeigt die Resultierende. Alle Koordinaten sind dimensionslose Exponenten."
      }
      data={vectorPlotData(qs, exps, dims, originVectors)}
      layout={{
        xaxis: {
          title: { text: `Exponent ${names[dims[0]] ?? "(Rang 0)"}` },
          zeroline: true,
        },
        yaxis: {
          title: {
            text: `Exponent ${names[dims[1]] ?? "(keine zweite Dimension)"}`,
          },
          scaleanchor: "x",
        },
        legend: { orientation: "h", groupclick: "togglegroup" },
        margin: { l: 65, r: 20, t: 30, b: 95 },
        showlegend: true,
        uirevision: JSON.stringify([dims, originVectors]),
      }}
    />
  );
}
