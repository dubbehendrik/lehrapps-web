import { download } from "../../lib/download";
import type { Curve } from "./types";
import { simulate } from "./logic";
import type { Data, Layout } from "plotly.js";
export function exportRows(curves: Curve[]) {
  return curves.flatMap((c) => {
    const common = {
      Kurve: c.name,
      Alpha_Herkunft: c.source,
      ...c.params,
      Fit_von_s: c.fit?.from ?? null,
      Fit_bis_s: c.fit?.to ?? null,
      RMSE_C: c.fit?.rmse ?? null,
      R2: c.fit?.rSquared ?? null,
    };
    return [
      ...simulate(c.params).map((v) => ({
        ...common,
        Typ: "Modell",
        Zeit_s: v.time,
        Temperatur_C: v.temperature,
        Residuum_C: null as number | null,
      })),
      ...c.measurements.map((v) => ({
        ...common,
        Typ: "Messung",
        Zeit_s: v.time,
        Temperatur_C: v.temperature,
        Residuum_C:
          c.fit?.residuals.find((r) => r.time === v.time)?.temperature ?? null,
      })),
    ];
  });
}
export async function exportData(curves: Curve[], excel: boolean) {
  const rows = exportRows(curves);
  if (!rows.length) return;
  const keys = Object.keys(rows[0]) as (keyof (typeof rows)[0])[];
  if (excel) {
    const { default: write } = await import("write-excel-file/browser");
    await write([
      {
        sheet: "Verläufe und Messdaten",
        data: [keys, ...rows.map((r) => keys.map((k) => r[k]))],
      },
      {
        sheet: "Einheiten",
        data: [
          ["Parameter", "Einheit"],
          ["alpha", "W/(m² K)"],
          ["cp", "J/(kg K)"],
          ["area", "m²"],
          ["mass", "kg"],
          ["referenceTime / endTime / step / Zeit_s", "s"],
          [
            "referenceTemperature / ambientTemperature / Temperatur_C / Residuum_C / RMSE_C",
            "°C",
          ],
        ],
      },
    ]).toFile("Temperaturverlaeufe.xlsx");
  } else {
    const esc = (v: unknown) =>
      `"${String(typeof v === "number" ? String(v).replace(".", ",") : (v ?? "")).replaceAll('"', '""')}"`;
    download(
      new Blob(
        [
          "\ufeff" +
            [
              keys.map(esc).join(";"),
              ...rows.map((r) => keys.map((k) => esc(r[k])).join(";")),
            ].join("\r\n"),
        ],
        { type: "text/csv;charset=utf-8" },
      ),
      "Temperaturverlaeufe.csv",
    );
  }
}
export async function exportImage(
  data: Data[],
  layout: Partial<Layout>,
  format: "png" | "svg",
) {
  const { default: Plotly } = await import("plotly.js-basic-dist-min");
  const div = document.createElement("div");
  document.body.append(div);
  try {
    await Plotly.newPlot(div, data, {
      ...layout,
      width: 1300,
      title: { text: "Temperaturverläufe" },
    });
    await Plotly.downloadImage(div, {
      format,
      filename: "Temperaturverlaeufe",
      width: 1300,
      height: layout.height ?? 600,
    });
  } finally {
    Plotly.purge(div);
    div.remove();
  }
}
