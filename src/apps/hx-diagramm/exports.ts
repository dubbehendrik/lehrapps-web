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
    ["Druck [hPa]", String(p)],
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
export async function exportExcel(
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
  await write(
    tables.map((table, i) => {
      const keys = table.length
        ? Object.keys(table[0])
        : ["Von", "Nach", "Prozess", "Status"];
      return {
        sheet: names[i],
        stickyRowsCount: 1,
        data: [keys, ...table.map((r) => keys.map((k) => r[k] ?? null))],
      };
    }),
  ).toFile("Mollier-h-x.xlsx");
}
export async function exportImage(svg: string, format: "svg" | "png") {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  if (format === "svg") {
    download(blob, "Mollier-h-x.svg");
    return;
  }
  const url = URL.createObjectURL(blob);
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
    download(png, "Mollier-h-x.png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
