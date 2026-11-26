import { sequence } from './logic';

export type GlowPath = { start: number; steps: number; coordinates: Float32Array };
export type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

/** Draw the forward operations in reverse order, starting at the shared root 1. */
export function makeGlowPath(start: number, leftAngle = 0.08, rightAngle = 0.15): GlowPath {
  if (!Number.isInteger(start) || start < 1 || start > 9999) throw new Error('Startwert muss zwischen 1 und 9.999 liegen.');
  const result = sequence(BigInt(start), 'regular');
  if (!result.completed) throw new Error(`Schrittlimit für ${start} erreicht.`);
  const points = result.points;
  const coordinates = new Float32Array(points.length * 2);
  let x = 0, y = 0, angle = -Math.PI / 2;
  for (let i = points.length - 2, j = 2; i >= 0; i--, j += 2) {
    angle += points[i].n % 2n === 0n ? -leftAngle : rightAngle;
    x += Math.cos(angle); y += Math.sin(angle);
    coordinates[j] = x; coordinates[j + 1] = y;
  }
  return { start, steps: points.length - 1, coordinates };
}
export function includePath(bounds: Bounds, path: GlowPath) {
  const {coordinates} = path;
  for (let i = 0; i < coordinates.length; i += 2) {
    bounds.minX = Math.min(bounds.minX, coordinates[i]); bounds.maxX = Math.max(bounds.maxX, coordinates[i]);
    bounds.minY = Math.min(bounds.minY, coordinates[i + 1]); bounds.maxY = Math.max(bounds.maxY, coordinates[i + 1]);
  }
}
