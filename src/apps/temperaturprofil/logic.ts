import type { Parameters, Measurement, Fit } from "./types";
export const defaults: Parameters = {
  alpha: 10,
  cp: 900,
  area: 0.1,
  mass: 1,
  referenceTime: 0,
  referenceTemperature: 20,
  ambientTemperature: 100,
  endTime: 600,
  step: 1,
};
export function validate(p: Parameters) {
  if (!Object.values(p).every(Number.isFinite))
    throw Error("Alle Parameter müssen endliche Zahlen sein.");
  if (p.cp <= 0 || p.area <= 0 || p.mass <= 0 || p.step <= 0)
    throw Error("cₚ, A, m und Δt müssen positiv sein.");
  if (p.alpha < 0) throw Error("α darf nicht negativ sein.");
  if (Math.min(p.referenceTemperature, p.ambientTemperature) < -273.15)
    throw Error("Temperaturen dürfen nicht unter −273,15 °C liegen.");
  if (p.endTime <= p.referenceTime)
    throw Error("Die Endzeit muss nach der Referenzzeit liegen.");
  if ((p.endTime - p.referenceTime) / p.step > 20000)
    throw Error(
      "Maximal 20.001 Stützstellen: Δt erhöhen oder Endzeit verkürzen.",
    );
}
export function temperature(time: number, p: Parameters) {
  const dt = time - p.referenceTime;
  if (!Number.isFinite(time) || dt < 0)
    throw Error("Modellzeiten dürfen nicht vor der Referenzzeit liegen.");
  const value =
    p.referenceTemperature +
    (p.ambientTemperature - p.referenceTemperature) *
      -Math.expm1(((-p.alpha * p.area) / (p.mass * p.cp)) * dt);
  if (!Number.isFinite(value))
    throw Error("Numerischer Überlauf; Parameter prüfen.");
  return value;
}
export function simulate(p: Parameters): Measurement[] {
  validate(p);
  const count = Math.ceil((p.endTime - p.referenceTime) / p.step);
  return Array.from({ length: count + 1 }, (_, i) => {
    const time = i === count ? p.endTime : p.referenceTime + i * p.step;
    return { time, temperature: temperature(time, p) };
  });
}
export function numberCell(value: unknown): number {
  if (value === null || value === undefined || String(value).trim() === "")
    return NaN;
  return Number(String(value).trim().replace(",", "."));
}
export function measurementsFromRows(rows: unknown[][]): Measurement[] {
  const out: Measurement[] = [];
  for (const [i, row] of rows.entries()) {
    const empty = (v: unknown) =>
      v === null || v === undefined || String(v).trim() === "";
    if (empty(row[0]) && empty(row[1])) continue;
    const time = numberCell(row[0]),
      temperature = numberCell(row[1]);
    if (!Number.isFinite(time) || !Number.isFinite(temperature))
      throw Error(
        `Zeile ${i + 1}: Zeit und Temperatur müssen als vollständiges Zahlenpaar vorliegen.`,
      );
    if (temperature < -273.15)
      throw Error(`Zeile ${i + 1}: Temperatur unter dem absoluten Nullpunkt.`);
    out.push({ time, temperature });
  }
  if (out.length > 20001) throw Error("Maximal 20.001 Messpunkte erlaubt.");
  return out.sort((a, b) => a.time - b.time);
}
export function parsePaste(text: string) {
  return measurementsFromRows(
    text
      .split(/\r?\n/)
      .map((line) => line.split(line.includes("\t") ? "\t" : ";")),
  );
}
export function importRows(rows: unknown[][]) {
  if (rows.length < 6)
    throw Error(
      "Die Vorlage benötigt eine Kopfzeile und fünf Parameterwerte in Spalte F.",
    );
  const values = rows.slice(1, 6).map((row) => numberCell(row[5]));
  if (!values.every(Number.isFinite))
    throw Error("Spalte F muss cₚ, A, m, T₀ und T∞ enthalten.");
  const [cp, area, mass, referenceTemperature, ambientTemperature] = values;
  // Legacy templates contain trailing time-only rows. Report exclusions explicitly.
  const dataRows = rows.slice(1);
  const excludedRows = dataRows.filter(
    (row) =>
      Number.isFinite(numberCell(row[0])) !==
      Number.isFinite(numberCell(row[1])),
  ).length;
  const measurements = measurementsFromRows(
    dataRows.filter(
      (row) =>
        !(
          Number.isFinite(numberCell(row[0])) !==
          Number.isFinite(numberCell(row[1]))
        ),
    ),
  );

  const endTime = Math.max(600, ...measurements.map((v) => v.time));
  const params = {
    ...defaults,
    cp,
    area,
    mass,
    referenceTemperature,
    ambientTemperature,
    endTime,
  };
  validate(params);
  return { params, measurements, excludedRows };
}
export function fitAlpha(
  points: Measurement[],
  p: Parameters,
  from: number,
  to: number,
): Fit {
  validate(p);
  if (
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    from >= to ||
    from < p.referenceTime
  )
    throw Error(
      "Fit-Grenzen müssen aufsteigend sein und dürfen nicht vor der Referenzzeit liegen.",
    );
  const used = points.filter((v) => v.time >= from && v.time <= to);
  if (used.length < 3 || new Set(used.map((v) => v.time)).size < 3)
    throw Error(
      "Der Fit benötigt mindestens drei unterschiedliche Messzeitpunkte.",
    );
  if (p.referenceTemperature === p.ambientTemperature)
    throw Error(
      "Bei gleicher Referenz- und Umgebungstemperatur ist α nicht bestimmbar.",
    );
  const scale = Math.max(...used.map((v) => v.time - p.referenceTime));
  // Optimize dimensionless rate k*scale. A log grid avoids a local, flat saturation plateau.
  const objective = (q: number) =>
    used.reduce((s, v) => {
      const prediction =
        p.referenceTemperature +
        (p.ambientTemperature - p.referenceTemperature) *
          -Math.expm1((-q * (v.time - p.referenceTime)) / scale);
      return s + (v.temperature - prediction) ** 2;
    }, 0);
  const grid = [
    0,
    ...Array.from({ length: 241 }, (_, i) => 10 ** (-10 + i / 12)),
  ];
  let best = 0;
  for (let i = 1; i < grid.length; i++)
    if (objective(grid[i]) < objective(grid[best])) best = i;
  if (
    best === grid.length - 1 ||
    (best > 0 && objective(grid[best]) === objective(grid[best - 1]))
  )
    throw Error(
      "α ist für diese Daten nicht zuverlässig bestimmbar (Sättigung).",
    );
  let lo = grid[Math.max(0, best - 1)],
    hi = grid[Math.min(grid.length - 1, best + 1)];
  const ratio = (Math.sqrt(5) - 1) / 2;
  let a = hi - ratio * (hi - lo),
    b = lo + ratio * (hi - lo),
    fa = objective(a),
    fb = objective(b);
  for (let i = 0; i < 120; i++) {
    if (fa < fb) {
      hi = b;
      b = a;
      fb = fa;
      a = hi - ratio * (hi - lo);
      fa = objective(a);
    } else {
      lo = a;
      a = b;
      fa = fb;
      b = lo + ratio * (hi - lo);
      fb = objective(b);
    }
  }
  let q = (lo + hi) / 2;
  if (objective(0) <= objective(q)) q = 0;
  const alpha = ((q / scale) * p.mass * p.cp) / p.area;
  const residuals = used.map((v) => ({
    time: v.time,
    temperature: v.temperature - temperature(v.time, { ...p, alpha }),
  }));
  const sse = residuals.reduce((s, v) => s + v.temperature ** 2, 0),
    mean = used.reduce((s, v) => s + v.temperature, 0) / used.length;
  const total = used.reduce((s, v) => s + (v.temperature - mean) ** 2, 0);
  return {
    alpha,
    rmse: Math.sqrt(sse / used.length),
    rSquared: total > 0 ? 1 - sse / total : null,
    from,
    to,
    count: used.length,
    residuals,
  };
}
