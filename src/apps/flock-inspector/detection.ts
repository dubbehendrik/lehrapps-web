import type { Fiber, ImageRecord, Point } from "./types";
import { contains, pathLength } from "./logic";
export function detectFibers(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  img: ImageRecord,
): Fiber[] {
  const gray = new Float32Array(w * h),
    integral = new Float64Array((w + 1) * (h + 1)),
    mask = new Uint8Array(w * h),
    blocked = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        k = i * 4;
      gray[i] =
        (0.2126 * rgba[k] + 0.7152 * rgba[k + 1] + 0.0722 * rgba[k + 2]) *
          (rgba[k + 3] / 255) +
        255 * (1 - rgba[k + 3] / 255);
      row += gray[i];
      integral[(y + 1) * (w + 1) + x + 1] = integral[y * (w + 1) + x + 1] + row;
      const p = { x, y };
      blocked[i] = Number(
        img.exclusions.some((r) => contains(r, p)) ||
          (!!img.roi && !contains(img.roi, p)) ||
          (img.settings.crosshair &&
            (Math.abs(x - w / 2) < 2 || Math.abs(y - h * 0.578) < 2)),
      );
    }
  }
  // Local background removes slow illumination gradients; no physical-length filter.
  const radius = 20;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (blocked[i]) continue;
      const x0 = Math.max(0, x - radius),
        x1 = Math.min(w, x + radius + 1),
        y0 = Math.max(0, y - radius),
        y1 = Math.min(h, y + radius + 1);
      const background =
        (integral[y1 * (w + 1) + x1] -
          integral[y0 * (w + 1) + x1] -
          integral[y1 * (w + 1) + x0] +
          integral[y0 * (w + 1) + x0]) /
        ((x1 - x0) * (y1 - y0));
      mask[i] = Number(
        (img.settings.polarity === "dark"
          ? background - gray[i]
          : gray[i] - background) > img.settings.contrast,
      );
    }
  // Zhang-Suen thinning, preserving the connected centerline topology.
  let changed = true,
    iteration = 0;
  while (changed && iteration++ < 150) {
    changed = false;
    for (let phase = 0; phase < 2; phase++) {
      const remove: number[] = [];
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (!mask[i]) continue;
          const p = [
            mask[i - w],
            mask[i - w + 1],
            mask[i + 1],
            mask[i + w + 1],
            mask[i + w],
            mask[i + w - 1],
            mask[i - 1],
            mask[i - w - 1],
          ];
          const count = p.reduce((a, b) => a + b, 0),
            transitions = p.reduce(
              (s, v, j) => s + Number(!v && p[(j + 1) % 8] === 1),
              0,
            );
          if (
            count >= 2 &&
            count <= 6 &&
            transitions === 1 &&
            (phase === 0
              ? p[0] * p[2] * p[4] === 0 && p[2] * p[4] * p[6] === 0
              : p[0] * p[2] * p[6] === 0 && p[0] * p[4] * p[6] === 0)
          )
            remove.push(i);
        }
      for (const i of remove) mask[i] = 0;
      if (remove.length) changed = true;
    }
  }
  const neighbors = (i: number) => {
    const x = i % w,
      y = Math.floor(i / w),
      out: number[] = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const xx = x + dx,
          yy = y + dy;
        if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue;
        const j = yy * w + xx;
        if (!mask[j]) continue; // avoid triangle edges around orthogonal turns
        if (dx && dy && (mask[y * w + xx] || mask[yy * w + x])) continue;
        out.push(j);
      }
    return out;
  };
  const visited = new Uint8Array(w * h),
    fibers: Fiber[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;
    const component = [start];
    visited[start] = 1;
    for (let k = 0; k < component.length; k++)
      for (const j of neighbors(component[k]))
        if (!visited[j]) {
          visited[j] = 1;
          component.push(j);
        }
    if (component.length < img.settings.minPixels) continue;
    const junctions = component.filter((i) => neighbors(i).length > 2),
      ends = component.filter((i) => neighbors(i).length === 1);
    const edgeVisited = new Set<string>();
    const edge = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
    const seeds = component.filter((i) => neighbors(i).length !== 2);
    if (!seeds.length) seeds.push(component[0]);
    for (const seed of seeds)
      for (const next of neighbors(seed)) {
        if (edgeVisited.has(edge(seed, next))) continue;
        const indices = [seed];
        let prev = seed,
          cur = next;
        edgeVisited.add(edge(prev, cur));
        while (true) {
          indices.push(cur);
          const ns = neighbors(cur);
          if (ns.length !== 2) break;
          const n = ns.find((i) => i !== prev)!;
          if (edgeVisited.has(edge(cur, n))) break;
          edgeVisited.add(edge(cur, n));
          prev = cur;
          cur = n;
        }
        const points: Point[] = indices.map((i) => ({
          x: i % w,
          y: Math.floor(i / w),
        }));
        if (pathLength(points) < img.settings.minPixels) continue;
        const boundary = points.some(
          (p) =>
            p.x <= 2 ||
            p.y <= 2 ||
            p.x >= w - 3 ||
            p.y >= h - 3 ||
            img.exclusions.some((r) =>
              contains(
                {
                  x: r.x - 2,
                  y: r.y - 2,
                  width: r.width + 4,
                  height: r.height + 4,
                },
                p,
              ),
            ) ||
            (!!img.roi &&
              (p.x <= img.roi.x + 2 ||
                p.y <= img.roi.y + 2 ||
                p.x >= img.roi.x + img.roi.width - 2 ||
                p.y >= img.roi.y + img.roi.height - 2)),
        );
        const ambiguous = junctions.length > 0 || ends.length !== 2;
        fibers.push({
          id: `F-${String(fibers.length + 1).padStart(4, "0")}`,
          points,
          status: boundary || ambiguous ? "review" : "accepted",
          reason: boundary
            ? "Rand oder Ausschlussbereich"
            : ambiguous
              ? "Kreuzung oder geschlossener Verlauf – Fragment prüfen"
              : "",
          manual: false,
        });
      }
  }
  // Re-running detection must not silently count manually corrected fibers twice.
  const manualPixels = new Set<string>();
  for (const f of img.fibers.filter(
    (f) => f.manual && f.status !== "excluded",
  )) {
    for (const p of f.points)
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++)
          manualPixels.add(`${Math.round(p.x) + dx}:${Math.round(p.y) + dy}`);
  }
  return fibers.map((f) =>
    f.points.filter((p) => manualPixels.has(`${p.x}:${p.y}`)).length >
    f.points.length * 0.6
      ? {
          ...f,
          status: "review" as const,
          reason: "Überlappt manuelle Faser – mögliche Doppelzählung prüfen",
        }
      : f,
  );
}
