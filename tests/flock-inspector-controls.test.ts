import { it, expect } from "vitest";
import {
  rgbToHsv,
  colorMatches,
  segmentImage,
} from "../src/apps/flock-inspector/segmentation";
import {
  displayPoint,
  sourcePoint,
  selectionForClick,
  sortFibers,
} from "../src/apps/flock-inspector/editor";
import {
  encodeProject,
  decodeProject,
} from "../src/apps/flock-inspector/project";
import { fiberLength } from "../src/apps/flock-inspector/logic";
import type { ImageRecord, Project } from "../src/apps/flock-inspector/types";
const image: ImageRecord = {
  id: "1",
  name: "test",
  material: "A",
  sample: "1",
  series: "s",
  width: 100,
  height: 80,
  dataUrl: "data:image/png;base64,AQID",
  scale: { x: 5, y: 5 },
  exclusions: [],
  calibration: {
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ],
    mm: 1,
  },
  fibers: [
    {
      id: "F-1",
      points: [
        { x: 1, y: 1 },
        { x: 11.049, y: 1 },
      ],
      status: "accepted",
      reason: "",
      manual: false,
    },
    {
      id: "F-2",
      points: [
        { x: 1, y: 1 },
        { x: 11.041, y: 1 },
      ],
      status: "accepted",
      reason: "",
      manual: false,
    },
  ],
  settings: { contrast: 12, minPixels: 3, polarity: "dark" },
};
it("roundtrips coordinates at every right-angle rotation", () => {
  for (const rotation of [0, 90, 180, 270]) {
    const p = { x: 23, y: 51 };
    expect(
      sourcePoint(displayPoint(p, 100, 80, rotation), 100, 80, rotation),
    ).toEqual(p);
  }
});
it("sorts by unrounded lengths without changing selection identities", () => {
  expect(sortFibers(image, "length", false).map((f) => f.id)).toEqual([
    "F-2",
    "F-1",
  ]);
  expect(sortFibers(image, "length", true).map((f) => f.id)).toEqual([
    "F-1",
    "F-2",
  ]);
});
it("supports toggle and range selection in current order", () => {
  const ids = ["3", "1", "2", "4"];
  expect(
    selectionForClick(["1"], "2", ids, "1", { shift: false, toggle: true }),
  ).toEqual(["1", "2"]);
  expect(
    selectionForClick(["1", "2"], "1", ids, "1", {
      shift: false,
      toggle: true,
    }),
  ).toEqual(["2"]);
  expect(
    selectionForClick(["4"], "2", ids, "3", { shift: true, toggle: false }),
  ).toEqual(["3", "1", "2"]);
  expect(
    selectionForClick(["4"], "2", ids, "3", { shift: true, toggle: true }),
  ).toEqual(["4", "3", "1", "2"]);
});
it("uses hue independent of brightness and rejects unsaturated texture", () => {
  const green = rgbToHsv(20, 130, 40),
    shadow = rgbToHsv(4, 26, 8),
    gray = rgbToHsv(40, 40, 40);
  expect(colorMatches(shadow, [green], 10, 0.1)).toBe(true);
  expect(colorMatches(gray, [green], 10, 0.1)).toBe(false);
  expect(
    colorMatches({ h: 359, s: 1, v: 1 }, [{ h: 1, s: 1, v: 1 }], 3, 0.1),
  ).toBe(true);
});
it("segments green fiber on patterned gray background and respects masks", () => {
  const pixels = new Uint8ClampedArray(100 * 80 * 4);
  for (let y = 0; y < 80; y++)
    for (let x = 0; x < 100; x++) {
      const i = (y * 100 + x) * 4,
        v = (x + y) % 2 ? 80 : 150;
      pixels.set([v, v, v, 255], i);
      if (x === 50 && y > 10 && y < 70) pixels.set([10, 90, 20, 255], i);
    }
  const record = {
    ...image,
    settings: {
      ...image.settings,
      mode: "color" as const,
      colorSamples: [rgbToHsv(10, 90, 20)],
      hueTolerance: 15,
      minSaturation: 0.15,
    },
  };
  const mask = segmentImage(pixels, 100, 80, record);
  expect(mask.reduce((a, b) => a + b, 0)).toBe(59);
  const blocked = segmentImage(pixels, 100, 80, {
    ...record,
    exclusions: [{ x: 45, y: 5, width: 10, height: 70 }],
  });
  expect(blocked.reduce((a, b) => a + b, 0)).toBe(0);
});
it("requires color samples, but preserves legacy brightness behavior", () => {
  expect(() =>
    segmentImage(new Uint8ClampedArray(100 * 80 * 4), 100, 80, {
      ...image,
      settings: { ...image.settings, mode: "color" },
    }),
  ).toThrow(/Faserfarbe/);
});
it("persists orientation and settings, without changing calibrated lengths; ignores legacy crosshair", () => {
  const record = {
    ...image,
    rotation: 90 as const,
    settings: {
      ...image.settings,
      crosshair: true,
      mode: "color" as const,
      colorSamples: [rgbToHsv(10, 90, 20)],
      backgroundRadius: 30,
      backgroundStrength: 0.7,
    },
  };
  const p: Project = {
    format: "flock-inspector",
    version: 1,
    name: "test",
    images: [record],
    comparison: { mode: "series", a: "s", b: "b", alpha: 0.05 },
  };
  const loaded = decodeProject(encodeProject(p));
  expect(loaded.images[0].rotation).toBe(90);
  expect(loaded.images[0].settings.crosshair).toBeUndefined();
  expect(loaded.images[0].settings.colorSamples).toEqual(
    record.settings.colorSamples,
  );
  expect(fiberLength(loaded.images[0], loaded.images[0].fibers[0])).toEqual(
    fiberLength(record, record.fibers[0]),
  );
});
