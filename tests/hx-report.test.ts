import { it, expect } from "vitest";
import { example, solve, FREE } from "../src/apps/hx-diagramm/logic";
import { exportFrames } from "../src/apps/hx-diagramm/exports";
import { reportTables } from "../src/apps/hx-diagramm/pdfTables";
it("PDF tables cover every value from all existing Excel sheets without rounding data", () => {
  const rows = example("Sommer", 950),
    states = rows.map((r) => solve(r.pair, r.values));
  const f = exportFrames(rows, states, 950),
    tables = reportTables(f);
  expect(tables.map((t) => t.title)).toEqual([
    "Zustände",
    "Vorgaben und Prüfung",
    "Prozesse",
    "Modell und Hinweise",
  ]);
  for (const table of tables) {
    expect(table.widths.reduce((a, b) => a + b, 0)).toBe(190);
    for (const row of table.rows)
      expect(row).toHaveLength(table.headers.length);
  }
  f.points.forEach((point, i) =>
    Object.values(point).forEach((value) =>
      expect([...tables[0].rows[i], ...tables[1].rows[i]]).toContain(value),
    ),
  );
  f.processes.forEach((process, i) => {
    expect(tables[2].rows[i][0]).toBe(`${process.Von} → ${process.Nach}`);
    for (const [key, value] of Object.entries(process))
      if (key !== "Von" && key !== "Nach")
        expect(tables[2].rows[i]).toContain(value);
  });
  expect(tables[3].rows).toEqual(f.notes.map((r) => [r.Thema, r.Beschreibung]));
});
it("supports one point, null dewpoint, free paths and arbitrary names", () => {
  const rows = example("Sommer", 950).slice(0, 1);
  rows[0].name = "Sehr langer Name ".repeat(80);
  rows[0].values = [20, 0];
  const f = exportFrames(
    rows,
    rows.map((r) => solve(r.pair, r.values)),
    950,
  );
  const t = reportTables(f);
  expect(t[0].rows[0][1]).toBe(rows[0].name);
  expect(t[0].rows[0].at(-1)).toBeNull();
  expect(t[2].rows).toEqual([]);
  const more = example("Sommer", 950);
  more[1].process = FREE;
  expect(
    reportTables(
      exportFrames(
        more,
        more.map((r) => solve(r.pair, r.values)),
        950,
      ),
    )[2].rows[0].at(-1),
  ).toBe("Nur geometrische Verbindung");
});
