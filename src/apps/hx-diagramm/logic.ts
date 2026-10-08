/** Python reference: Mollier-h-x/thermo.py. Public units °C, g/kg dry air,
 * %, kg/m³ moist air, kJ/kg dry air, hPa. Saturation refers to liquid water. */
export const KEYS = ["T", "x", "phi", "rho", "h"] as const;
export type Key = (typeof KEYS)[number];
export const LABELS: Record<Key, string> = {
  T: "T · Temperatur [°C]",
  x: "x · Wasserbeladung [g/kg tr. Luft]",
  phi: "φ · Relative Feuchte [%]",
  rho: "ρ · Dichte [kg/m³]",
  h: "h · Enthalpie [kJ/kg tr. Luft]",
};
export const FREE = "Freie Verbindung (kein Prozessmodell)",
  HEAT = "Erwärmen · x konstant",
  COOL = "Kühlen · ggf. Kondensatabscheidung",
  ISOTHERM = "Isotherme Be-/Entfeuchtung",
  ISENTHALP = "Isenthalpe Befeuchtung (Näherung)";
export const PROCESSES = [FREE, HEAT, COOL, ISOTHERM, ISENTHALP] as const;
export type Process = (typeof PROCESSES)[number];
export interface State {
  T: number;
  x: number;
  phi: number;
  rho: number;
  h: number;
  dew: number | null;
}
export interface PointRow {
  id: string;
  name: string;
  pair: [Key, Key];
  values: [number, number];
  process: Process;
}
export function linspace(a: number, b: number, n: number) {
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
}
function ashrae(t: number) {
  const k = t + 273.15;
  return Math.exp(
    -5800.2206 / k +
      1.3914993 -
      0.048640239 * k +
      0.000041764768 * k * k -
      0.000000014452093 * k ** 3 +
      6.5459673 * Math.log(k),
  );
}
function murphy(t: number) {
  const k = t + 273.15;
  return Math.exp(
    54.842763 -
      6763.22 / k -
      4.21 * Math.log(k) +
      0.000367 * k +
      Math.tanh(0.0415 * (k - 218.8)) *
        (53.878 - 1331.22 / k - 9.44523 * Math.log(k) + 0.014025 * k),
  );
}
export function saturationPressure(t: number) {
  if (!Number.isFinite(t) || t < -100 || t > 80)
    throw Error("Temperatur außerhalb des Rechenbereichs −100 bis 80 °C.");
  return t >= 0 ? ashrae(t) : (murphy(t) * ashrae(0)) / murphy(0);
}
export function checkPressure(p: number) {
  if (!Number.isFinite(p) || p < 500 || p > 1200)
    throw Error("Der Luftdruck muss zwischen 500 und 1200 hPa liegen.");
}
export function saturationX(t: number, p: number) {
  const pv = saturationPressure(t);
  if (pv >= p * 100)
    throw Error("Sättigungsdampfdruck muss kleiner als der Gesamtdruck sein.");
  return (1000 * 0.621945 * pv) / (p * 100 - pv);
}
export function properties(t: number, x: number, p: number) {
  const w = x / 1000,
    pv = (p * 100 * w) / (0.621945 + w);
  return {
    T: t,
    x,
    phi: (100 * pv) / saturationPressure(t),
    h: 1.006 * t + w * (2501 + 1.86 * t),
    rho: (p * 100 * (1 + w)) / (287.042 * (t + 273.15) * (1 + 1.607858 * w)),
  };
}
// Bracketed bisection is deterministic; physical candidate validation rejects poles.
function root(f: (t: number) => number, lo: number, hi: number) {
  let fl = f(lo);
  for (let i = 0; i < 100 && hi - lo > 1e-11; i++) {
    const mid = (lo + hi) / 2,
      fm = f(mid);
    if (fm === 0) return mid;
    if (fl * fm <= 0) hi = mid;
    else {
      lo = mid;
      fl = fm;
    }
  }
  return (lo + hi) / 2;
}
export function state(t: number, x: number, p = 950, chart = true): State {
  checkPressure(p);
  if (!Number.isFinite(t) || !Number.isFinite(x) || x < -1e-8)
    throw Error(
      "Temperatur und Wasserbeladung müssen gültig sein; x darf nicht negativ sein.",
    );
  if (chart && (t < -15 - 1e-7 || t > 40 + 1e-7 || x > 20 + 1e-7))
    throw Error(
      "Der Zustand liegt außerhalb des festen Diagramms (−15 bis 40 °C, 0 bis 20 g/kg).",
    );
  x = Math.max(0, x);
  const v = properties(t, x, p);
  if (v.phi > 100 + 1e-5)
    throw Error(
      "Dieser Zustand liegt jenseits der Sättigungslinie (φ > 100 %). Für Kühlung bitte einen Prozess mit Zieltemperatur anlegen.",
    );
  v.phi = Math.min(100, Math.max(0, v.phi));
  const pv = (p * 100 * (x / 1000)) / (0.621945 + x / 1000);
  return {
    ...v,
    dew:
      pv < saturationPressure(-100)
        ? null
        : root((a) => saturationPressure(a) - pv, -100, 80),
  };
}
export function xFrom(t: number, key: Key, value: number, p: number) {
  if (key === "x") return value;
  if (key === "phi") {
    const pv = (value / 100) * saturationPressure(t);
    return (1000 * 0.621945 * pv) / (p * 100 - pv);
  }
  if (key === "h") return (1000 * (value - 1.006 * t)) / (2501 + 1.86 * t);
  if (key === "rho") {
    const a = (value * 287.042 * (t + 273.15)) / (p * 100);
    return (1000 * (1 - a)) / (1.607858 * a - 1);
  }
  throw Error("Unbekannte Zustandsgröße.");
}
export function solve(
  pair: [Key, Key],
  values: [number, number],
  p = 950,
): State {
  checkPressure(p);
  const [a, b] = pair,
    [va, vb] = values;
  if (
    a === b ||
    !KEYS.includes(a) ||
    !KEYS.includes(b) ||
    !values.every(Number.isFinite)
  )
    throw Error(
      "Bitte zwei unterschiedliche Größen mit endlichen Zahlen vorgeben.",
    );
  const given: Partial<Record<Key, number>> = { [a]: va, [b]: vb };
  if (given.phi !== undefined && (given.phi < 0 || given.phi > 100))
    throw Error("Die relative Feuchte muss zwischen 0 und 100 % liegen.");
  if (given.x !== undefined && given.x < 0)
    throw Error("Die Wasserbeladung darf nicht negativ sein.");
  if (given.rho !== undefined && given.rho <= 0)
    throw Error("Die Dichte muss positiv sein.");
  if (given.T !== undefined) {
    const other = a === "T" ? b : a;
    return state(given.T, xFrom(given.T, other, given[other]!, p), p);
  }
  if (
    pair.includes("x") &&
    pair.includes("phi") &&
    (given.x === 0 || given.phi === 0)
  )
    throw Error(
      "x = 0 und φ = 0 bestimmen keine Temperatur. Bitte eine andere Größenkombination wählen.",
    );
  const residual = (t: number) => properties(t, xFrom(t, a, va, p), p)[b] - vb;
  const roots: number[] = [];
  const grid = linspace(-15, 40, 441);
  for (let i = 0; i < 440; i++) {
    const lo = grid[i],
      hi = grid[i + 1];
    try {
      const f0 = residual(lo),
        f1 = residual(hi);
      if (Math.abs(f0) < 1e-10) roots.push(lo);
      if (f0 * f1 < 0) roots.push(root(residual, lo, hi));
      if (i === 439 && Math.abs(f1) < 1e-10) roots.push(hi);
    } catch {
      /* outside solver domain */
    }
  }
  const candidates: State[] = [];
  for (const t of roots) {
    try {
      const s = state(t, xFrom(t, a, va, p), p);
      if (Math.abs(s[b] - vb) > 1e-6 * Math.max(1, Math.abs(vb))) continue;
      if (!candidates.some((c) => Math.abs(c.T - s.T) < 1e-5))
        candidates.push(s);
    } catch {
      /* reject supersaturation and poles */
    }
  }
  if (!candidates.length)
    throw Error(
      "Für diese beiden Werte gibt es keinen zulässigen Zustand im festen Diagrammbereich.",
    );
  if (candidates.length !== 1)
    throw Error(
      "Diese Kombination ist nicht eindeutig. Bitte z. B. T und φ vorgeben.",
    );
  return candidates[0];
}
export function processTarget(
  start: State,
  kind: Process,
  target: number,
  p: number,
): State {
  if (!Number.isFinite(target))
    throw Error("Bitte eine endliche Zielgröße eingeben.");
  if (kind === HEAT) {
    if (target < start.T - 1e-8)
      throw Error(
        "Beim Erwärmen muss die Zieltemperatur mindestens der Starttemperatur entsprechen.",
      );
    return state(target, start.x, p);
  }
  if (kind === COOL) {
    if (target > start.T + 1e-8)
      throw Error(
        "Beim Kühlen darf die Zieltemperatur nicht höher als die Starttemperatur sein.",
      );
    const x = Math.min(start.x, saturationX(target, p));
    if (target < 0 && x < start.x - 1e-7)
      throw Error(
        "Wasserabscheidung unter 0 °C erfordert ein Vereisungsmodell und wird hier nicht berechnet.",
      );
    return state(target, x, p);
  }
  if (kind === ISOTHERM) return state(start.T, target, p);
  if (kind === ISENTHALP) {
    if (target < start.x - 1e-8)
      throw Error("Bei der Befeuchtung muss die Wasserbeladung zunehmen.");
    return state(
      (start.h - (2501 * target) / 1000) / (1.006 + (1.86 * target) / 1000),
      target,
      p,
    );
  }
  throw Error("Eine freie Verbindung benötigt zwei vorgegebene Zustände.");
}
export function processPath(
  start: State,
  end: State,
  kind: Process,
  p: number,
): { points: State[]; water: number | null } {
  if (kind === FREE) return { points: [start, end], water: null };
  const thermal = kind === HEAT || kind === COOL,
    expected = processTarget(start, kind, thermal ? end.T : end.x, p);
  if (
    Math.abs(expected.T - end.T) > 0.005 ||
    Math.abs(expected.x - end.x) > 0.005
  )
    throw Error(
      "Endpunkte passen nicht zur Prozessart. Zielpunkt neu berechnen oder eine andere Prozessart wählen.",
    );
  const values = linspace(
    thermal ? start.T : start.x,
    thermal ? end.T : end.x,
    101,
  );
  if (
    kind === COOL &&
    start.dew !== null &&
    end.T < start.dew &&
    start.dew < start.T
  ) {
    values.push(start.dew);
    values.sort((a, b) => b - a);
  }
  return {
    points: values.map((v) => processTarget(start, kind, v, p)),
    water: kind === COOL ? Math.max(0, start.x - end.x) : null,
  };
}
export function compatible(start: State, end: State, p: number) {
  return PROCESSES.filter((kind) => {
    try {
      processPath(start, end, kind, p);
      return true;
    } catch {
      return false;
    }
  });
}
export function diagramY(t: number, x: number) {
  return (t * (1.006 + (1.86 * x) / 1000)) / 1.006;
}
export function diagramTemperature(y: number, x: number) {
  return (y * 1.006) / (1.006 + (1.86 * x) / 1000);
}
export function row(
  pair: [Key, Key],
  values: [number, number],
  name = "",
  process: Process = FREE,
): PointRow {
  return { id: crypto.randomUUID(), pair, values, name, process };
}
export function example(which: "Sommer" | "Winter", p: number) {
  const summer = which === "Sommer",
    a = solve(["T", "phi"], summer ? [30, 60] : [-10, 80], p),
    b = processTarget(a, summer ? COOL : HEAT, summer ? 10 : 30, p),
    c = processTarget(b, summer ? HEAT : ISENTHALP, summer ? 22 : 6, p);
  return [
    row(
      ["T", "phi"],
      [a.T, summer ? 60 : 80],
      summer ? "Außenluft" : "Winterluft",
    ),
    row(
      ["T", "x"],
      [b.T, b.x],
      summer ? "Nach Kühler" : "Vorerwärmt",
      summer ? COOL : HEAT,
    ),
    row(
      ["T", "x"],
      [c.T, c.x],
      summer ? "Zuluft" : "Befeuchtet",
      summer ? HEAT : ISENTHALP,
    ),
  ];
}
