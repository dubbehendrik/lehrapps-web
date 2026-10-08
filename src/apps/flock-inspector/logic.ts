import type { Fiber, Point, ImageRecord, Rect } from "./types";
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export function pathLength(points: Point[]) {
  return points.slice(1).reduce((s, p, i) => s + distance(points[i], p), 0);
}
export function mmPerPixel(image: ImageRecord) {
  if (!image.calibration) return undefined;
  const d = distance(...image.calibration.points);
  return d > 0 ? image.calibration.mm / d : undefined;
}
export function fiberLength(image: ImageRecord, fiber: Fiber) {
  const scale = mmPerPixel(image);
  return scale === undefined ? undefined : pathLength(fiber.points) * scale;
}
export function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b),
    n = values.length;
  const mean = n ? values.reduce((a, b) => a + b, 0) / n : NaN;
  const variance =
    n > 1 ? values.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1) : NaN;
  const quantile = (p: number) => {
    const i = (n - 1) * p,
      j = Math.floor(i);
    return n
      ? sorted[j] + (sorted[Math.min(j + 1, n - 1)] - sorted[j]) * (i - j)
      : NaN;
  };
  return {
    n,
    mean,
    variance,
    sd: Math.sqrt(variance),
    median: quantile(0.5),
    q1: quantile(0.25),
    q3: quantile(0.75),
  };
}
// Lanczos log-gamma and continued-fraction incomplete beta for Student's t distribution.
function logGamma(z: number): number {
  const c = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531,
    -176.6150291621406, 12.507343278686905, -0.13857109526572012,
    9.984369578019572e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5)
    return (
      Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z)
    );
  z--;
  let x = 0.9999999999998099;
  for (let i = 0; i < c.length; i++) x += c[i] / (z + i + 1);
  const t = z + 7.5;
  return (
    0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
  );
}
function betaFraction(a: number, b: number, x: number) {
  let c = 1,
    d = 1 - ((a + b) * x) / (a + 1);
  d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d);
  let h = d;
  for (let m = 1; m <= 300; m++) {
    for (const aa of [
      (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m)),
      (-(a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1)),
    ]) {
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const delta = d * c;
      h *= delta;
      if (aa < 0 && Math.abs(delta - 1) < 3e-14) return h;
    }
  }
  return h;
}
function beta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log1p(-x),
  );
  return x < (a + 1) / (a + b + 2)
    ? (bt * betaFraction(a, b, x)) / a
    : 1 - (bt * betaFraction(b, a, 1 - x)) / b;
}
export function tTwoSided(t: number, df: number) {
  return beta(df / (df + t * t), df / 2, 0.5);
}
export function welch(a: number[], b: number[], alpha = 0.05) {
  if (!(alpha > 0 && alpha < 1))
    throw Error("Signifikanzniveau muss zwischen 0 und 100 % liegen.");
  if (
    [...a, ...b].some((v) => !Number.isFinite(v)) ||
    a.length < 2 ||
    b.length < 2
  )
    throw Error("Mindestens zwei unabhängige Werte je Gruppe erforderlich.");
  const sa = summarize(a),
    sb = summarize(b),
    va = sa.variance / sa.n,
    vb = sb.variance / sb.n,
    se = Math.sqrt(va + vb);
  if (se === 0)
    throw Error("Ohne Streuung ist der Welch-Test nicht bestimmbar.");
  const df = (va + vb) ** 2 / ((va * va) / (sa.n - 1) + (vb * vb) / (sb.n - 1)),
    difference = sa.mean - sb.mean,
    t = difference / se,
    p = tTwoSided(t, df);
  let lo = 0,
    hi = 1;
  while (tTwoSided(hi, df) > alpha) hi *= 2;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (tTwoSided(mid, df) > alpha) lo = mid;
    else hi = mid;
  }
  const margin = ((lo + hi) / 2) * se;
  return {
    difference,
    t,
    df,
    p,
    low: difference - margin,
    high: difference + margin,
    significant: p < alpha,
  };
}
export function groups(images: ImageRecord[], mode: "series" | "material") {
  const output = new Map<string, number[]>();
  const samples = new Map<string, number[]>();
  for (const img of images) {
    if (!mmPerPixel(img)) continue;
    const values = img.fibers
      .filter((f) => f.status === "accepted")
      .map((f) => fiberLength(img, f)!);
    if (!values.length) continue;
    const key =
      mode === "series"
        ? img.series
        : JSON.stringify([img.material, img.sample]);
    const target = mode === "series" ? output : samples;
    target.set(key, [...(target.get(key) || []), ...values]);
  }
  if (mode === "material")
    for (const [key, values] of samples) {
      const [material] = JSON.parse(key);
      output.set(material, [
        ...(output.get(material) || []),
        summarize(values).mean,
      ]);
    }
  return output;
}
export const contains = (r: Rect, p: Point) =>
  p.x >= r.x && p.y >= r.y && p.x <= r.x + r.width && p.y <= r.y + r.height;
