import { evaluateSpline, fitCubicSpline } from "../../lib/fitpack";
import type { Coating, Measurement, SingleProfile } from "./types";
export const MAX_MEASUREMENTS = 2000;
export const MAX_GRID_POINTS = 50000;
export function validateMeasurements(points: Measurement[]): string | null {
  if (points.length < 4)
    return "Mindestens vier vollständige Messpunkte werden benötigt.";
  if (points.length > MAX_MEASUREMENTS)
    return `Maximal ${MAX_MEASUREMENTS} Messpunkte sind zulässig.`;
  if (
    points.some(
      (p) => !Number.isFinite(p.position) || !Number.isFinite(p.thickness),
    )
  )
    return "Ort und Schichtdicke müssen endliche Zahlen sein.";
  if (points.some((p) => p.thickness < 0))
    return "Gemessene Schichtdicken dürfen nicht negativ sein.";
  if (points.some((p, i) => i > 0 && p.position <= points[i - 1].position))
    return "Die Orte müssen streng aufsteigend sein; doppelte Orte sind nicht zulässig.";
  const span = points.at(-1)!.position - points[0].position;
  if (span < 2)
    return "Der Messbereich muss mindestens 2 mm umfassen (Auswertung im 1-mm-Raster).";
  if (span > MAX_GRID_POINTS)
    return "Der Messbereich darf höchstens 50.000 mm umfassen.";
  if (!points.some((p) => p.thickness > 0))
    return "Das Profil benötigt mindestens eine positive Schichtdicke.";
  return null;
}
/** Matches numpy.arange(start, stop, 1): right endpoint excluded. */
export function millimetreGrid(start: number, stop: number): number[] {
  const count = Math.ceil(stop - start);
  if (!Number.isFinite(count) || count < 1 || count > MAX_GRID_POINTS)
    throw new Error(
      "Das 1-mm-Raster benötigt 1 bis 50.000 Punkte. Bitte Messbereich oder Bahnanzahl verkleinern.",
    );
  return Array.from({ length: count }, (_, i) => start + i);
}
export function raisedCosine(
  position: number,
  min: number,
  max: number,
): number {
  const edge = (max - min) * 0.1;
  if (position < min + edge)
    return 0.5 * (1 - Math.cos((Math.PI * (position - min)) / edge));
  if (position > max - edge)
    return 0.5 * (1 - Math.cos((Math.PI * (max - position)) / edge));
  return 1;
}
export function buildSingleProfile(
  points: Measurement[],
  smoothing: number,
): SingleProfile {
  const error = validateMeasurements(points);
  if (error) throw new Error(error);
  if (!Number.isFinite(smoothing) || smoothing < 0 || smoothing > 20)
    throw new Error("Der Glättungsfaktor muss zwischen 0 und 20 liegen.");
  const min = points[0].position,
    max = points.at(-1)!.position,
    x = millimetreGrid(min, max);
  const spline = fitCubicSpline(
    points.map((p) => p.position),
    points.map((p) => p.thickness),
    smoothing,
  );
  // Keep interpolation undershoots, as in Python; do not silently clamp them.
  const y = x.map((v) => evaluateSpline(spline, v) * raisedCosine(v, min, max));
  const maximum = y.reduce((a, b) => Math.max(a, b), -Infinity);
  if (!y.every(Number.isFinite) || maximum <= 0)
    throw new Error(
      "Das interpolierte Profil hat kein endliches positives Maximum.",
    );
  const indices = y.flatMap((v, i) => (v >= maximum / 2 ? [i] : []));
  const bounds: [number, number] | null =
    indices.length >= 2 ? [x[indices[0]], x[indices.at(-1)!]] : null;
  return {
    x,
    y,
    maximum,
    halfWidth: bounds ? bounds[1] - bounds[0] : null,
    halfBounds: bounds,
    peakPosition: x[y.indexOf(maximum)],
  };
}
/** Linear interpolation on the fixed 1-mm grid, zero outside support. */
export function interpolateProfile(
  profile: SingleProfile,
  position: number,
): number {
  const local = position - profile.x[0];
  if (local < 0 || local > profile.x.length - 1) return 0;
  const i = Math.floor(local),
    fraction = local - i;
  return i === profile.y.length - 1
    ? profile.y[i]
    : profile.y[i] + fraction * (profile.y[i + 1] - profile.y[i]);
}
export function buildCoating(
  profile: SingleProfile,
  tracks: number,
  spacing: number,
): Coating {
  if (!Number.isInteger(tracks) || tracks < 1 || tracks > 100)
    throw new Error(
      "Die Anzahl der Einzelstrahlen muss eine ganze Zahl zwischen 1 und 100 sein.",
    );
  if (profile.halfWidth === null || profile.halfWidth < 0.1)
    throw new Error(
      "Die Halbhöhenbreite ist im 1-mm-Raster nicht bestimmbar. Eine Totalbeschichtung kann nicht berechnet werden.",
    );
  if (!Number.isFinite(spacing) || spacing < 0.1 || spacing > profile.halfWidth)
    throw new Error(
      `Der Bahnversatz muss zwischen 0,1 und ${profile.halfWidth} mm liegen.`,
    );
  const x = millimetreGrid(
    profile.x[0],
    profile.x.at(-1)! + (tracks - 1) * spacing,
  );
  const y = x.map((v) => {
    let sum = 0;
    for (let i = 0; i < tracks; i++)
      sum += interpolateProfile(profile, v - i * spacing);
    return sum;
  });
  const maximum = y.reduce((a, b) => Math.max(a, b), -Infinity);
  const plateau = y.filter((v) => v >= 0.95 * maximum);
  const automaticThickness =
    plateau.reduce((a, b) => a + b, 0) / plateau.length;
  if (!Number.isFinite(automaticThickness))
    throw new Error("Die Gesamtschichtdicke ist nicht bestimmbar.");
  return {
    x,
    y,
    maximum,
    automaticThickness,
    overlapPercent: ((profile.halfWidth - spacing) / profile.halfWidth) * 100,
    overlapFactor: profile.halfWidth / spacing,
  };
}
/** First row is the header; only first two columns; skip missing cells like pandas.dropna. */
export function measurementsFromRows(rows: unknown[][]): Measurement[] {
  const points: Measurement[] = [];
  for (const [index, row] of rows.slice(1).entries()) {
    const [position, thickness] = row;
    if (
      position === null ||
      position === undefined ||
      position === "" ||
      thickness === null ||
      thickness === undefined ||
      thickness === ""
    )
      continue;
    if (typeof position !== "number" || typeof thickness !== "number")
      throw new Error(
        `Zeile ${index + 2}: Die ersten beiden Spalten müssen Zahlen enthalten.`,
      );
    points.push({ position, thickness });
  }
  const error = validateMeasurements(points);
  if (error) throw new Error(error);
  return points;
}

/** Metadata lives in columns D/E, leaving legacy measurement columns intact. */
export function referenceSpeedFromRows(rows: unknown[][]): number | null {
  const matches = rows.filter((row) => row[3] === "Bahngeschwindigkeit [mm/s]");
  if (!matches.length) return null;
  if (matches.length > 1) throw new Error("Die Messgeschwindigkeit darf nur einmal angegeben werden.");
  const value = matches[0][4];
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 800)
    throw new Error("Die Messgeschwindigkeit muss größer als 0 und höchstens 800 mm/s sein.");
  return value;
}

export function speedFactor(reference: number, speed: number): number {
  if (![reference, speed].every((v) => Number.isFinite(v) && v > 0 && v <= 800))
    throw new Error("Mess- und Bahngeschwindigkeit müssen größer als 0 und höchstens 800 mm/s sein.");
  const factor = reference / speed;
  if (!Number.isFinite(factor)) throw new Error("Das Geschwindigkeitsverhältnis ist zu groß.");
  return factor;
}

/** Exclude every position at which a missing neighbouring track could contribute.
 * Require at least one full spacing period. Integrate the piecewise linear curve.
 */
export function evaluateInterior(coating: Coating, profile: SingleProfile, tracks: number, spacing: number) {
  const start = profile.x.at(-1)! - spacing;
  const end = profile.x[0] + tracks * spacing;
  if (tracks < 2 || end - start < spacing || start < coating.x[0] || end > coating.x.at(-1)!) return null;
  const at = (position: number) => {
    const local = position - coating.x[0], i = Math.floor(local), fraction = local - i;
    return fraction === 0 ? coating.y[i] : coating.y[i] + fraction * (coating.y[i + 1] - coating.y[i]);
  };
  const x = [start, ...coating.x.filter((v) => v > start && v < end), end];
  const y = x.map(at);
  let area = 0;
  for (let i = 1; i < x.length; i++) area += (x[i] - x[i - 1]) * (y[i] + y[i - 1]) / 2;
  const mean = area / (end - start);
  const minimum = Math.min(...y), maximum = Math.max(...y);
  return { start, end, mean, minimum, maximum, waviness: mean > 0 ? 100 * (maximum - minimum) / mean : null };
}
