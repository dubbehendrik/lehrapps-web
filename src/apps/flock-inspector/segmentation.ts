import type { ImageRecord } from "./types";
import { contains } from "./logic";
export type ColorSample = { h: number; s: number; v: number };
export function rgbToHsv(r: number, g: number, b: number): ColorSample {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  let h = 0;
  if (d) {
    h =
      max === r
        ? 60 * (((g - b) / d) % 6)
        : max === g
          ? 60 * ((b - r) / d + 2)
          : 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}
export function colorMatches(
  c: ColorSample,
  samples: ColorSample[],
  tolerance: number,
  minSaturation: number,
) {
  return (
    c.s >= minSaturation &&
    samples.some(
      (s) =>
        Math.min(Math.abs(c.h - s.h), 360 - Math.abs(c.h - s.h)) <= tolerance,
    )
  );
}
export function segmentImage(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  img: ImageRecord,
) {
  const gray = new Float32Array(w * h),
    integral = new Float64Array((w + 1) * (h + 1)),
    mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        k = i * 4,
        a = rgba[k + 3] / 255;
      gray[i] =
        (0.2126 * rgba[k] + 0.7152 * rgba[k + 1] + 0.0722 * rgba[k + 2]) * a +
        255 * (1 - a);
      row += gray[i];
      integral[(y + 1) * (w + 1) + x + 1] = integral[y * (w + 1) + x + 1] + row;
    }
  }
  const colorMode = img.settings.mode === "color";
  if (colorMode && !img.settings.colorSamples?.length)
    throw Error(
      "Bitte zuerst mindestens eine Faserfarbe im Originalbild anklicken.",
    );
  const radius = Math.round(img.settings.backgroundRadius ?? 20),
    strength = img.settings.backgroundStrength ?? 1;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const p = { x, y },
        i = y * w + x,
        k = i * 4;
      if (
        img.exclusions.some((r) => contains(r, p)) ||
        (img.roi && !contains(img.roi, p)) ||
        rgba[k + 3] === 0
      )
        continue;
      if (colorMode) {
        const c = rgbToHsv(rgba[k], rgba[k + 1], rgba[k + 2]);
        mask[i] = Number(
          colorMatches(
            c,
            img.settings.colorSamples!,
            img.settings.hueTolerance ?? 20,
            img.settings.minSaturation ?? 0.15,
          ),
        );
      } else {
        const x0 = Math.max(0, x - radius),
          x1 = Math.min(w, x + radius + 1),
          y0 = Math.max(0, y - radius),
          y1 = Math.min(h, y + radius + 1);
        const local =
          (integral[y1 * (w + 1) + x1] -
            integral[y0 * (w + 1) + x1] -
            integral[y1 * (w + 1) + x0] +
            integral[y0 * (w + 1) + x0]) /
          ((x1 - x0) * (y1 - y0));
        const global = integral[h * (w + 1) + w] / (w * h),
          background = strength * local + (1 - strength) * global;
        mask[i] = Number(
          (img.settings.polarity === "dark"
            ? background - gray[i]
            : gray[i] - background) > img.settings.contrast,
        );
      }
    }
  return mask;
}
