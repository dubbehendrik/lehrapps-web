import type { Dataset } from './types';
import { MAX_DROPS, validateDiameters } from './logic';
export const HEADER = 'Durchmesser [µm]';
/** Only the first sheet is authoritative. Metadata never become diameter observations. */
export function parseRows(rows: unknown[][]): number[] {
  if (rows[0]?.[0] !== HEADER) throw new Error(`In Zelle A1 muss „${HEADER}“ stehen. Bitte die Vorlage verwenden.`);
  if (rows.some(row => row.slice(1).some(v => v !== null && v !== undefined && v !== ''))) throw new Error('Das Datenblatt darf nur eine Spalte mit Einzeltropfen enthalten. Klassierte Daten und Häufigkeitsspalten werden nicht als Einzeltropfen interpretiert.');
  const values: number[] = [];
  rows.slice(1).forEach((row, i) => {
    const cell = row[0];
    if (cell === null || cell === undefined || cell === '') { if (row.some(v => v != null && v !== '')) throw new Error(`Zeile ${i + 2}: Durchmesser fehlt.`); return; }
    const value = typeof cell === 'number' ? cell : typeof cell === 'string' && /^\s*\d+(?:[.,]\d+)?(?:[eE][+-]?\d+)?\s*$/.test(cell) ? Number(cell.trim().replace(',', '.')) : NaN;
    if (!Number.isFinite(value) || value < 0.001 || value > 100000) throw new Error(`Zeile ${i + 2}: ungültiger Durchmesser. Erlaubt sind 0,001 bis 100.000 µm.`);
    values.push(value);
  });
  validateDiameters(values); return values;
}
export async function importDataset(file: File): Promise<Dataset> {
  if (file.size > 10 * 1024 * 1024) throw new Error('Die Datei darf höchstens 10 MB groß sein.');
  if (!/\.xlsx$/i.test(file.name)) throw new Error('Bitte eine XLSX-Datei mit Einzeltropfen auswählen.');
  const { default: read } = await import('read-excel-file/browser');
  const sheets = await read(file);
  if (!sheets.length || sheets[0].data.length > MAX_DROPS + 1) throw new Error(`Höchstens ${MAX_DROPS} Tropfen je Datei.`);
  return { id: crypto.randomUUID(), name: file.name.replace(/\.xlsx$/i, '').slice(0, 80), diameters: parseRows(sheets[0].data), synthetic: false };
}
export async function exportDataset(dataset?: Dataset): Promise<void> {
  const { default: write } = await import('write-excel-file/browser');
  await write([
    { sheet: 'Tropfen', data: [[{ value: HEADER, type: String, fontWeight: 'bold' }], ...(dataset?.diameters ?? []).map(value => [{ value, type: Number, format: '0.0' }])], columns: [{ width: 28 }], stickyRowsCount: 1 },
    { sheet: 'Hinweise', data: [
      ['Ein Tropfen pro Zeile auf dem ersten Blatt „Tropfen“. Einheit: µm. Keine Klassenmitten oder Häufigkeiten eintragen.'],
      ['Zeile 1 unverändert lassen. Eigene Messwerte ab A2 einfügen. Leere Zeilen werden ignoriert.'],
      ['Import liest ausschließlich das erste Tabellenblatt. Zusätzliche Hinweise hier werden nicht eingelesen.'],
      [dataset ? `${dataset.name}: ${dataset.synthetic ? 'Synthetische Lehrdaten, keine Messung und keine Zerstäubervalidierung.' : 'Importierter Datensatz; Herkunft wird durch die App nicht geprüft.'}` : 'Leere Vorlage für eigene Messdaten.'],
      ['Beispiel A: aus den Klassenhäufigkeiten der bereitgestellten Excel inspirierte synthetische Einzelwerte mit fester Zufallsfolge.'],
      ['Beispiel B: synthetische logarithmische Normalverteilung; Anzahlmedian 48 µm, logarithmische Standardabweichung 0,48; begrenzt auf 5–180 µm.'],
      ['Kennwerte werden aus ungerundeten Einzelwerten berechnet; die Klassenbreite beeinflusst das Histogramm und die klassierte Summenkurve, nicht die empirische Summenkurve oder die Kennwerte.'],
    ].map(row => row.map(value => ({ value, type: String, wrap: true }))), columns: [{ width: 110 }] },
  ]).toFile(dataset ? `Tropfen_${dataset.id === 'a' ? 'A_synthetisch' : dataset.id === 'b' ? 'B_synthetisch' : 'Messdaten'}.xlsx` : 'Tropfen_Vorlage.xlsx');
}
