export const LIMIT = 6;
export const DEFAULT_BOUNDS = { a: -1.96, b: 1.96 };
export function normalDensity(z: number): number {
  if (!Number.isFinite(z)) throw new RangeError('z muss endlich sein.');
  return Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
}
/** Positive convergent series for integral from 0 to |z|, scaled by φ(z).
 * Recurrence avoids cancellation in the series; valid for this app's |z| ≤ 6.
 * Probability calculation never depends on the plotted sampling grid. */
export function normalCdf(z: number): number {
  if (!Number.isFinite(z) || Math.abs(z) > LIMIT) throw new RangeError('z muss zwischen −6 und 6 liegen.');
  if (z === 0) return 0.5;
  const x = Math.abs(z);
  let term = x;
  let sum = term;
  for (let n = 1; n < 200; n++) {
    term *= x * x / (2 * n + 1);
    sum += term;
    if (term < sum * Number.EPSILON) break;
  }
  const area = normalDensity(x) * sum;
  return Math.max(0, Math.min(1, z < 0 ? 0.5 - area : 0.5 + area));
}
export function validateBounds(a: number, b: number): string | null {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 'Bitte beide Grenzen als endliche Zahlen eingeben.';
  if (Math.abs(a) > LIMIT || Math.abs(b) > LIMIT) return 'Beide Grenzen müssen zwischen −6 und 6 liegen.';
  if (a > b) return 'Die untere Grenze a darf nicht größer als die obere Grenze b sein.';
  return null;
}
export function intervalProbability(a: number, b: number): number {
  const error = validateBounds(a, b);
  if (error) throw new RangeError(error);
  return Math.max(0, normalCdf(b) - normalCdf(a));
}
export function sampleCurve(a = -LIMIT, b = LIMIT, step = 0.001) {
  if (validateBounds(a, b) || !Number.isFinite(step) || step <= 0 || Math.ceil((b-a)/step)>20000) throw new RangeError('Ungültiges Diagrammraster.');
  const count = Math.ceil((b-a)/step);
  const x = Array.from({ length: count }, (_, i) => a+i*step);
  x.push(b);
  return { x, density: x.map(normalDensity), cdf: x.map(normalCdf) };
}
