import type { Point, Fiber } from "./types";
import { fiberLength } from "./logic";
import type { ImageRecord } from "./types";
export type SortKey = "id" | "length" | "status" | "reason";
export function displayPoint(
  p: Point,
  w: number,
  h: number,
  rotation: number,
): Point {
  switch (rotation) {
    case 90:
      return { x: h - p.y, y: p.x };
    case 180:
      return { x: w - p.x, y: h - p.y };
    case 270:
      return { x: p.y, y: w - p.x };
    default:
      return p;
  }
}
export function sourcePoint(
  p: Point,
  w: number,
  h: number,
  rotation: number,
): Point {
  switch (rotation) {
    case 90:
      return { x: p.y, y: h - p.x };
    case 180:
      return { x: w - p.x, y: h - p.y };
    case 270:
      return { x: w - p.y, y: p.x };
    default:
      return p;
  }
}
export function selectionForClick(
  current: string[],
  id: string,
  ordered: string[],
  anchor: string | undefined,
  mod: { shift: boolean; toggle: boolean },
) {
  if (mod.shift && anchor && ordered.includes(anchor)) {
    const a = ordered.indexOf(anchor),
      b = ordered.indexOf(id),
      range = ordered.slice(Math.min(a, b), Math.max(a, b) + 1);
    return mod.toggle ? [...new Set([...current, ...range])] : range;
  }
  if (mod.toggle)
    return current.includes(id)
      ? current.filter((v) => v !== id)
      : [...current, id];
  return [id];
}
export function sortFibers(
  image: ImageRecord,
  key: SortKey,
  descending: boolean,
): Fiber[] {
  return [...image.fibers].sort((a, b) => {
    const d =
      key === "length"
        ? (fiberLength(image, a) ?? 0) - (fiberLength(image, b) ?? 0)
        : String(
            key === "status"
              ? {
                  accepted: "Ausgewertet",
                  excluded: "Ausgeschlossen",
                  review: "Prüfen",
                }[a.status]
              : a[key],
          ).localeCompare(
            String(
              key === "status"
                ? {
                    accepted: "Ausgewertet",
                    excluded: "Ausgeschlossen",
                    review: "Prüfen",
                  }[b.status]
                : b[key],
            ),
            "de",
            { numeric: true },
          );
    return (
      (descending ? -d : d) || a.id.localeCompare(b.id, "de", { numeric: true })
    );
  });
}
