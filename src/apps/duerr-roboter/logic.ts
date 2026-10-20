import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
export const SIZE = 12024;
export const fields = [
  { key: 'BLL1', unit: 'bar', max: 6, step: 0.01, offset: 0, type: 'float' },
  { key: 'BLL2', unit: 'bar', max: 6, step: 0.01, offset: 8, type: 'float' },
  { key: 'ML1', unit: 'U/min', max: 70000, step: 1, offset: 16, type: 'uint32' },
  { key: 'FM', unit: 'cm³/min', max: 900, step: 1, offset: 22, type: 'uint16' },
  { key: 'HV', unit: 'µA', max: 400, step: 1, offset: 20, type: 'uint16' },
] as const;
export type Key = typeof fields[number]['key'];
export type Brush = Record<Key, number>;
export type Document = { name: string; original: Uint8Array; readme: string; user: string; date: string; extras: Record<string, Uint8Array> };
export function validate(key: Key, value: number) {
  const f = fields.find(f => f.key === key)!;
  if (!Number.isFinite(value) || value < 0 || value > f.max) throw Error(`${key}: zulässig sind 0 bis ${f.max} ${f.unit}.`);
  if (key === 'HV' && value !== 0 && value < 100) throw Error('HV: zulässig sind 0 oder 100–400 µA.');
  const scale = f.type === 'float' ? 100 : 1;
  if (Math.abs(value * scale - Math.round(value * scale)) > 0.00001) throw Error(`${key}: ${scale === 100 ? 'höchstens zwei Nachkommastellen' : 'nur ganze Zahlen'} zulässig.`);
}
export function checkFile(bytes: Uint8Array) {
  if (bytes.length !== SIZE) throw Error(`Unbekanntes Dateiformat: erwartet werden ${SIZE} Byte, erhalten ${bytes.length}.`);
  for (let n = 1; n <= 500; n++) {
    const row = readBrush(bytes, n);
    for (const f of fields) if (!Number.isFinite(row[f.key]) || row[f.key] < 0 || row[f.key] > f.max + 0.000001) throw Error(`Unplausibler Wert in Brush ${n}, ${f.key}. Dieses Format wird nicht unterstützt.`);
  }
}
export function readBrush(bytes: Uint8Array, n: number): Brush {
  if (!Number.isInteger(n) || n < 1 || n > 500) throw Error('Brush muss zwischen 1 und 500 liegen.');
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), start = n * 24;
  return Object.fromEntries(fields.map(f => [f.key, f.type === 'float' ? v.getFloat32(start + f.offset, true) : f.type === 'uint32' ? v.getUint32(start + f.offset, true) : v.getUint16(start + f.offset, true)])) as Brush;
}
export function patchBrush(bytes: Uint8Array, n: number, patch: Partial<Brush>) {
  if (!Number.isInteger(n) || n < 100 || n > 500) throw Error('Nur Brushes 100–500 dürfen geändert werden.');
  for (const f of fields) if (patch[f.key] !== undefined) validate(f.key, patch[f.key]!);
  const out = bytes.slice(), v = new DataView(out.buffer);
  for (const f of fields) {
    const x = patch[f.key]; if (x === undefined) continue;
    const offset = n * 24 + f.offset;
    if (f.type === 'float') v.setFloat32(offset, x, true);
    else if (f.type === 'uint32') v.setUint32(offset, x, true);
    else v.setUint16(offset, x, true);
  }
  return out;
}
export function changedBrushes(original: Uint8Array, bytes: Uint8Array) {
  return Array.from({length: 500}, (_, i) => i + 1).filter(n => original.slice(n * 24, (n + 1) * 24).some((b, i) => b !== bytes[n * 24 + i]));
}
export function verifyChanges(original: Uint8Array, bytes: Uint8Array) {
  if (original.length !== SIZE || bytes.length !== SIZE) throw Error('Dateigröße verändert.');
  for (let i = 0; i < SIZE; i++) {
    if (original[i] === bytes[i]) continue;
    const n = Math.floor(i / 24), offset = i % 24;
    if (n < 100 || !fields.some(f => offset >= f.offset && offset < f.offset + (f.type === 'uint16' ? 2 : 4))) throw Error(`Geschützter Dateibereich wurde verändert (Byte ${i}).`);
  }
  for (const n of changedBrushes(original, bytes)) {
    const a = readBrush(original, n), b = readBrush(bytes, n);
    for (const f of fields) if (a[f.key] !== b[f.key]) validate(f.key, f.type === 'float' ? Math.round(b[f.key] * 100) / 100 : b[f.key]);
  }
}
export type Axis = { enabled: boolean; key: Key; from: number; to: number; count: number };
export type PlanRow = { n: number; values: Brush };
export function makePlan(bytes: Uint8Array, source: number, start: number, count: number, mode: 'paired' | 'combinations', axes: Axis[]): PlanRow[] {
  const base = readBrush(bytes, source), active = axes.filter(a => a.enabled);
  if (!active.length) throw Error('Mindestens einen Parameter für die Variation auswählen.');
  if (new Set(active.map(a => a.key)).size !== active.length) throw Error('Jeden Parameter nur einmal auswählen.');
  const series = active.map(a => {
    const length = mode === 'paired' ? count : a.count;
    if (!Number.isInteger(length) || length < 1 || length > 401) throw Error('Anzahl Brushes/Werte muss ganzzahlig zwischen 1 und 401 liegen.');
    validate(a.key, a.from); validate(a.key, a.to);
    if (length === 1 && a.from !== a.to) throw Error(`${a.key}: Bei einem Wert müssen Start und Ende gleich sein.`);
    return Array.from({length}, (_, i) => {
      const f = fields.find(f => f.key === a.key)!;
      const scale = f.type === 'float' ? 100 : 1;
      const value = Math.round((a.from + (a.to - a.from) * (length === 1 ? 0 : i / (length - 1))) * scale) / scale;
      validate(a.key, value); return value;
    });
  });
  const total = mode === 'paired' ? count : series.reduce((n, s) => n * s.length, 1);
  if (!Number.isInteger(start) || start < 100 || total > 401 || start + total - 1 > 500) throw Error(`Die Reihe mit ${total} Brushes passt nicht in den Bereich 100–500.`);
  return Array.from({length: total}, (_, i) => {
    const values = {...base}; let index = i;
    for (let j = active.length - 1; j >= 0; j--) {
      values[active[j].key] = series[j][mode === 'paired' ? i : index % series[j].length];
      if (mode === 'combinations') index = Math.floor(index / series[j].length);
    }
    for (const f of fields) validate(f.key, f.type === 'float' ? Math.round(values[f.key] * 100) / 100 : values[f.key]);
    return { n: start + i, values };
  });
}
export function applyPlan(bytes: Uint8Array, plan: PlanRow[]) {
  return plan.reduce((out, row) => patchBrush(out, row.n, Object.fromEntries(fields.map(f => [f.key, f.type === 'float' ? Math.round(row.values[f.key] * 100) / 100 : row.values[f.key]]))), bytes);
}
const safePath = (name: string) => name.length > 0 && !name.startsWith('/') && !name.includes('\\') && !name.split('/').some(p => p === '..' || p === '.');
export function importDocument(name: string, input: Uint8Array): Document {
  if (input.length > 8 * 1024 * 1024) throw Error('Import ist größer als 8 MB.');
  let bytes = input, readme = '', user = '', date = new Date().toLocaleDateString('sv-SE'), extras: Record<string, Uint8Array> = {};
  if (/\.zip$/i.test(name)) {
    let total = 0, count = 0;
    const files = unzipSync(input, {filter: file => {
      if (!safePath(file.name) || ++count > 30 || (total += file.originalSize) > 8 * 1024 * 1024) throw Error('ZIP enthält ungültige Pfade oder zu viele/große Dateien.');
      return true;
    }});
    const candidates = Object.keys(files).filter(p => !p.endsWith('/') && p.split('/').pop()!.startsWith('BrushData'));
    if (candidates.length !== 1) throw Error('ZIP muss genau eine BrushData-Datei enthalten.');
    const path = candidates[0]; name = path.split('/').pop()!; bytes = files[path];
    for (const [p, data] of Object.entries(files)) {
      if (p === path || p.endsWith('/')) continue;
      if (p === 'README.md') readme = strFromU8(data);
      else if (p === 'brush-editor.json') {
        try { const m = JSON.parse(strFromU8(data)); user = typeof m.user === 'string' ? m.user : ''; date = typeof m.date === 'string' ? m.date : date; } catch { throw Error('brush-editor.json ist ungültig.'); }
      } else if (p !== 'Aenderungen.csv') extras[p] = data;
    }
  }
  if (!name.startsWith('BrushData') || !safePath(name) || name.includes('/')) throw Error('Bitte eine BrushData-Datei mit unverändertem Originalnamen importieren.');
  checkFile(bytes);
  return {name, original: bytes.slice(), readme, user, date, extras};
}
export function exportDocument(doc: Document, bytes: Uint8Array) {
  verifyChanges(doc.original, bytes);
  const changes = ['Brush;Parameter;Import;Export', ...changedBrushes(doc.original, bytes).flatMap(n => {
    const a = readBrush(doc.original, n), b = readBrush(bytes, n);
    return fields.filter(f => a[f.key] !== b[f.key]).map(f => `${n};${f.key};${a[f.key]};${b[f.key]}`);
  })].join('\r\n');
  return zipSync({...doc.extras, [doc.name]: bytes, 'README.md': strToU8(doc.readme), 'brush-editor.json': strToU8(JSON.stringify({version: 1, user: doc.user, date: doc.date, phase: 'Vorläufige Version / Testphase'}, null, 2)), 'Aenderungen.csv': strToU8(changes)});
}
