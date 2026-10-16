import type { jsPDF } from "jspdf";
import type { exportFrames } from "./exports";
import { formatNumber } from "./numbers";
type Frames = ReturnType<typeof exportFrames>;
type Value = string | number | null;
export interface ReportTable {
  title: string;
  headers: string[];
  widths: number[];
  rows: Value[][];
}
/** Every Excel field is included once, splitting the wide state sheet for A4. */
export function reportTables(f: Frames): ReportTable[] {
  return [
    {
      title: "Zustände",
      headers: [
        "Nr.",
        "Name",
        "T [°C]",
        "x [g/kg tr. Luft]",
        "φ [%]",
        "ρ [kg/m³]",
        "h [kJ/kg tr. Luft]",
        "Taupunkt Wasser [°C]",
      ],
      widths: [12, 36, 19, 25, 18, 24, 27, 29],
      rows: f.points.map((r) => [
        r.Punkt,
        r.Name,
        r["T [°C]"],
        r["x [g/kg trockene Luft]"],
        r["φ [% Wasserbezug]"],
        r["ρ [kg/m³ feuchte Luft]"],
        r["h [kJ/kg trockene Luft]"],
        r["Taupunkt Wasser [°C]"],
      ]),
    },
    {
      title: "Vorgaben und Prüfung",
      headers: [
        "Nr.",
        "Größe 1",
        "Wert 1",
        "Größe 2",
        "Wert 2",
        "Druck [hPa]",
        "Status",
      ],
      widths: [12, 24, 32, 24, 32, 32, 34],
      rows: f.points.map((r) => [
        r.Punkt,
        r["Vorgabe 1"],
        r["Wert 1"],
        r["Vorgabe 2"],
        r["Wert 2"],
        r["Druck [hPa]"],
        r.Status,
      ]),
    },
    {
      title: "Prozesse",
      headers: [
        "Von → Nach",
        "Prozess",
        "ΔT [K]",
        "Δx [g/kg tr. Luft]",
        "Δh Luft [kJ/kg tr. Luft]",
        "Wasser abgeschieden [g/kg tr. Luft]",
        "Status",
      ],
      widths: [20, 44, 20, 25, 27, 29, 25],
      rows: f.processes.map((r) => [
        `${r.Von} → ${r.Nach}`,
        r.Prozess,
        r["ΔT [K]"],
        r["Δx [g/kg trockene Luft]"],
        r["Δh Luft [kJ/kg trockene Luft]"],
        r["Abgeschiedenes Wasser [g/kg trockene Luft]"],
        r.Status,
      ]),
    },
    {
      title: "Modell und Hinweise",
      headers: ["Thema", "Beschreibung"],
      widths: [38, 152],
      rows: f.notes.map((r) => [r.Thema, r.Beschreibung]),
    },
  ];
}
/** Wrapped rows and repeated headers; no truncation for long names or many points. */
export function appendPdfTables(doc: jsPDF, frames: Frames) {
  if (!frames.points.length) return;
  const left = 10,
    bottom = 282,
    lineHeight = 3.6,
    padding = 1.5;
  let y = 0;
  function page() {
    doc.addPage("a4", "portrait");
    doc.setFont("HxSans", "bold");
    doc.setFontSize(13);
    doc.setTextColor("#17343c");
    doc.text("Mollier h,x - Zustände und Prozesse", left, 15);
    doc.setFont("HxSans", "normal");
    doc.setFontSize(8);
    doc.text(
      "x und h: je kg trockener Luft · ρ: feuchte Luft · Feuchtebezug: Wasser",
      left,
      21,
    );
    y = 27;
  }
  page();
  for (const table of reportTables(frames)) {
    function wrapped(cells: Value[]) {
      return cells.map(
        (v, i) =>
          doc.splitTextToSize(
            typeof v === "number" ? formatNumber(v) : v === null ? "-" : v,
            table.widths[i] - 2 * padding,
          ) as string[],
      );
    }
    function paint(lines: string[][], count: number, header = false) {
      const h = count * lineHeight + 2 * padding;
      let x = left;
      doc.setDrawColor("#cad5dd");
      doc.setLineWidth(0.15);
      for (let i = 0; i < lines.length; i++) {
        doc.setFillColor(header ? "#e8f0f7" : "#ffffff");
        doc.rect(x, y, table.widths[i], h, "FD");
        doc.text(lines[i].slice(0, count), x + padding, y + padding + 2.8);
        x += table.widths[i];
      }
      y += h;
    }
    function heading(continuation = false) {
      doc.setFont("HxSans", "bold");
      doc.setFontSize(10);
      doc.text(
        table.title + (continuation ? " (Fortsetzung)" : ""),
        left,
        y + 4,
      );
      y += 7;
      doc.setFontSize(8);
      const lines = wrapped(table.headers);
      paint(lines, Math.max(...lines.map((l) => l.length)), true);
      doc.setFont("HxSans", "normal");
    }
    if (y + 40 > bottom) page();
    heading();
    if (!table.rows.length) {
      doc.setFontSize(8);
      doc.text("Keine Übergänge vorhanden.", left, y + 5);
      y += 9;
    }
    for (const cells of table.rows) {
      doc.setFontSize(8);
      let lines = wrapped(cells);
      let remaining = Math.max(...lines.map((l) => l.length));
      if (
        remaining * lineHeight + 2 * padding <= bottom - 38 &&
        y + remaining * lineHeight + 2 * padding > bottom
      ) {
        page();
        heading(true);
      }
      while (remaining > 0) {
        const fit = Math.floor((bottom - y - 2 * padding) / lineHeight);
        if (fit < 1) {
          page();
          heading(true);
          continue;
        }
        const count = Math.min(fit, remaining);
        paint(lines, count);
        lines = lines.map((l) => l.slice(count));
        remaining -= count;
        if (remaining > 0) {
          page();
          heading(true);
        }
      }
    }
    y += 5;
  }
  const total = doc.getNumberOfPages();
  for (let pageNumber = 2; pageNumber <= total; pageNumber++) {
    doc.setPage(pageNumber);
    doc.setFont("HxSans", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#526970");
    doc.text(`Seite ${pageNumber} / ${total}`, 200, 290, { align: "right" });
  }
}
