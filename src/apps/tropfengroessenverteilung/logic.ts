import type { Dataset, Histogram, Order, PlotSettings, WeightedPopulation } from './types';
export const MAX_DROPS = 100000;
export const MAX_BINS = 200;
export const orderNames = ['Anzahl', 'Länge', 'Oberfläche', 'Volumen'];
export function validateDiameters(values: number[]): void {
  if (!values.length || values.length > MAX_DROPS) throw new Error(`Bitte 1 bis ${MAX_DROPS} Einzeltropfen eingeben.`);
  if (values.some(x => !Number.isFinite(x) || x < 0.001 || x > 100000)) throw new Error('Jeder Durchmesser muss zwischen 0,001 und 100.000 µm liegen. Null, negative und fehlende Werte sind unzulässig.');
}
/** Scaling cancels in normalized moments, avoiding large powers of dimensional inputs. */
export function weightedPopulation(values: number[], order: Order): WeightedPopulation {
  validateDiameters(values);
  const diameters = [...values].sort((a, b) => a - b), scale = diameters[diameters.length - 1];
  const weights = diameters.map(d => (d / scale) ** order), total = weights.reduce((a, b) => a + b, 0);
  const fractions = weights.map(w => w / total);
  let sum = 0;
  const cumulative = fractions.map(w => (sum += w)); cumulative[cumulative.length - 1] = 1;
  return { diameters, fractions, cumulative };
}
/** Inverse empirical CDF: smallest observed diameter with cumulative fraction >= p. No bin interpolation. */
export function quantile(population: WeightedPopulation, probability: number): number {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) throw new Error('Quantil muss zwischen 0 und 100 % liegen.');
  let lo = 0, hi = population.diameters.length - 1;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (population.cumulative[mid] < probability) lo = mid + 1; else hi = mid; }
  return population.diameters[lo];
}
export function cumulativeAt(population: WeightedPopulation, diameter: number): number {
  let lo = 0, hi = population.diameters.length;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (population.diameters[mid] <= diameter) lo = mid + 1; else hi = mid; }
  return lo ? population.cumulative[lo - 1] : 0;
}
export function momentMean(values: number[], p: number, q: number): number {
  validateDiameters(values);
  if (!Number.isInteger(p) || !Number.isInteger(q) || p <= q || q < 0 || p > 4) throw new Error('Ungültige Momentenordnung.');
  const max = values.reduce((a, b) => Math.max(a, b), values[0]);
  const numerator = values.reduce((s, d) => s + (d / max) ** p, 0);
  const denominator = values.reduce((s, d) => s + (d / max) ** q, 0);
  return max * (numerator / denominator) ** (1 / (p - q));
}
export function classEdges(values: number[], settings: PlotSettings): number[] {
  validateDiameters(values);
  const min = values.reduce((a, b) => Math.min(a, b), Infinity), max = values.reduce((a, b) => Math.max(a, b), 0);
  let count: number, low: number, high: number;
  if (settings.binMode === 'count') {
    count = settings.count;
    if (!Number.isInteger(count) || count < 1 || count > MAX_BINS) throw new Error(`Klassenanzahl: 1 bis ${MAX_BINS}.`);
    low = settings.spacing === 'log' ? min / (min === max ? 1.1 : 1) : 0;
    high = settings.spacing === 'log' && min === max ? max * 1.1 : max;
  } else if (settings.spacing === 'linear') {
    if (!Number.isFinite(settings.width) || settings.width <= 0) throw new Error('Die Klassenbreite muss größer als null sein.');
    low = 0; count = Math.max(1, Math.ceil(max / settings.width)); high = count * settings.width;
  } else {
    if (!Number.isFinite(settings.ratio) || settings.ratio <= 1) throw new Error('Der Klassenfaktor muss größer als 1 sein.');
    low = min; count = Math.max(1, Math.ceil(Math.log(max / min) / Math.log(settings.ratio))); high = low * settings.ratio ** count;
  }
  if (count > MAX_BINS) throw new Error(`Diese Breite erzeugt mehr als ${MAX_BINS} Klassen. Bitte eine größere Breite oder einen größeren Klassenfaktor wählen.`);
  if (!Number.isFinite(high) || high <= low) throw new Error('Die Klassengrenzen sind nicht darstellbar.');
  const edges = Array.from({ length: count + 1 }, (_, i) => settings.spacing === 'log' ? low * (high / low) ** (i / count) : low + (high - low) * i / count);
  edges[0] = low; edges[count] = high;
  return edges;
}
/** [lower,upper), with final upper edge included; all populations share the plot's edges. */
export function histogram(population: WeightedPopulation, edges: number[]): Histogram {
  if (edges.length < 2 || edges.some((x, i) => !Number.isFinite(x) || (i > 0 && x <= edges[i - 1]))) throw new Error('Ungültige Klassengrenzen.');
  const shares = new Array<number>(edges.length - 1).fill(0);
  population.diameters.forEach((d, i) => {
    if (d < edges[0] || d > edges[edges.length - 1] * (1 + 1e-12)) throw new Error('Die Klassengrenzen decken die Daten nicht ab.');
    let lo = 0, hi = edges.length - 1;
    while (lo + 1 < hi) { const mid = (lo + hi) >>> 1; if (d < edges[mid]) hi = mid; else lo = mid; }
    shares[Math.min(lo, shares.length - 1)] += population.fractions[i];
  });
  return { edges, shares, density: shares.map((s, i) => s / (edges[i + 1] - edges[i])), logDensity: shares.map((s, i) => edges[i] > 0 ? s / Math.log10(edges[i + 1] / edges[i]) : NaN) };
}
export function defaultSettings(order: Order): PlotSettings {
  return { datasetIds: ['a'], orders: [order], cumulativeOrders: [order], distribution: true, cumulative: true, ordinate: 'share', logarithmicAxis: false,
    spacing: 'linear', binMode: 'width', width: 5, ratio: 1.25, count: 20, quantileOrders: [3], percentiles: [10, 50, 90], means: ['3,2', '4,3'], cumulativeMode: 'classified', hiddenMarkers: [] };
}
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '–';
  if (value !== 0 && (Math.abs(value) < 0.1 || Math.abs(value) >= 1e5)) {
    const [mantissa, exponent] = value.toExponential(1).split('e');
    const superscripts: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    return `${mantissa.replace('.', ',')} · 10${String(Number(exponent)).split('').map(c => superscripts[c]).join('')}`;
  }
  return value.toLocaleString('de-DE', { maximumFractionDigits: 1 });
}
export const excelCounts = [1, 3, 4, 6, 15, 22, 34, 43, 28, 15, 10, 9, 7, 3, 2, 1];
/** Seeded synthetic drops within the 5 µm source classes; these are not measured raw data. */
export function syntheticDatasets(): Dataset[] {
  let state = 20261114;
  const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return (state + 0.5) / 4294967296; };
  const a = excelCounts.flatMap((n, k) => Array.from({ length: n * 20 }, () => k * 5 + (0.05 + 0.9 * random()) * 5));
  const b: number[] = [];
  while (b.length < 5000) { const z = Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random()); const d = 48 * Math.exp(0.48 * z); if (d >= 5 && d <= 180) b.push(d); }
  return [{ id: 'a', name: 'A – feiner, enger (synthetisch)', diameters: a, synthetic: true }, { id: 'b', name: 'B – gröber, breiter (synthetisch)', diameters: b, synthetic: true }];
}
