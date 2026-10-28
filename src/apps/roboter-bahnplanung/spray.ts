import data from './spray-data.json';
export type Brush = { innerAir: number; outerAir: number; rpm: number; voltage: number; distance: number; flow: number; solids: number };
export const REFERENCE_BRUSH: Brush = { innerAir: 500, outerAir: 75, rpm: 35000, voltage: 65, distance: 200, flow: 250, solids: 57 };
export const RECONSTRUCTION = data;
export const format = (x: number) => x.toLocaleString('de-DE', { maximumFractionDigits: 1, ...(x !== 0 && Math.abs(x) < .1 ? { notation: 'scientific' as const } : {}) });
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
type Curve = keyof typeof data.curves;
const unit = (key: Curve) => data.curves[key].radialRate.map(v => v / data.curves[key].integral);
const base = unit('measured');
const effects = ['distance', 'air', 'flow', 'voltage', 'rpm'] as const;
const families = effects.map(name => ({ low: unit(`${name}Low`), mid: unit(`${name}Base`), high: unit(`${name}High`) }));
export function modelNotes(b: Brush) {
  const combined = (-.71 * (b.innerAir - 500) + .11 * (b.outerAir - 75)) / (-.71 * 50 + .11 * 7.5);
  const outside = b.distance < 150 || b.distance > 250 || b.innerAir < 450 || b.innerAir > 550 || b.outerAir < 67.5 || b.outerAir > 82.5 || b.rpm < 31500 || b.rpm > 38500 || b.voltage < 58.5 || b.voltage > 71.5 || (b.flow !== 0 && (b.flow < 225 || b.flow > 275)) || Math.abs(combined) > 1;
  return { outside, combined };
}
/** Generic local surrogate: measured reference + normalized one-factor CFD shape changes.
 * Positivity projection and renormalization preserve mass. Combined effects are additive,
 * not independently validated. Extrapolation is bounded to three times source variation.
 */
export function makeKernel(b: Brush) {
  const { outside, combined } = modelNotes(b);
  const coords = [(b.distance - 200) / 50, combined, (b.flow - 250) / 25, (b.voltage - 65) / 6.5, (b.rpm - 35000) / 3500];
  const radial = base.map((value, i) => Math.max(0, value + families.reduce((sum, f, k) => {
    const t = clamp(coords[k], -3, 3);
    return sum + Math.abs(t) * ((t < 0 ? f.low[i] : f.high[i]) - f.mid[i]);
  }, 0)));
  // Piecewise-linear radial interpolation; integrate 2πr times that interpolant exactly.
  let integral = 0;
  for (let i = 0; i < radial.length - 1; i++) {
    const a = i * data.stepMm, d = data.stepMm, y = radial[i], dy = radial[i + 1] - y;
    integral += 2 * Math.PI * d * (a * y + (a * dy + d * y) / 2 + d * dy / 3);
  }
  if (!(integral > 0)) throw Error('Das generische Spritzmodell liefert kein gültiges Profil. Referenzparameter wählen.');
  const density = (r: number) => {
    if (!Number.isFinite(r) || r < 0 || r >= data.supportMm) return 0;
    const t = r / data.stepMm, i = Math.floor(t);
    return (radial[i] + (t - i) * (radial[i + 1] - radial[i])) / integral;
  };
  let peak = 0; for (let i = 1; i < radial.length; i++) if (radial[i] > radial[peak]) peak = i;
  return { radius: peak * data.stepMm, sigma: 12, support: data.supportMm, eta: data.etaReference, outside, density };
}
/** Supplied solid volume in mm³/s; 1 ml=1000 mm³. */
export const dryVolumeRate = (b: Brush) => b.flow * 1000 / 60 * b.solids / 100;
/** A stationary rate in µm/s, using 1000 µm/mm. */
export const thicknessRate = (b: Brush, k: ReturnType<typeof makeKernel>, r: number) => dryVolumeRate(b) * 1000 * k.eta * k.density(r);
/** Forward projection of the actual runtime kernel, for reconstruction QA and teaching. */
export function singlePass(b: Brush, transverseMm: number, speedMmS = 150) {
  const k = makeKernel(b), dx = 2;
  let integral = 0;
  for (let x = -k.support + dx / 2; x < k.support; x += dx) integral += k.density(Math.hypot(x, transverseMm)) * dx;
  return dryVolumeRate(b) * 1000 * k.eta * integral / speedMmS;
}
