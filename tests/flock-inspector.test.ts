import { describe, it, expect } from "vitest";
import {
  pathLength,
  welch,
  groups,
  fiberLength,
} from "../src/apps/flock-inspector/logic";
import { detectFibers } from "../src/apps/flock-inspector/detection";
import {
  encodeProject,
  decodeProject,
} from "../src/apps/flock-inspector/project";
import type { ImageRecord, Project } from "../src/apps/flock-inspector/types";
const image: ImageRecord = {
  id: "1",
  name: "test",
  material: "A",
  sample: "1",
  series: "test",
  width: 100,
  height: 100,
  dataUrl: "data:image/png;base64,AQID",
  scale: { x: 2, y: 2 },
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
      id: "f",
      points: [
        { x: 10, y: 10 },
        { x: 13, y: 14 },
        { x: 16, y: 14 },
      ],
      status: "accepted",
      manual: false,
      reason: "",
    },
  ],
  settings: { contrast: 10, minPixels: 3, polarity: "dark", crosshair: false },
};
describe("Flock measurement", () => {
  it("measures curved path rather than endpoint distance", () => {
    expect(pathLength(image.fibers[0].points)).toBe(8);
    expect(fiberLength(image, image.fibers[0])).toBeCloseTo(0.8);
  });
  it("matches scipy Welch unequal variance reference", () => {
    const r = welch([0.3, 0.4, 0.5, 0.6], [0.4, 0.5, 0.7, 0.8, 0.9]);
    expect(r.t).toBeCloseTo(-1.8585769002101529, 10);
    expect(r.p).toBeCloseTo(0.10722982623706402, 10);
  });
  it("identical samples have p=1 and interval spans zero", () => {
    const r = welch([1, 2, 3], [1, 2, 3]);
    expect(r.p).toBe(1);
    expect(r.low).toBeLessThan(0);
    expect(r.high).toBeGreaterThan(0);
  });
  it("rejects insufficient and zero-variance data", () => {
    expect(() => welch([1], [2, 3])).toThrow();
    expect(() => welch([1, 1], [2, 2])).toThrow();
  });
  it("weights independent probes equally despite image counts", () => {
    const images = [
      image,
      { ...image, id: "2" },
      {
        ...image,
        id: "3",
        sample: "2",
        fibers: [
          {
            ...image.fibers[0],
            points: [
              { x: 0, y: 0 },
              { x: 20, y: 0 },
            ],
          },
        ],
      },
    ];
    expect(groups(images, "material").get("A")).toEqual([0.8, 2]);
  });
  it("round trips geometry, original data and comparison", () => {
    const p: Project = {
      format: "flock-inspector",
      version: 1,
      name: "test",
      images: [image],
      comparison: { mode: "material", a: "A", b: "B", alpha: 0.05 },
    };
    const loaded = decodeProject(encodeProject(p));
    expect(loaded.images[0].dataUrl).toBe(image.dataUrl);
    expect(loaded.images[0].fibers).toEqual(image.fibers);
    expect(loaded.comparison).toEqual(p.comparison);
  });
  it("detects an isolated straight synthetic fiber and masks annotations", () => {
    const pixels = new Uint8ClampedArray(100 * 100 * 4).fill(255);
    for (let y = 20; y <= 70; y++)
      for (let x = 48; x <= 50; x++) {
        const i = (y * 100 + x) * 4;
        pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
      }
    const found = detectFibers(pixels, 100, 100, image);
    expect(found.filter((f) => f.status === "accepted")).toHaveLength(1);
    expect(pathLength(found[0].points)).toBeGreaterThan(45);
    const masked = detectFibers(pixels, 100, 100, {
      ...image,
      exclusions: [{ x: 40, y: 10, width: 20, height: 70 }],
    });
    expect(masked).toHaveLength(0);
  });
});

it("keeps crossing fragments out of automatic statistics", () => {
  const pixels = new Uint8ClampedArray(100 * 100 * 4).fill(255);
  for (let n = 20; n <= 80; n++) {
    for (const [x, y] of [
      [50, n],
      [n, 50],
    ]) {
      const i = (y * 100 + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
    }
  }
  const found = detectFibers(pixels, 100, 100, image);
  expect(found.length).toBeGreaterThanOrEqual(4);
  expect(found.every((f) => f.status === "review")).toBe(true);
});
it("rejects unknown project versions", () => {
  const p = {
    format: "flock-inspector",
    version: 2,
    name: "test",
    images: [image],
    comparison: { mode: "material", a: "A", b: "B", alpha: 0.05 },
  };
  expect(() => decodeProject(encodeProject(p as unknown as Project))).toThrow(
    /Version/,
  );
});
