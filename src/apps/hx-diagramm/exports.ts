import { svgChart } from "./diagram";
import { appendPdfTables } from "./pdfTables";
import { excelNumberFormat, formatNumber } from "./numbers";
import { download } from "../../lib/download";
import { processPath, FREE, type PointRow, type State } from "./logic";
export const WINTER_NOTE =
  "Die relative Feuchte bezieht sich immer auf flüssiges Wasser, unter 0 °C auf unterkühltes Wasser. Reif, Eis und die Vereisung eines Kühlers werden nicht berechnet. Kalte Außenluft kann eingegeben und erwärmt werden. Prozesse mit Wasserabscheidung unter 0 °C sind ausgeschlossen. Bei Mess- oder Wetterdaten muss geprüft werden, ob deren Feuchteangabe ebenfalls auf Wasser bezogen ist.";
export function exportFrames(rows: PointRow[], states: State[], p: number) {
  const points = rows.map((r, i) => {
    const s = states[i];
    return {
      Punkt: i + 1,
      Name: r.name,
      "Vorgabe 1": r.pair[0],
      "Wert 1": r.values[0],
      "Vorgabe 2": r.pair[1],
      "Wert 2": r.values[1],
      "Druck [hPa]": p,
      "T [°C]": s.T,
      "x [g/kg trockene Luft]": s.x,
      "φ [% Wasserbezug]": s.phi,
      "ρ [kg/m³ feuchte Luft]": s.rho,
      "h [kJ/kg trockene Luft]": s.h,
      "Taupunkt Wasser [°C]": s.dew,
      Status: "Gültig",
    };
  });
  const processes = rows.slice(1).map((r, i) => {
    const a = states[i],
      b = states[i + 1],
      { water } = processPath(a, b, r.process, p);
    return {
      Von: i + 1,
      Nach: i + 2,
      Prozess: r.process,
      "ΔT [K]": b.T - a.T,
      "Δx [g/kg trockene Luft]": b.x - a.x,
      "Δh Luft [kJ/kg trockene Luft]": b.h - a.h,
      "Abgeschiedenes Wasser [g/kg trockene Luft]": water,
      Status: r.process === FREE ? "Nur geometrische Verbindung" : "Gültig",
    };
  });
  const notes = [
    ["Winterkonvention", WINTER_NOTE],
    [
      "Einheiten",
      "x und h beziehen sich auf 1 kg trockene Luft; ρ auf die gesamte feuchte Luft pro m³.",
    ],
    ["Druck [hPa]", formatNumber(p)],
    [
      "Diagramm",
      "Fest: −15 bis 40 °C; 0 bis 20 g/kg trockene Luft. Linke Temperaturskala gilt bei x = 0; geneigte Isothermen beachten.",
    ],
    [
      "Kühlmodell",
      "x konstant bis Taupunkt, danach gesättigte Luft mit kontinuierlicher Kondensatabscheidung. Kein reales Kühler-/Bypassmodell.",
    ],
    [
      "Prozessgrenzen",
      "Isotherme Be-/Entfeuchtung benötigt Wärmeausgleich. Isenthalpe Befeuchtung ist eine Näherung; keine Mischprozesse.",
    ],
    [
      "Energie",
      "Δh ist die Enthalpieänderung der Luft. Kondensatenthalpie und Verluste sind nicht bilanziert.",
    ],
    [
      "Stoffwerte",
      "Ideales Gasgemisch, ASHRAE 2017/PsychroLib. Unter 0 °C Murphy & Koop 2005, Gl. 10, stetig an ASHRAE bei 0 °C angeschlossen.",
    ],
    [
      "Quelle ASHRAE/PsychroLib",
      "https://psychrometrics.github.io/psychrolib/api_docs.html",
    ],
    ["Quelle Murphy & Koop", "https://doi.org/10.1256/qj.04.94"],
  ].map(([Thema, Beschreibung]) => ({ Thema, Beschreibung }));
  return { points, processes, notes };
}
export async function createExcel(
  rows: PointRow[],
  states: State[],
  p: number,
) {
  const f = exportFrames(rows, states, p),
    tables: Record<string, string | number | null>[][] = [
      f.points,
      f.processes,
      f.notes,
    ],
    names = ["Zustände", "Prozesse", "Modell und Hinweise"];
  const { default: write } = await import("write-excel-file/browser");
  const sheets = tables.map((table, i) => {
    const keys = table.length
      ? Object.keys(table[0])
      : ["Von", "Nach", "Prozess", "Status"];
    return {
      sheet: names[i],
      stickyRowsCount: 1,
      data: [
        keys,
        ...table.map((r) =>
          keys.map((k) => {
            const value = r[k] ?? null;
            return typeof value === "number"
              ? { value, type: Number, format: excelNumberFormat(value) }
              : value;
          }),
        ),
      ],
    };
  });
  const svg = svgChart(
    p,
    states,
    rows.map((r) => r.process),
  ).svg;
  const png = await diagramPng(svg);
  return write([
    ...sheets,
    {
      sheet: "Diagramm",
      data: [
        ["Mollier h,x-Diagramm"],
        [
          `p = ${formatNumber(p)} hPa · Zustände und Übergänge wie in den Tabellen`,
        ],
      ],
      images: [
        {
          content: png,
          contentType: "image/png",
          width: 800,
          height: 920,
          dpi: 96,
          anchor: { row: 4, column: 1 },
          title: "Mollier h,x-Diagramm",
          description:
            "Diagramm mit allen übernommenen Zustandspunkten und Prozessübergängen",
        },
      ],
    },
  ]).toBlob();
}
export async function exportExcel(
  rows: PointRow[],
  states: State[],
  p: number,
) {
  download(await createExcel(rows, states, p), "Mollier-h-x.xlsx");
}
export async function exportImage(svg: string, format: "svg" | "png") {
  download(
    format === "svg"
      ? new Blob([svg], { type: "image/svg+xml" })
      : await diagramPng(svg),
    `Mollier-h-x.${format}`,
  );
}
export async function diagramPng(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1840;
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw Error("Bildexport wird von diesem Browser nicht unterstützt.");
    ctx.drawImage(img, 0, 0, 1600, 1840);
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(Error("PNG konnte nicht erstellt werden.")),
        "image/png",
      ),
    );
    return png;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Browser-only vector PDF, same trusted SVG scene as screen/PNG/SVG. */
export async function createPdf(
  svg: string,
  rows: PointRow[] = [],
  states: State[] = [],
  p = 950,
): Promise<Blob> {
  const [{ jsPDF }, , regularUrl, boldUrl] = await Promise.all([
    import("jspdf"),
    import("svg2pdf.js"),
    import("../../assets/fonts/HxSans.ttf?url"),
    import("../../assets/fonts/HxSans-Bold.ttf?url"),
  ]);
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });
  for (const [style, url] of [
    ["normal", regularUrl.default],
    ["bold", boldUrl.default],
  ] as const) {
    const response = await fetch(url);
    if (!response.ok)
      throw Error("Die PDF-Schrift konnte nicht geladen werden.");
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    const filename = `HxSans-${style}.ttf`;
    doc.addFileToVFS(filename, btoa(binary));
    doc.addFont(filename, "HxSans", style);
    // SVG text measurement must use the very same font as PDF output.
    const face = new FontFace("HxSans", buffer, {
      weight: style === "bold" ? "700" : "400",
    });
    await face.load();
    document.fonts.add(face);
  }
  const element = new DOMParser().parseFromString(
    svg,
    "image/svg+xml",
  ).documentElement;
  if (element.tagName !== "svg" || element.querySelector("parsererror"))
    throw Error("Das Diagramm konnte nicht als PDF gelesen werden.");
  element
    .querySelectorAll("[font-family]")
    .forEach((node) => node.setAttribute("font-family", "HxSans"));
  // svg2pdf does not implement SVG paint-order. Draw the white text halo
  // first and the colored glyphs second, otherwise the outline hides labels.
  element.querySelectorAll('text[paint-order="stroke"]').forEach((node) => {
    const halo = node.cloneNode(true) as Element;
    halo.removeAttribute("paint-order");
    halo.setAttribute("fill", "none");
    node.before(halo);
    node.removeAttribute("paint-order");
    node.removeAttribute("stroke");
    node.removeAttribute("stroke-width");
  });
  element.setAttribute("width", "800");
  element.setAttribute("height", "920");
  const host = document.createElement("div");
  host.style.cssText =
    "position:absolute;left:-10000px;top:0;width:800px;height:920px;pointer-events:none";
  host.append(element);
  document.body.append(host);
  try {
    const width = 190,
      height = (width * 920) / 800;
    await doc.svg(element, { x: 10, y: (297 - height) / 2, width, height });
    doc.setProperties({
      title: "Mollier h,x-Diagramm",
      subject: "A4-Diagramm – Feuchte bezogen auf Wasser",
      author: "Hochschule Esslingen",
    });
    if (rows.length) appendPdfTables(doc, exportFrames(rows, states, p));
    return doc.output("blob");
  } finally {
    host.remove();
  }
}
export async function exportPdf(
  svg: string,
  rows: PointRow[],
  states: State[],
  p: number,
) {
  download(await createPdf(svg, rows, states, p), "Mollier-h-x-A4.pdf");
}
