import type { Layout } from "plotly.js";
import { CHARTS, traces, type Scenario, type Period } from "./logic";

/** Round only the representation; calculations and spreadsheet data retain precision. */
export function formatValue(value: unknown): string {
  if (typeof value !== "number") return String(value ?? "–");
  return value.toLocaleString("de-DE", {
    maximumFractionDigits: 2,
    ...(value !== 0 && Math.abs(value) < 0.01
      ? { notation: "scientific" as const }
      : {}),
  });
}

export function formatInput(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value !== 0 && Math.abs(value) < 0.01
    ? value.toExponential(2)
    : String(Number(value.toFixed(2)));
}

export function chartLayout(chart: string): Partial<Layout> {
  return {
    // Keep the legend above the plot. Bound its height so many/long scenario
    // names scroll instead of expanding into the axis title or the plot.
    margin: { l: 80, r: 25, t: 130, b: 80, autoexpand: true },
    separators: ",.",
    legend: {
      orientation: "h",
      x: 0,
      xanchor: "left",
      y: 1.05,
      yanchor: "bottom",
      maxheight: 100,
    },
    xaxis: {
      title: {
        text:
          chart === CHARTS[2]
            ? "Materialnutzungsgrad<br>MNG [%]"
            : "Verfügbare<br>Produktionszeit [h]",
        standoff: 20,
      },
      automargin: true,
      nticks: 5,
      tickformat: ".2~f",
      tickformatstops: [{ dtickrange: [null, 0.01], value: ".2~e" }],
      hoverformat: ".2~f",
    },
    yaxis: {
      title: {
        text:
          chart === CHARTS[1] ? "Kumulierte Lackkosten [€]" : "Lackmenge [L]",
        standoff: 15,
      },
      automargin: true,
      tickformat: ".2~f",
      tickformatstops: [{ dtickrange: [null, 0.01], value: ".2~e" }],
      hoverformat: ".2~f",
      rangemode: "tozero",
    },
  };
}

function wrapLegendName(name: string): string {
  // Plotly does not wrap legend text itself. Keep long user-supplied names
  // inside narrow charts and escape its supported HTML-like notation.
  const escaped = (text: string) =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  const lines: string[] = [];
  let line = "";
  for (const word of name
    .split(/\s+/u)
    .flatMap((word) => word.match(/.{1,22}/gu) ?? [])) {
    if (line && line.length + word.length + 1 > 22) {
      lines.push(line);
      line = "";
    }
    line += (line ? " " : "") + word;
  }
  if (line) lines.push(line);
  return lines.map(escaped).join("<br>");
}

export function chartTraces(
  entries: Scenario[],
  chart: string,
  period: Period,
) {
  return traces(entries, chart, period).map((trace) => ({
    ...trace,
    name: wrapLegendName(trace.name),
    customdata: trace.x.map((value, index) => [
      formatValue(value),
      formatValue(trace.y[index]),
    ]),
    hovertemplate:
      "%{customdata[0]}<br>%{customdata[1]}<extra>%{fullData.name}</extra>",
  }));
}
