import type { Intervention, Parameters, Scenario } from './types';
export const MAX_STAGES = 12;
export const MAX_STEPS = 2000;
export const MAX_SCENARIOS = 30;
export function defaultParameters(): Parameters {
  return { dragVolume: 10, sourceConcentration: 50, limit: 25, steps: 40,
    stages: Array.from({ length: 3 }, () => ({ volume: 100, initialConcentration: 0 })) };
}
export function validateParameters(p: Parameters): void {
  const nonnegative = (v: number) => Number.isFinite(v) && v >= 0 && v <= 1e9;
  if (!nonnegative(p.dragVolume) || !nonnegative(p.sourceConcentration) || !nonnegative(p.limit))
    throw new Error('Verschleppungsvolumen und Konzentrationen müssen zwischen 0 und 10⁹ liegen.');
  if (!Number.isInteger(p.steps) || p.steps < 1 || p.steps > MAX_STEPS)
    throw new Error(`T muss eine ganze Zahl zwischen 1 und ${MAX_STEPS} sein.`);
  if (!Array.isArray(p.stages) || p.stages.length < 1 || p.stages.length > MAX_STAGES)
    throw new Error(`N muss zwischen 1 und ${MAX_STAGES} liegen.`);
  if (p.stages.some(s => !nonnegative(s.volume) || s.volume === 0 || !nonnegative(s.initialConcentration)))
    throw new Error('Jedes Becken benötigt ein positives Volumen bis 10⁹ L und eine Anfangskonzentration zwischen 0 und 10⁹ g/L.');
}
export function canEdit(interventions: Intervention[], stage: number, step: number): boolean {
  const last = interventions.at(-1);
  return !last || (stage >= last.stage && step >= last.step);
}
export function validateInterventions(p: Parameters, interventions: Intervention[]): void {
  if (interventions.length > 1000) throw new Error('Höchstens 1000 Eingriffe pro Szenario sind zulässig.');
  for (let i = 0; i < interventions.length; i++) {
    const e = interventions[i];
    if (!Number.isInteger(e.stage) || e.stage < 1 || e.stage > p.stages.length ||
      !Number.isInteger(e.step) || e.step < 1 || e.step > p.steps ||
      !Number.isFinite(e.value) || e.value < 0 || e.value > 1e9 ||
      typeof e.comment !== 'string' || e.comment.length > 500 ||
      (i > 0 && (e.stage < interventions[i - 1].stage || e.step < interventions[i - 1].step)))
      throw new Error('Ungültiger Eingriff: Wertebereich, Kommentar oder aufsteigende Reihenfolge in n und t prüfen.');
  }
}
/** Perfect mixing of bath volume and incoming carryover; equal carry-in/out volumes.
 * Each row is a complete passage through the baths. No time integration or fresh water feed.
 * Overrides specify the state AFTER mixing; their external mass change is not balanced here.
 */
export function calculate(p: Parameters, interventions: Intervention[] = []) {
  validateParameters(p);
  validateInterventions(p, interventions);
  const overrides = new Map(interventions.map(e => [`${e.step}:${e.stage}`, e]));
  const concentrations = [p.stages.map(s => s.initialConcentration)];
  for (let t = 1; t <= p.steps; t++) {
    const row: number[] = [];
    for (let n = 1; n <= p.stages.length; n++) {
      const bath = p.stages[n - 1];
      const incoming = n === 1 ? p.sourceConcentration : row[n - 2];
      const value = (bath.volume * concentrations[t - 1][n - 1] + p.dragVolume * incoming) / (bath.volume + p.dragVolume);
      row.push(overrides.get(`${t}:${n}`)?.value ?? value);
    }
    concentrations.push(row);
  }
  const criterion = concentrations.map((row, t) => t === 0 ? null :
    row.at(-1) === 0 ? (p.sourceConcentration === 0 ? null : Infinity) : p.sourceConcentration / row.at(-1)!);
  const firstExceedance = concentrations.findIndex((row, t) => t > 0 && row.at(-1)! > p.limit);
  return { concentrations, criterion, firstExceedance: firstExceedance < 0 ? null : firstExceedance,
    totalVolume: p.stages.reduce((sum, s) => sum + s.volume, 0) };
}
export function cellState(s: Scenario, t: number, n: number, actual: number, baseline: number) {
  if (s.interventions.some(e => e.step === t && e.stage === n)) return 'manual';
  const dependent = s.interventions.some(e => t >= e.step && n >= e.stage);
  // Tolerance avoids highlighting numerical noise, but remains relative at tiny concentrations.
  return dependent && Math.abs(actual - baseline) > 1e-12 * Math.max(Math.abs(actual), Math.abs(baseline), Number.MIN_VALUE)
    ? 'affected' : 'unchanged';
}
const superscript = (v: number) => String(v).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(c)] ?? (c === '-' ? '⁻' : c)).join('');
export function fmt(v: number | null): string {
  if (v === null || Number.isNaN(v)) return '–';
  if (!Number.isFinite(v)) return '∞';
  if (v !== 0 && (Math.abs(v) < 1 || Math.abs(v) >= 1e5)) {
    const [a, b] = v.toExponential(1).split('e');
    return `${Number(a).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} · 10${superscript(Number(b))}`;
  }
  return v.toLocaleString('de-DE', { maximumFractionDigits: 1 });
}
