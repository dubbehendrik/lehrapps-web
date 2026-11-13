import type { SheetData, Cell } from 'write-excel-file/browser';
import { calculate, cellState, MAX_SCENARIOS, validateInterventions, validateParameters } from './logic';
import type { Intervention, Parameters, Scenario } from './types';

export const FORMAT = 'Mehrfachspuele Modellstand';
export const VERSION = 1;
type RawRows = unknown[][];
/** Explicit, versioned records keep parameters and intervention order readable in Excel.
 * Results are unrounded snapshots; imports recalculate from the authoritative records.
 */
export function scenarioRows(s: Scenario): SheetData {
  const r = calculate(s.parameters, s.interventions), base = calculate(s.parameters);
  const p = s.parameters;
  const rows: SheetData = [
    [FORMAT, VERSION], ['Name', s.name], ['Verschleppungsvolumen [L]', p.dragVolume],
    ['Ausgangskonzentration [g/L]', p.sourceConcentration], ['Grenzschmutzkonzentration [g/L]', p.limit],
    ['Letzter Tauchschritt T', p.steps], ['Stufenzahl N', p.stages.length],
    ['Becken', 'Stufe n', 'Volumen [L]', 'Anfangskonzentration [g/L]'],
    ...p.stages.map((b, i) => ['Stufe', i + 1, b.volume, b.initialConcentration]),
    ['Eingriff', 'Reihenfolge', 'Stufe n', 'Tauchschritt t', 'Konzentration [g/L]', 'Kommentar'],
    ...s.interventions.map((e, i) => ['Änderung', i + 1, e.stage, e.step, e.value, e.comment]),
    ['Ergebnisse (Momentaufnahme; beim Import neu berechnet)'],
    ['Tauchschritt t', ...p.stages.map((_, i) => `c Stufe ${i + 1} [g/L]`), 'Spülkriterium R [–]'],
    ...r.concentrations.map((row, t) => [t, ...row.map((v, i): Cell => {
      const state = cellState(s, t, i + 1, v, base.concentrations[t][i]);
      return { value: v, type: Number, backgroundColor: state === 'manual' ? '#e99b47' : state === 'affected' ? '#fff0d6' : '#ffffff',
        format: v !== 0 && (Math.abs(v) < 1 || Math.abs(v) >= 1e5) ? '0.0E+00' : '0.0' };
    }), t === 0 ? 'Noch kein Tauchschritt' : r.criterion[t] === null ? 'Nicht definiert (0/0)' : r.criterion[t] === Infinity ? '∞' : r.criterion[t]]),
    ['Legende', 'Dunkelorange: manuell gesetzt. Hellorange: gegenüber Rechnung ohne Eingriffe geändert.'],
    ['Modell', 'Vollständige Durchmischung; konstante Verschleppung; keine laufende Frischwasserzufuhr.'],
    ['Eingriffe', 'Zustand nach Durchmischung. Externe Stoffentnahme/-zugabe nicht bilanziert.'],
    ['Import', 'Parameter, Becken und Änderungshistorie werden eingelesen; Ergebniszellen sind Momentaufnahmen.'],
  ];
  return rows.map((row, index) => row.map(v => {
    if (typeof v === 'number') return { value: v, type: Number, format: Number.isInteger(v) ? '0' : '0.0E+00' };
    if (typeof v === 'string') return { value: v, type: String, ...(index === 0 || v === 'Tauchschritt t' ? { fontWeight: 'bold' as const, backgroundColor: '#e8f0f7' } : {}), wrap: true };
    return v;
  }));
}
export function workbookSheets(scenarios: Scenario[]) {
  if (!scenarios.length || scenarios.length > MAX_SCENARIOS) throw new Error('Ungültige Anzahl an Szenarien.');
  return scenarios.map((s, i) => ({ sheet: `${i + 1} ${s.name.replace(/[\\/*?:\[\]:']/g, ' ').trim() || 'Szenario'}`.slice(0, 31),
    data: scenarioRows(s), stickyRowsCount: 2, columns: Array.from({ length: Math.max(s.parameters.stages.length + 2, 6) }, (_, n) => ({ width: n === 0 ? 44 : n === 5 ? 50 : 26 })) }));
}
export function parseScenario(rows: RawRows, id: string): Scenario {
  const fail = () => { throw new Error('Kein gültiger Mehrfachspüle-Modellstand (Formatversion 1).'); };
  if (rows[0]?.[0] !== FORMAT || rows[0]?.[1] !== VERSION) fail();
  const number = (v: unknown): number => { if (typeof v !== 'number' || !Number.isFinite(v)) fail(); return v as number; };
  const expected = ['Name', 'Verschleppungsvolumen [L]', 'Ausgangskonzentration [g/L]', 'Grenzschmutzkonzentration [g/L]', 'Letzter Tauchschritt T', 'Stufenzahl N'];
  expected.forEach((label, i) => { if (rows[i + 1]?.[0] !== label) fail(); });
  const name = rows[1]?.[1];
  if (typeof name !== 'string' || !name.trim() || name.length > 100) fail();
  const N = number(rows[6]?.[1]);
  if (!Number.isInteger(N) || N < 1 || N > 12 || rows[7]?.[0] !== 'Becken') fail();
  const p: Parameters = { dragVolume: number(rows[2]?.[1]), sourceConcentration: number(rows[3]?.[1]),
    limit: number(rows[4]?.[1]), steps: number(rows[5]?.[1]), stages: [] };
  for (let n = 1; n <= N; n++) {
    const row = rows[7 + n];
    if (row?.[0] !== 'Stufe' || row[1] !== n) fail();
    p.stages.push({ volume: number(row[2]), initialConcentration: number(row[3]) });
  }
  const interventions: Intervention[] = [];
  let cursor = 8 + N;
  if (rows[cursor]?.[0] !== 'Eingriff') fail();
  cursor++;
  while (rows[cursor]?.[0] === 'Änderung') {
    const row = rows[cursor++];
    if (row[1] !== interventions.length + 1 || (row[5] != null && typeof row[5] !== 'string')) fail();
    interventions.push({ stage: number(row[2]), step: number(row[3]), value: number(row[4]), comment: (row[5] as string) ?? '' });
    if (interventions.length > 1000) fail();
  }
  if (rows[cursor]?.[0] !== 'Ergebnisse (Momentaufnahme; beim Import neu berechnet)') fail();
  validateParameters(p); validateInterventions(p, interventions);
  return { id, name: (name as string).trim(), parameters: p, interventions };
}
export async function exportWorkbook(scenarios: Scenario[]) {
  const { default: write } = await import('write-excel-file/browser');
  await write(workbookSheets(scenarios)).toFile('Mehrfachspuele.xlsx');
}
export async function importWorkbook(file: File): Promise<{ scenarios: Scenario[]; errors: string[] }> {
  if (file.size > 10 * 1024 * 1024) throw new Error('Die Excel-Datei darf höchstens 10 MB groß sein.');
  const { default: read } = await import('read-excel-file/browser');
  const sheets = await read(file);
  if (sheets.length > MAX_SCENARIOS) throw new Error(`Höchstens ${MAX_SCENARIOS} Tabellenblätter sind zulässig.`);
  const scenarios: Scenario[] = [], errors: string[] = [];
  for (const sheet of sheets) {
    try { scenarios.push(parseScenario(sheet.data, crypto.randomUUID())); }
    catch (e) { errors.push(`${sheet.sheet}: ${(e as Error).message}`); }
  }
  return { scenarios, errors };
}
