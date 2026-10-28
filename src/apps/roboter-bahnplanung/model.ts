/** Generic, literature-informed teaching surrogate, not an equipment calibration. */
import { makeKernel, dryVolumeRate, REFERENCE_BRUSH, type Brush } from './spray';
export { makeKernel } from './spray';
export type { Brush } from './spray';
export type Scenario = 'spot' | 'line' | 'lineHold' | 'horizontal' | 'vertical' | 'cross' | 'wedge';
export type Settings = {
  scenario: Scenario; sheetWidth: number; sheetHeight: number;
  startU: number; startV: number; width: number; height: number;
  pitchU: number; pitchV: number; signU: 1 | -1; signV: 1 | -1;
  speed: number; hold: number; coatTurns: boolean; wedgeEnd: number; brush: Brush; lineAxis: 'horizontal' | 'vertical';
};
export const DEFAULT: Settings = {
  scenario: 'horizontal', sheetWidth: 600, sheetHeight: 400,
  startU: -60, startV: -60, width: 720, height: 520,
  pitchU: 80, pitchV: 80, signU: 1, signV: 1,
  speed: 200, hold: 3, coatTurns: true, wedgeEnd: 150, lineAxis: 'horizontal',
  brush: { ...REFERENCE_BRUSH },
};
/** Initial teaching experiment: static spray pattern, centered on the sheet. */
export const INITIAL: Settings = { ...DEFAULT, scenario: 'spot', startU: DEFAULT.sheetWidth / 2, startV: DEFAULT.sheetHeight / 2, brush: { ...DEFAULT.brush } };
export const SCENARIOS: Record<Scenario, string> = {
  spot: 'Stationärer Brushversuch', line: 'Mittige Einzelbahn',
  lineHold: 'Einzelbahn bis Zentrum + Halten', horizontal: 'Mäander · horizontal',
  vertical: 'Mäander · vertikal', cross: 'Kreuzgang', wedge: 'Keil · horizontal',
};
export type Point = { u: number; v: number };
export type Segment = { a: Point; b: Point; start: number; end: number; spray: boolean; phase: string };
export type Path = { segments: Segment[]; points: Point[]; duration: number; sprayDuration: number; length: number };
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export function validate(c: Settings): string[] {
  const errors: string[] = [];
  const range = (v: number, lo: number, hi: number, name: string) => {
    if (!Number.isFinite(v) || v < lo || v > hi) errors.push(`${name}: ${lo} bis ${hi}.`);
  };
  if (!Object.hasOwn(SCENARIOS, c.scenario)) errors.push('Unbekanntes Szenario.');
  if (!['horizontal', 'vertical'].includes(c.lineAxis)) errors.push('Unbekannte Einzelbahnrichtung.');
  range(c.sheetWidth, 100, 1200, 'Blechbreite (mm)'); range(c.sheetHeight, 100, 1200, 'Blechhöhe (mm)');
  range(c.width, 10, 1600, 'Bahnbreite (mm)'); range(c.height, 10, 1600, 'Bahnhöhe (mm)');
  range(c.startU, -1600, 1600, 'Start u (mm)'); range(c.startV, -1600, 1600, 'Start v (mm)');
  range(c.pitchU, 10, 500, 'Bahnabstand u (mm)'); range(c.pitchV, 10, 500, 'Bahnabstand v (mm)');
  range(c.speed, 10, 1000, 'Geschwindigkeit (mm/s)'); range(c.hold, .2, 20, 'Spritz-/Haltezeit (s)');
  range(c.wedgeEnd, 25, 300, 'Keil-Enddichte (%)');
  range(c.brush.innerAir, 0, 1000, 'Innere Lenkluft (Normliter/min)');
  range(c.brush.outerAir, 0, 600, 'Äußere Lenkluft (Normliter/min)');
  range(c.brush.rpm, 10000, 60000, 'Drehzahl (1/min)');
  range(c.brush.voltage, 0, 100, 'Hochspannung (kV)');
  range(c.brush.solids, 1, 100, 'Volumetrischer Festkörperanteil (%)');
  range(c.brush.distance, 100, 500, 'Abstand (mm)'); range(c.brush.flow, 0, 500, 'Fördermenge (ml/min)');
  if (![c.signU, c.signV].every(v => v === 1 || v === -1)) errors.push('Ungültige Laufrichtung.');
  if ((['vertical', 'cross'].includes(c.scenario) && c.width / c.pitchU > 60) ||
    (['horizontal', 'cross', 'wedge'].includes(c.scenario) && c.height / c.pitchV * (c.scenario === 'wedge' ? (1 + c.wedgeEnd / 100) / 2 : 1) > 60))
    errors.push('Für die Demo höchstens 60 Bahnabstände je Richtung wählen.');
  return errors;
}
/** Same scenario family as the development planner, detached from machine programs. */
export function makePath(c: Settings): Path {
  const segments: Segment[] = [], points: Point[] = [];
  let time = 0, length = 0, sprayDuration = 0;
  const add = (a: Point, b: Point, seconds: number, spray: boolean, phase: string) => {
    if (seconds <= 0) return;
    segments.push({ a, b, start: time, end: time + seconds, spray, phase });
    time += seconds; if (spray) sprayDuration += seconds;
  };
  const move = (a: Point, b: Point, spray: boolean) => {
    const d = Math.hypot(b.u - a.u, b.v - a.v); length += d;
    add(a, b, d / c.speed, spray, spray ? 'Beschichten' : 'Umsetzen · Spritzen aus');
  };
  if (c.scenario === 'spot') {
    const p = { u: c.startU, v: c.startV }; points.push(p); add(p, p, c.hold, true, 'Stationär applizieren');
  } else if (c.scenario === 'line' || c.scenario === 'lineHold') {
    const horizontal = c.lineAxis === 'horizontal';
    const a = horizontal ? { u: c.startU, v: c.sheetHeight / 2 } : { u: c.sheetWidth / 2, v: c.startV };
    const b = c.scenario === 'lineHold' ? { u: c.sheetWidth / 2, v: c.sheetHeight / 2 }
      : horizontal ? { u: c.startU + c.signU * c.width, v: a.v } : { u: a.u, v: c.startV + c.signV * c.height };
    points.push(a, b); move(a, b, true);
    if (c.scenario === 'lineHold') add(b, b, c.hold, true, 'Im Zentrum halten');
  } else {
    const lanes = (span: number, pitch: number, wedge: boolean) => {
      // Equal intervals, both rectangle boundaries included. Keil: integrated linear density.
      const factor = wedge ? (1 + c.wedgeEnd / 100) / 2 : 1;
      const n = Math.max(1, Math.round(span * factor / pitch));
      return Array.from({ length: n + 1 }, (_, i) => {
        if (!wedge) return span * i / n;
        const k = (c.wedgeEnd / 100 - 1) / span, dose = i * span * factor / n;
        return Math.abs(k) < 1e-10 ? dose : 2 * dose / (1 + Math.sqrt(1 + 2 * k * dose));
      });
    };
    const raster = (vertical: boolean, cross: boolean) => {
      const corner = cross ? points.at(-1)! : { u: c.startU, v: c.startV };
      const su = cross && Math.abs(corner.u - c.startU) > 1e-8 ? -c.signU : c.signU;
      const sv = cross ? -c.signV : c.signV;
      const offsets = lanes(vertical ? c.width : c.height, vertical ? c.pitchU : c.pitchV, c.scenario === 'wedge');
      offsets.forEach((offset, i) => {
        const a = vertical ? { u: corner.u + su * offset, v: corner.v + sv * (i % 2 ? c.height : 0) }
          : { u: corner.u + su * (i % 2 ? c.width : 0), v: corner.v + sv * offset };
        const b = vertical ? { u: a.u, v: corner.v + sv * (i % 2 ? 0 : c.height) }
          : { u: corner.u + su * (i % 2 ? 0 : c.width), v: a.v };
        const previous = points.at(-1); if (previous) move(previous, a, c.coatTurns);
        points.push(a, b); move(a, b, true);
      });
    };
    if (c.scenario !== 'vertical') raster(false, false);
    if (c.scenario === 'vertical' || c.scenario === 'cross') raster(true, c.scenario === 'cross');
  }
  return { segments, points, duration: time, sprayDuration, length };
}
export function poseAt(path: Path, t: number): Point & { spray: boolean; phase: string } {
  const s = path.segments.find(s => s.end > t) ?? path.segments.at(-1);
  if (!s) return { u: 0, v: 0, spray: false, phase: 'Kein Auftrag' };
  const f = clamp((t - s.start) / (s.end - s.start), 0, 1);
  return { u: s.a.u + (s.b.u - s.a.u) * f, v: s.a.v + (s.b.v - s.a.v) * f,
    spray: t < path.duration && s.spray, phase: t >= path.duration ? 'Versuch beendet' : s.phase };
}
export type Frame = { time: number; values: Float32Array };
export type Result = { config: Settings; path: Path; u: number[]; v: number[]; du: number; dv: number;
  frames: Frame[]; max: number; captured: number; supplied: number; integrationSteps: number };
export function simulate(c: Settings): Result {
  const errors = validate(c); if (errors.length) throw Error(errors.join(' '));
  const path = makePath(c);
  if (path.duration > 600) throw Error('Für eine flüssige Demo auf höchstens 600 s begrenzen: Geschwindigkeit erhöhen oder weniger Bahnen wählen.');
  const nx = clamp(Math.ceil(c.sheetWidth / 5), 24, 121), ny = clamp(Math.ceil(c.sheetHeight / 5), 24, 121);
  const du = c.sheetWidth / nx, dv = c.sheetHeight / ny;
  const u = Array.from({ length: nx }, (_, i) => (i + .5) * du);
  const v = Array.from({ length: ny }, (_, i) => (i + .5) * dv);
  const values = new Float32Array(nx * ny), kernel = makeKernel(c.brush);
  const frames: Frame[] = [{ time: 0, values: values.slice() }];
  const spatialStep = Math.max(2, Math.min(du, dv, kernel.sigma) / 2, path.length / 12000);
  let integrationSteps = 0;
  const deposit = (seg: Segment, from: number, to: number) => {
    if (!seg.spray || c.brush.flow === 0 || to <= from) return;
    const d = Math.hypot(seg.b.u - seg.a.u, seg.b.v - seg.a.v) * (to - from) / (seg.end - seg.start);
    const n = Math.max(1, Math.ceil(d / spatialStep)), dt = (to - from) / n;
    for (let k = 0; k < n; k++) {
      const f = (from + (k + .5) * dt - seg.start) / (seg.end - seg.start);
      const cu = seg.a.u + f * (seg.b.u - seg.a.u), cv = seg.a.v + f * (seg.b.v - seg.a.v);
      const i0 = Math.max(0, Math.ceil((cu - kernel.support) / du - .5));
      const i1 = Math.min(nx - 1, Math.floor((cu + kernel.support) / du - .5));
      const j0 = Math.max(0, Math.ceil((cv - kernel.support) / dv - .5));
      const j1 = Math.min(ny - 1, Math.floor((cv + kernel.support) / dv - .5));
      // mm³/s × 1000 µm/mm × s × kernel (1/mm²) = µm.
      const amount = dryVolumeRate(c.brush) * 1000 * kernel.eta * dt;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++)
        values[j * nx + i] += amount * kernel.density(Math.hypot(u[i] - cu, v[j] - cv));
      integrationSteps++;
    }
  };
  for (let frame = 1; frame <= 80; frame++) {
    const from = path.duration * (frame - 1) / 80, to = path.duration * frame / 80;
    for (const seg of path.segments) if (seg.end > from && seg.start < to)
      deposit(seg, Math.max(from, seg.start), Math.min(to, seg.end));
    frames.push({ time: to, values: values.slice() });
  }
  let max = 0, total = 0; for (const v of values) { max = Math.max(max, v); total += v; }
  return { config: structuredClone(c), path, u, v, du, dv, frames, max,
    captured: total * du * dv / 1000, supplied: dryVolumeRate(c.brush) * path.sprayDuration, integrationSteps };
}
export function valuesAt(r: Result, time: number): Float32Array {
  const position = clamp(time / Math.max(r.path.duration, 1e-12) * 80, 0, 80);
  const a = Math.floor(position), b = Math.min(80, a + 1), f = position - a;
  if (f < 1e-10) return r.frames[a].values;
  return r.frames[a].values.map((x, i) => x + f * (r.frames[b].values[i] - x));
}
export function stats(r: Result, values: Float32Array, edge: number) {
  const selected: number[] = [];
  r.v.forEach((v, j) => r.u.forEach((u, i) => {
    if (u >= edge && u <= r.config.sheetWidth - edge && v >= edge && v <= r.config.sheetHeight - edge)
      selected.push(values[j * r.u.length + i]);
  }));
  if (!selected.length) return { mean: 0, min: 0, max: 0, cv: 0 };
  const mean = selected.reduce((a, b) => a + b, 0) / selected.length;
  const sd = Math.sqrt(selected.reduce((a, b) => a + (b - mean) ** 2, 0) / selected.length);
  return { mean, min: Math.min(...selected), max: Math.max(...selected), cv: mean ? sd / mean * 100 : 0 };
}
export function section(r: Result, values: Float32Array, axis: 'u' | 'v', position: number) {
  const other = axis === 'u' ? r.v : r.u, step = axis === 'u' ? r.dv : r.du;
  const p = clamp(position / step - .5, 0, other.length - 1), a = Math.floor(p), b = Math.min(other.length - 1, a + 1), f = p - a;
  return (axis === 'u' ? r.u : r.v).map((_, k) => {
    const i = axis === 'u' ? a * r.u.length + k : k * r.u.length + a;
    const j = axis === 'u' ? b * r.u.length + k : k * r.u.length + b;
    return values[i] + f * (values[j] - values[i]);
  });
}
