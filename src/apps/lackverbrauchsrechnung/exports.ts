import {
  chartLayout,
  formatInput,
  chartTraces as traces,
} from "./presentation";
import { calculate, PERIODS, type Scenario, type Period } from "./logic";
import { download } from "../../lib/download";
export { download } from "../../lib/download";
export function exportFrames(entries: Scenario[]) {
  const summary: Record<string, unknown>[] = [],
    parameters: Record<string, unknown>[] = [],
    timeline: Record<string, unknown>[] = [];
  for (const s of entries) {
    const r = calculate(s.params);
    summary.push(
      ...r.periods.map((row) => ({
        Szenario: s.name,
        Rechenweg: s.params.method,
        ...row,
      })),
    );
    parameters.push({
      Szenario: s.name,
      ...s.params,
      ...Object.fromEntries(Object.entries(r).filter(([k]) => k !== "periods")),
    });
    for (const period of PERIODS) {
      const row = r.periods.find((v) => v.Zeitraum === period)!;
      for (let i = 0; i <= 100; i++) {
        const out: Record<string, unknown> = {
          Szenario: s.name,
          Zeitraum: period,
        };
        for (const k of [
          "Produktionszeit [h]",
          "Stückzahl (rechnerisch)",
          "Lackverbrauch [L]",
          "Lackverlust [L]",
          "Lackkosten [€]",
          "Verlustkosten [€]",
        ])
          out[k] = (Number(row[k]) * i) / 100;
        timeline.push(out);
      }
    }
  }
  return { summary, parameters, timeline };
}
export async function exportData(entries: Scenario[], format: "CSV" | "Excel") {
  const frames = exportFrames(entries);
  if (format === "CSV") {
    const keys = Object.keys(frames.summary[0]);
    const escape = (v: unknown) =>
      `"${String(typeof v === "number" ? formatInput(v).replace(".", ",") : (v ?? "")).replaceAll('"', '""')}"`;
    download(
      new Blob(
        [
          "\ufeff" +
            [
              keys.map(escape).join(";"),
              ...frames.summary.map((r) =>
                keys.map((k) => escape(r[k])).join(";"),
              ),
            ].join("\r\n"),
        ],
        { type: "text/csv;charset=utf-8" },
      ),
      "Lackverbrauch.csv",
    );
    return;
  }
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const units = {
    area: "m²/Stück",
    thickness: "µm",
    rho_fk: "kg/m³",
    epsilon: "Gew.-%",
    phi: "Vol.-%",
    rho_lk: "kg/L",
    mng: "%",
    price: "€/L",
    takt: "min/Stück",
    rate: "Stück/h",
    target: "Stück/Zeitraum",
    pause: "s",
    shifts: "Schichten/Tag",
    shift_hours: "h/Schicht",
    net_hours: "h/Schicht",
    days: "Tage/Woche",
    weeks: "Wochen/Jahr",
    mass_piece: "kg/Stück",
    litres_piece: "L/Stück",
    loss_piece: "L/Stück",
    ideal_piece: "L/Stück",
    cost_piece: "€/Stück",
    spray: "min/Stück",
    area_min: "m²/min",
    kg_h: "kg/h",
    litres_h: "L/h",
    litres_min: "L/min",
    spray_litres_min: "L/min",
    spray_kg_min: "kg/min",
  };
  const tables: Record<string, unknown>[][] = [
    frames.summary,
    frames.parameters,
    frames.timeline,
    Object.entries(units).map(([Parameter, Einheit]) => ({
      Parameter,
      Einheit,
    })),
  ];
  const names = ["Zeiträume", "Parameter", "Verläufe", "Einheiten"];
  const sheets = tables.map((rows, i) => {
    const keys = Object.keys(rows[0]);
    return {
      sheet: names[i],
      data: [
        keys,
        ...rows.map((row) =>
          keys.map((k) => {
            const value = row[k] as string | number | null;
            return typeof value === "number"
              ? {
                  value,
                  type: Number,
                  format:
                    value !== 0 && Math.abs(value) < 0.01 ? "0.##E+00" : "0.##",
                }
              : value;
          }),
        ),
      ],
      stickyRowsCount: 1,
    };
  });
  await writeXlsxFile(sheets).toFile("Lackverbrauch.xlsx");
}
export async function exportImage(
  entries: Scenario[],
  chart: string,
  period: Period,
  format: "png" | "svg",
) {
  const { default: Plotly } = await import("plotly.js-basic-dist-min");
  const div = document.createElement("div");
  document.body.append(div);
  const data = traces(entries, chart, period);
  const legendHeight = data.reduce(
    (height, trace) => height + trace.name.split("<br>").length * 22 + 10,
    0,
  );
  const height = Math.max(600, legendHeight + 180);
  try {
    await Plotly.newPlot(div, data, {
      width: 1100,
      height,
      title: { text: `${chart} · ${period}` },
      ...chartLayout(chart),
      // Export every legend entry without a scroll area in the static image.
      margin: { l: 100, r: 300, t: 80, b: 100 },
      legend: {
        orientation: "v",
        x: 1.02,
        xanchor: "left",
        y: 1,
        yanchor: "top",
        maxheight: height - 180,
      },
    });
    await Plotly.downloadImage(div, {
      format,
      filename: "Lackverbrauch",
      width: 1100,
      height,
    });
  } finally {
    Plotly.purge(div);
    div.remove();
  }
}
