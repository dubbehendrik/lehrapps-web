import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import type { Project } from "./types";
export function encodeProject(project: Project) {
  const files: Record<string, Uint8Array> = {};
  const images = project.images.map((img, i) => {
    const path = `images/${i}.bin`;
    const [header, base64] = img.dataUrl.split(",");
    files[path] = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return {
      ...img,
      dataUrl: undefined,
      path,
      mime: header.slice(5, header.indexOf(";")),
    };
  });
  files["project.json"] = strToU8(JSON.stringify({ ...project, images }));
  return zipSync(files);
}
export function decodeProject(bytes: Uint8Array): Project {
  if (bytes.length > 150 * 1024 * 1024)
    throw Error("Projektdatei ist zu groß (maximal 150 MB).");
  let expanded = 0;
  const files = unzipSync(bytes, {
    filter: (entry) => {
      expanded += entry.originalSize;
      if (expanded > 250 * 1024 * 1024)
        throw Error("Entpacktes Projekt überschreitet 250 MB.");
      return true;
    },
  });
  if (!files["project.json"]) throw Error("project.json fehlt.");
  const p = JSON.parse(strFromU8(files["project.json"]));
  if (
    p.format !== "flock-inspector" ||
    p.version !== 1 ||
    !Array.isArray(p.images)
  )
    throw Error("Unbekanntes Projektformat oder Version.");
  for (const img of p.images) {
    if (
      !files[img.path] ||
      !/^image\/(png|jpeg|gif|webp|bmp|avif)$/.test(img.mime) ||
      !Number.isInteger(img.width) ||
      img.width <= 0 ||
      !Number.isInteger(img.height) ||
      img.height <= 0 ||
      img.width * img.height > 16000000 ||
      !Array.isArray(img.fibers) ||
      !Array.isArray(img.exclusions)
    )
      throw Error("Ungültige Bilddaten.");
    let binary = "";
    for (const b of files[img.path]) binary += String.fromCharCode(b);
    img.dataUrl = `data:${img.mime};base64,${btoa(binary)}`;
    const finite = (v: unknown) => typeof v === "number" && Number.isFinite(v);
    const point = (v: any) => v && finite(v.x) && finite(v.y);
    for (const f of img.fibers)
      if (
        !Array.isArray(f.points) ||
        f.points.length < 2 ||
        !f.points.every(point) ||
        !["accepted", "review", "excluded"].includes(f.status)
      )
        throw Error("Ungültige Fasergeometrie.");
    if (
      img.calibration &&
      (!Array.isArray(img.calibration.points) ||
        img.calibration.points.length !== 2 ||
        !img.calibration.points.every(point) ||
        !finite(img.calibration.mm) ||
        img.calibration.mm <= 0)
    )
      throw Error("Ungültige Kalibrierung.");
    if (
      img.exclusions.some(
        (r: any) =>
          !r ||
          ![r.x, r.y, r.width, r.height].every(finite) ||
          r.width < 0 ||
          r.height < 0,
      )
    )
      throw Error("Ungültige Ausschlussbereiche.");
    if (
      !img.settings ||
      !finite(img.settings.contrast) ||
      !finite(img.settings.minPixels) ||
      !["dark", "light"].includes(img.settings.polarity) ||
      !point(img.scale) ||
      ![img.name, img.material, img.sample, img.series].every(
        (v) => typeof v === "string",
      )
    )
      throw Error("Ungültige Metadaten.");
    delete img.settings.crosshair;
    if (img.rotation !== undefined && ![0, 90, 180, 270].includes(img.rotation))
      throw Error("Ungültige Bilddrehung.");
    if (
      img.settings.mode !== undefined &&
      !["brightness", "color"].includes(img.settings.mode)
    )
      throw Error("Ungültiger Erkennungsmodus.");
    const bounds = [
      ["hueTolerance", 0, 180],
      ["minSaturation", 0, 1],
      ["backgroundRadius", 1, 200],
      ["backgroundStrength", 0, 1],
    ] as const;
    for (const [key, low, high] of bounds)
      if (
        img.settings[key] !== undefined &&
        (!finite(img.settings[key]) ||
          img.settings[key] < low ||
          img.settings[key] > high)
      )
        throw Error("Ungültige Erkennungseinstellung.");
    if (
      img.settings.colorSamples !== undefined &&
      (!Array.isArray(img.settings.colorSamples) ||
        img.settings.colorSamples.some(
          (c: any) =>
            !c ||
            ![c.h, c.s, c.v].every(finite) ||
            c.h < 0 ||
            c.h >= 360 ||
            c.s < 0 ||
            c.s > 1 ||
            c.v < 0 ||
            c.v > 1,
        ))
    )
      throw Error("Ungültige Farbreferenzen.");
  }
  if (
    !p.comparison ||
    !["series", "material"].includes(p.comparison.mode) ||
    !(p.comparison.alpha > 0 && p.comparison.alpha < 1)
  )
    throw Error("Ungültige Vergleichseinstellungen.");
  return p;
}
export function download(data: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
