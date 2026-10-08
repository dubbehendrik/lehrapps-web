import { useRef, useState, useEffect } from "react";
import type { PointerEvent } from "react";
import type { Project, ImageRecord, Point, Fiber } from "./types";
import {
  contains,
  distance,
  mmPerPixel,
  fiberLength,
  summarize,
  groups,
  welch,
} from "./logic";
import { encodeProject, decodeProject, download } from "./project";
import { Chart } from "../../components/Chart";
import { SupportFooter } from "../../components/SupportFooter";
import { HelpButton } from "./HelpButton";
import { rgbToHsv } from "./segmentation";
import { displayPoint, sourcePoint, selectionForClick, sortFibers } from "./editor";
import type { SortKey } from "./editor";
import "./style.css";
const modeHelp: Record<string, string> = {
  calibrate:
    "Klicke auf die beiden Endpunkte einer bekannten Strecke und gib deren Länge in mm ein. Jedes Bild wird separat kalibriert.",
  exclude:
    "Markiere mit zwei gegenüberliegenden Ecken einen Bereich, den die Erkennung ignorieren soll, etwa Beschriftungen oder Maßstabsbalken. Mehrere Bereiche sind möglich.",
  roi: "Markiere mit zwei gegenüberliegenden Ecken den zu untersuchenden Bildausschnitt. Außerhalb werden keine Fasern erkannt.",
  manual:
    "Klicke entlang einer fehlenden Faser vom Anfang bis zum Ende. Mit „Verlauf übernehmen“ wird die Längenmessung hinzugefügt.",
  scale:
    "Klicke auf die gewünschte Position des eingeblendeten Maßstabs. Kalibrierung und Faserlängen bleiben unverändert.",
  select:
    "Klicke eine erkannte Faser an, um sie zu bearbeiten. STRG/⌘ oder Umschalt erlaubt Mehrfachauswahl.",
  sampleColor:
    "Klicke auf typische Faserstellen im Originalbild, möglichst helle und dunkle. Die Farbreferenzen werden für dieses Bild gespeichert.",
};
const initial: Project = {
  format: "flock-inspector",
  version: 1,
  name: "Flock-Projekt",
  images: [],
  comparison: { mode: "series", a: "", b: "", alpha: 0.05 },
};
const fmt = (n: number | undefined) =>
  n === undefined || !Number.isFinite(n)
    ? "–"
    : n.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
export default function App() {
  const [project, setProject] = useState<Project>(initial),
    [active, setActive] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [mode, setMode] = useState("select"),
    [draft, setDraft] = useState<Point[]>([]),
    [known, setKnown] = useState(1),
    [selected, setSelected] = useState<string[]>([]),
    [color, setColor] = useState("#e60078"),
    [overlay, setOverlay] = useState(true),
    [ids, setIds] = useState(false),
    [zoom, setZoom] = useState(1),
    [history, setHistory] = useState<Project[]>([]),
    [preview, setPreview] = useState<Uint8Array | null>(null),
    [expanded, setExpanded] = useState(false),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [spaceHeld, setSpaceHeld] = useState(false),
    [sortKey, setSortKey] = useState<SortKey>("id"),
    [descending, setDescending] = useState(false);
  const viewport = useRef<HTMLDivElement>(null),
    selectionAnchor = useRef<string | undefined>(undefined),
    panStart = useRef<{ x: number; y: number; origin: Point } | null>(null);

  const canvas = useRef<HTMLCanvasElement>(null),
    worker = useRef<Worker | null>(null);
  const img = project.images.find((i) => i.id === active);
  const scale = img && mmPerPixel(img);
  const rotation = img?.rotation ?? 0;
  const orderedFibers = img ? sortFibers(img, sortKey, descending) : [];
  const imageWidth = img ? (rotation % 180 ? img.height : img.width) : 1;
  const imageHeight = img ? (rotation % 180 ? img.width : img.height) : 1;
  function chooseRow(
    id: string,
    mod: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
  ) {
    setSelected((current) =>
      selectionForClick(
        current,
        id,
        orderedFibers.map((f) => f.id),
        selectionAnchor.current,
        { shift: mod.shiftKey, toggle: mod.ctrlKey || mod.metaKey },
      ),
    );
    if (!mod.shiftKey || !selectionAnchor.current) selectionAnchor.current = id;
  }
  function deleteSelection() {
    if (!img || busy || !selected.length) return;
    update({ fibers: img.fibers.filter((f) => !selected.includes(f.id)) });
    setSelected([]);
    selectionAnchor.current = undefined;
  }
  function rotate(delta: number) {
    if (!img || busy) return;
    update({
      rotation: ((rotation + delta + 360) % 360) as 0 | 90 | 180 | 270,
    });
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setDraft([]);
  }

  useEffect(() => () => worker.current?.terminate(), []);
  function commit(next: Project) {
    setHistory((h) => [...h.slice(-19), project]);
    setProject(next);
  }
  function update(patch: Partial<ImageRecord>) {
    if (!img) return;
    let next = { ...img, ...patch };
    if (patch.settings || patch.exclusions || "roi" in patch) setPreview(null);
    if (patch.exclusions || patch.roi) {
      next = {
        ...next,
        fibers: next.fibers.map((f) =>
          f.points.some(
            (p) =>
              next.exclusions.some((r) =>
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
              (!!next.roi && !contains(next.roi, p)),
          )
            ? {
                ...f,
                status: "review",
                reason: "Auswertebereich geändert – Verlauf prüfen",
              }
            : f,
        ),
      };
    }
    commit({
      ...project,
      images: project.images.map((i) => (i.id === img.id ? next : i)),
    });
  }
  function switchImage(id: string) {
    setActive(id);
    setDraft([]);
    setSelected([]);
    setMode("select");
    setPreview(null);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    selectionAnchor.current = undefined;
  }
  function guard(fn: () => void) {
    try {
      setError("");
      fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  async function loadImage(file: Blob, name: string) {
    setError("");
    try {
      const originalDataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 16000000) {
        bitmap.close();
        throw Error("Maximal 16 Millionen Pixel je Bild.");
      }
      const frozen = document.createElement("canvas");
      frozen.width = bitmap.width;
      frozen.height = bitmap.height;
      frozen.getContext("2d")!.drawImage(bitmap, 0, 0);
      bitmap.close();
      const dataUrl = frozen.toDataURL("image/png");
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      if (image.width * image.height > 16000000)
        throw Error("Maximal 16 Millionen Pixel je Bild.");
      const id = crypto.randomUUID();
      const record: ImageRecord = {
        id,
        name,
        dataUrl,
        originalDataUrl,
        width: image.width,
        height: image.height,
        material: "Material A",
        sample: "Probe 1",
        series: name,
        scale: { x: 30, y: image.height - 35 },
        exclusions: [],
        fibers: [],
        settings: {
          contrast: 12,
          minPixels: 8,
          polarity: "dark",
          mode: "brightness",
          colorSamples: [],
          hueTolerance: 20,
          minSaturation: 0.15,
          backgroundRadius: 20,
          backgroundStrength: 1,
        },
      };
      commit({ ...project, images: [...project.images, record] });
      switchImage(id);
    } catch {
      setError(
        "Bild konnte nicht geladen werden. Bitte ein vom Browser lesbares Rasterbild mit maximal 16 Millionen Pixeln verwenden.",
      );
    }
  }
  async function example() {
    const response = await fetch("/flock-inspector/beispiel.png");
    await loadImage(await response.blob(), "Beispiel – bitte kalibrieren");
  }
  useEffect(() => {
    const c = canvas.current;
    if (!c || !img) return;
    const context = c.getContext("2d")!;
    const image = new Image();
    let cancelled = false;
    image.onload = () => {
      if (cancelled) return;
      c.width = imageWidth;
      c.height = imageHeight;
      if (rotation === 90) {
        context.translate(img.height, 0);
        context.rotate(Math.PI / 2);
      }
      if (rotation === 180) {
        context.translate(img.width, img.height);
        context.rotate(Math.PI);
      }
      if (rotation === 270) {
        context.translate(0, img.width);
        context.rotate(-Math.PI / 2);
      }
      context.drawImage(image, 0, 0);
      if (preview) {
        const layer = document.createElement("canvas");
        layer.width = img.width;
        layer.height = img.height;
        const lc = layer.getContext("2d")!,
          pixels = lc.createImageData(img.width, img.height);
        for (let i = 0; i < preview.length; i++)
          if (preview[i]) {
            pixels.data[i * 4] = 255;
            pixels.data[i * 4 + 2] = 100;
            pixels.data[i * 4 + 3] = 180;
          }
        lc.putImageData(pixels, 0, 0);
        context.drawImage(layer, 0, 0);
      }

      const lineWidth = Math.max(1.5, img.width / 500);
      const draw = (points: Point[], stroke: string, dashed = false) => {
        context.beginPath();
        context.strokeStyle = stroke;
        context.lineWidth = lineWidth;
        context.setLineDash(dashed ? [6, 4] : []);
        points.forEach((p, i) =>
          i ? context.lineTo(p.x, p.y) : context.moveTo(p.x, p.y),
        );
        context.stroke();
        context.setLineDash([]);
      };
      if (overlay && !preview)
        for (const f of img.fibers) {
          draw(
            f.points,
            selected.includes(f.id)
              ? "#00a8ff"
              : f.status === "excluded"
                ? "#777"
                : color,
            f.status !== "accepted",
          );
          if (ids || selected.includes(f.id)) {
            context.fillStyle = "#000";
            context.font = "14px sans-serif";
            context.fillText(f.id, f.points[0].x + 4, f.points[0].y - 4);
          }
        }
      for (const r of img.exclusions) {
        context.fillStyle = "#d6454530";
        context.fillRect(r.x, r.y, r.width, r.height);
        context.strokeStyle = "#b00020";
        context.strokeRect(r.x, r.y, r.width, r.height);
      }
      if (img.roi) {
        context.strokeStyle = "#00784e";
        context.strokeRect(img.roi.x, img.roi.y, img.roi.width, img.roi.height);
      }
      if (img.calibration) {
        draw(img.calibration.points, "#008356");
        for (const p of img.calibration.points) {
          context.beginPath();
          context.arc(p.x, p.y, 4, 0, Math.PI * 2);
          context.fillStyle = "#008356";
          context.fill();
        }
      }
      if (scale) {
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        const mm =
          [
            10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001,
          ].find((v) => v / scale <= imageWidth * 0.25) ??
          imageWidth * scale * 0.2;
        const length = mm / scale,
          position = displayPoint(img.scale, img.width, img.height, rotation);
        const x = Math.max(8, Math.min(imageWidth - length - 8, position.x)),
          y = Math.max(30, Math.min(imageHeight - 12, position.y));
        context.fillStyle = "#fff";
        context.fillRect(x - 8, y - 29, length + 16, 40);
        context.fillStyle = "#000";
        context.font = "16px sans-serif";
        context.fillText(
          `${mm.toLocaleString("de-DE", { maximumSignificantDigits: 3 })} mm`,
          x,
          y - 9,
        );
        draw(
          [
            { x, y },
            { x: x + length, y },
          ],
          "#000",
        );
        context.restore();
      }
      if (draft.length) draw(draft, "#0066ff");
    };
    image.src = img.dataUrl;
    return () => {
      cancelled = true;
    };
  }, [
    img,
    overlay,
    color,
    ids,
    selected,
    draft,
    scale,
    preview,
    rotation,
    imageWidth,
    imageHeight,
  ]);
  function click(e: PointerEvent<HTMLCanvasElement>) {
    if (!img) return;
    e.currentTarget.focus();
    if (busy) return;
    if (spaceHeld || e.button === 1) {
      e.preventDefault();
      panStart.current = { x: e.clientX, y: e.clientY, origin: pan };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const p = sourcePoint(
      {
        x: ((e.clientX - r.left) * imageWidth) / r.width,
        y: ((e.clientY - r.top) * imageHeight) / r.height,
      },
      img.width,
      img.height,
      rotation,
    );
    if (mode === "sampleColor") {
      const original = new Image();
      original.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(original, 0, 0);
        const pixel = ctx.getImageData(
          Math.min(img.width - 1, Math.max(0, Math.floor(p.x))),
          Math.min(img.height - 1, Math.max(0, Math.floor(p.y))),
          1,
          1,
        ).data;
        const sample = rgbToHsv(pixel[0], pixel[1], pixel[2]);
        update({
          settings: {
            ...img.settings,
            colorSamples: [...(img.settings.colorSamples ?? []), sample],
          },
        });
      };
      original.src = img.dataUrl;
      return;
    }
    if (mode === "split") {
      setDraft([p]);
      return;
    }
    if (mode === "select") {
      let nearest: Fiber | undefined,
        min = (12 * imageWidth) / r.width;
      for (const f of img.fibers)
        for (const q of f.points) {
          const d = distance(p, q);
          if (d < min) {
            min = d;
            nearest = f;
          }
        }
      if (nearest)
        setSelected((s) =>
          e.shiftKey || e.ctrlKey || e.metaKey
            ? s.includes(nearest!.id)
              ? s.filter((id) => id !== nearest!.id)
              : [...s, nearest!.id]
            : [nearest!.id],
        );
      return;
    }
    if (mode === "scale") {
      update({ scale: p });
      return;
    }
    const next = [...draft, p];
    if (mode === "manual") {
      setDraft(next);
      return;
    }
    if (next.length === 2) {
      if (mode === "calibrate") {
        if (!(known > 0) || distance(next[0], next[1]) < 5) {
          setError(
            "Positive Referenzlänge und mindestens 5 Pixel Abstand erforderlich.",
          );
          return;
        }
        update({ calibration: { points: [next[0], next[1]], mm: known } });
      } else {
        const [a, b] = next,
          rect = {
            x: Math.min(a.x, b.x),
            y: Math.min(a.y, b.y),
            width: Math.abs(a.x - b.x),
            height: Math.abs(a.y - b.y),
          };
        if (rect.width < 1 || rect.height < 1) return;
        if (mode === "exclude")
          update({ exclusions: [...img.exclusions, rect] });
        else update({ roi: rect });
      }
      setDraft([]);
      setMode("select");
    } else setDraft(next);
  }
  function manual() {
    if (!img || draft.length < 2) return;
    const fiber: Fiber = {
      id: `M-${crypto.randomUUID().slice(0, 8)}`,
      points: draft,
      status: "accepted",
      reason: "Manuell nachgezeichnet",
      manual: true,
    };
    update({ fibers: [...img.fibers, fiber] });
    setDraft([]);
    setMode("select");
  }
  function detect(previewOnly = false) {
    if (!img || (!previewOnly && !scale)) return;
    setBusy(true);
    setError("");
    const image = new Image();
    image.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      const rgba = ctx.getImageData(0, 0, c.width, c.height).data;
      worker.current?.terminate();
      const w = new Worker(new URL("./detection.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.current = w;
      w.onmessage = ({ data }) => {
        setBusy(false);
        if (data.error) setError(data.error);
        else if (data.mask) {
          setPreview(data.mask);
        } else {
          setPreview(null);
          update({
            fibers: [...img.fibers.filter((f) => f.manual), ...data.fibers],
          });
          setSelected([]);
        }
        w.terminate();
      };
      w.onerror = () => {
        setBusy(false);
        setError("Erkennung fehlgeschlagen.");
        w.terminate();
      };
      w.postMessage(
        {
          rgba,
          width: img.width,
          height: img.height,
          image: img,
          preview: previewOnly,
        },
        [rgba.buffer],
      );
    };
    image.onerror = () => {
      setBusy(false);
      setError("Originalbild konnte nicht gelesen werden.");
    };
    image.src = img.dataUrl;
  }
  function status(value: Fiber["status"]) {
    if (img)
      update({
        fibers: img.fibers.map((f) =>
          selected.includes(f.id) ? { ...f, status: value } : f,
        ),
      });
  }
  function merge() {
    if (!img || selected.length < 2) return;
    const fibers = img.fibers.filter((f) => selected.includes(f.id));
    let points = [...fibers[0].points];
    const remaining = fibers.slice(1);
    while (remaining.length) {
      let best = Infinity,
        index = 0,
        reverse = false,
        prepend = false;
      remaining.forEach((f, i) => {
        for (const front of [false, true])
          for (const rev of [false, true]) {
            const end = front ? points[0] : points[points.length - 1],
              other = front
                ? rev
                  ? f.points[0]
                  : f.points.at(-1)!
                : rev
                  ? f.points.at(-1)!
                  : f.points[0];
            const d = distance(end, other);
            if (d < best) {
              best = d;
              index = i;
              reverse = rev;
              prepend = front;
            }
          }
      });
      const f = remaining.splice(index, 1)[0],
        p = reverse ? [...f.points].reverse() : f.points;
      points = prepend ? [...p, ...points] : [...points, ...p];
    }
    const fiber: Fiber = {
      id: `M-${crypto.randomUUID().slice(0, 8)}`,
      points,
      status: "review",
      manual: true,
      reason: "Zusammengeführt – Verbindungsstrecken prüfen",
    };
    update({
      fibers: [...img.fibers.filter((f) => !selected.includes(f.id)), fiber],
    });
    setSelected([fiber.id]);
  }
  function split() {
    if (!img || selected.length !== 1 || draft.length !== 1) return;
    const f = img.fibers.find((f) => f.id === selected[0])!;
    let k = 1,
      min = Infinity;
    f.points.slice(1, -1).forEach((p, i) => {
      const d = distance(p, draft[0]);
      if (d < min) {
        min = d;
        k = i + 1;
      }
    });
    if (f.points.length < 3) return;
    update({
      fibers: [
        ...img.fibers.filter((x) => x.id !== f.id),
        ...[f.points.slice(0, k + 1), f.points.slice(k)].map((points, i) => ({
          ...f,
          id: `${f.id}-${i + 1}`,
          points,
          status: "review" as const,
          manual: true,
          reason: "Geteilt – prüfen",
        })),
      ],
    });
    setDraft([]);
    setMode("select");
    setSelected([]);
  }
  function csv() {
    const quote = (v: string) => `"${v.replaceAll('"', '""')}"`;
    const rows = [
      [
        "Material",
        "Probe",
        "Bild",
        "Messreihe",
        "Faser-ID",
        "Laenge_mm",
        "Status",
        "Grund",
      ],
      ...project.images.flatMap((i) =>
        i.fibers.map((f) => [
          i.material,
          i.sample,
          i.name,
          i.series,
          f.id,
          String(fiberLength(i, f) ?? ""),
          f.status,
          f.reason,
        ]),
      ),
    ];
    download(
      "\uFEFF" + rows.map((r) => r.map(quote).join(";")).join("\r\n"),
      "flock-messwerte.csv",
      "text/csv;charset=utf-8",
    );
  }
  const data = groups(project.images, project.comparison.mode),
    keys = [...data.keys()],
    a = data.get(project.comparison.a) || [],
    b = data.get(project.comparison.b) || [];
  let result: ReturnType<typeof welch> | undefined,
    testError = "";
  if (!project.comparison.a || !project.comparison.b) {
    testError = "Bitte Gruppe A und Gruppe B auswählen.";
  } else if (!a.length || !b.length) {
    testError = "Mindestens eine Gruppe enthält keine gültigen Faserlängen. Kalibrierung und freigegebene Fasern prüfen.";
  } else {
    try {
      if (project.comparison.a === project.comparison.b)
        throw Error("Zwei verschiedene Gruppen auswählen.");
      if (project.comparison.mode === "series") {
        const samples = new Set(
          project.images
            .filter((i) => i.series === project.comparison.a)
            .map((i) => JSON.stringify([i.material, i.sample])),
        );
        if (
          project.images.some(
            (i) =>
              i.series === project.comparison.b &&
              samples.has(JSON.stringify([i.material, i.sample])),
          )
        )
          throw Error(
            "Die Messreihen teilen eine Probe. Ein unabhängiger Welch-Test ist dafür nicht geeignet.",
          );
      }
      result = welch(a, b, project.comparison.alpha);
    } catch (e) {
      testError = String((e as Error).message);
    }
  }
  const allValues = [...a, ...b],
    binStart = allValues.length ? Math.min(...allValues) : 0,
    binEnd = allValues.length ? Math.max(...allValues) : 1,
    binSize = Math.max((binEnd - binStart) / 20, 0.001);
  const values = img
      ? img.fibers
          .filter((f) => f.status === "accepted")
          .map((f) => fiberLength(img, f))
          .filter((v): v is number => v !== undefined)
      : [],
    stats = summarize(values);
  return (
    <div className="flock-app">
      <h1>Flock-Inspector</h1>
      <p>
        Faserlängen erkennen, kontrollieren und vergleichen. Gemessen wird die
        projizierte Länge entlang der Mittellinie.
      </p>
      <section className="controls">
        <label>
          Projektname
          <input
            value={project.name}
            disabled={busy}
            onChange={(e) => setProject({ ...project, name: e.target.value })}
          />
        </label>
        <div className="button-row">
          <label>
            Bild hinzufügen
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/bmp,image/avif"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void loadImage(f, f.name);
                e.target.value = "";
              }}
            />
          </label>
          <button disabled={busy} onClick={() => void example()}>
            Beispielbild laden
          </button>
          <button
            disabled={busy || !project.images.length}
            onClick={() =>
              guard(() =>
                download(
                  encodeProject(project).slice().buffer,
                  `${project.name.replace(/[^\p{L}\p{N}_-]/gu, "_")}.zip`,
                  "application/zip",
                ),
              )
            }
          >
            Projekt speichern
          </button>
          <label>
            Projekt laden
            <input
              type="file"
              accept=".zip"
              disabled={busy}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const p = decodeProject(
                    new Uint8Array(await f.arrayBuffer()),
                  );
                  commit(p);
                  switchImage(p.images[0]?.id || "");
                  setError("");
                } catch (err) {
                  setError(String((err as Error).message));
                }
                e.target.value = "";
              }}
            />
          </label>
          <button
            disabled={!history.length || busy}
            onClick={() => {
              const last = history.at(-1)!;
              setProject(last);
              setHistory(history.slice(0, -1));
              setDraft([]);
            }}
          >
            Rückgängig
          </button>
          <button disabled={!project.images.length} onClick={csv}>
            CSV exportieren
          </button>
        </div>
        <p>
          PNG, JPG, GIF, WebP, BMP und AVIF, soweit vom Browser unterstützt.
          Animierte Bilder werden als erstes Einzelbild importiert. Projekte
          enthalten Originalbilder und alle Auswertungsdaten; Speichern lädt
          eine Datei herunter.
        </p>
      </section>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!!project.images.length && (
        <label>
          Aktives Bild
          <select
            disabled={busy}
            value={active}
            onChange={(e) => switchImage(e.target.value)}
          >
            {project.images.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} – {i.material} / {i.sample}
              </option>
            ))}
          </select>
        </label>
      )}
      {img && (
        <>
          <section className="controls">
            <div className="input-grid">
              {(["material", "sample", "series"] as const).map((key) => (
                <label key={key}>
                  {key === "material"
                    ? "Material"
                    : key === "sample"
                      ? "Unabhängige Probe"
                      : "Messreihe"}
                  <input
                    disabled={busy}
                    value={img[key]}
                    onChange={(e) => update({ [key]: e.target.value })}
                  />
                </label>
              ))}
              <label>
                Bekannte Referenzstrecke [mm]
                <input
                  type="number"
                  min="0.000001"
                  step="any"
                  value={known}
                  onChange={(e) => setKnown(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="button-row">
              {[
                ["calibrate", "Kalibrieren (2 Punkte)"],
                ["exclude", "Bereich ausschließen (2 Ecken)"],
                ["roi", "Auswertebereich (2 Ecken)"],
                ["manual", "Faser nachzeichnen"],
                ["scale", "Maßstab verschieben"],
                ["select", "Faser auswählen"],
              ].map(([v, label]) => (
                <HelpButton
                  help={modeHelp[v]}
                  disabled={busy}
                  aria-pressed={mode === v}
                  key={v}
                  onClick={() => {
                    setMode(v);
                    setDraft([]);
                  }}
                >
                  {label}
                </HelpButton>
              ))}
            </div>
            <p aria-live="polite">
              {mode === "manual"
                ? "Entlang der Faser klicken, danach „Verlauf übernehmen“."
                : mode === "select"
                  ? "Faser anklicken; mit STRG/⌘ oder Umschalt mehrere wählen. Leertaste + Ziehen verschiebt den vergrößerten Ausschnitt."
                  : mode === "sampleColor"
                    ? "Typische Faserfarben im Originalbild anklicken; helle und dunkle Stellen aufnehmen."
                    : mode === "scale"
                      ? "Neue Position des Maßstabs anklicken."
                      : "Zwei Punkte im Bild anklicken."}{" "}
              {scale
                ? `Kalibrierung: ${fmt(scale * 1000)} µm/Pixel.`
                : "Bild ist noch nicht kalibriert."}
            </p>
            <div className="button-row">
              <button
                disabled={draft.length < 2 || mode !== "manual"}
                onClick={manual}
              >
                Verlauf übernehmen
              </button>
              <button onClick={() => setDraft([])}>Zeichnung verwerfen</button>
              <button
                disabled={selected.length !== 1}
                onClick={() => {
                  setMode("manual");
                  setDraft([]);
                }}
              >
                Ausgewählte Faser neu zeichnen
              </button>
              <button
                disabled={selected.length !== 1 || draft.length < 2}
                onClick={() => {
                  if (selected.length === 1) {
                    update({
                      fibers: img.fibers.map((f) =>
                        f.id === selected[0]
                          ? {
                              ...f,
                              points: draft,
                              manual: true,
                              status: "review",
                              reason: "Verlauf bearbeitet – prüfen",
                            }
                          : f,
                      ),
                    });
                    setDraft([]);
                    setMode("select");
                  }
                }}
              >
                Verlauf ersetzen
              </button>
              <button
                onClick={() =>
                  update({ exclusions: img.exclusions.slice(0, -1) })
                }
                disabled={!img.exclusions.length}
              >
                Letzten Ausschluss entfernen
              </button>
              <button
                disabled={!img.roi}
                onClick={() => update({ roi: undefined })}
              >
                Gesamtes Bild auswerten
              </button>
            </div>
          </section>
          <section className="controls">
            <div className="input-grid">
              <label>
                Erkennungsmodus
                <select
                  disabled={busy}
                  aria-label="Erkennungsmodus"
                  value={img.settings.mode ?? "brightness"}
                  onChange={(e) =>
                    update({
                      settings: {
                        ...img.settings,
                        mode: e.target.value as "brightness" | "color",
                      },
                    })
                  }
                >
                  <option value="brightness">Helligkeit</option>
                  <option value="color">Farbe</option>
                </select>
              </label>
              {(img.settings.mode ?? "brightness") === "color" ? (
                <>
                  <label>
                    Farbtoleranz [°]
                    <input
                      disabled={busy}
                      type="range"
                      min="1"
                      max="90"
                      value={img.settings.hueTolerance ?? 20}
                      onChange={(e) =>
                        update({
                          settings: {
                            ...img.settings,
                            hueTolerance: Number(e.target.value),
                          },
                        })
                      }
                    />
                    {img.settings.hueTolerance ?? 20}°
                  </label>
                  <label>
                    Minimale Farbsättigung [%]
                    <input
                      disabled={busy}
                      type="range"
                      min="0"
                      max="100"
                      value={(img.settings.minSaturation ?? 0.15) * 100}
                      onChange={(e) =>
                        update({
                          settings: {
                            ...img.settings,
                            minSaturation: Number(e.target.value) / 100,
                          },
                        })
                      }
                    />
                    {Math.round((img.settings.minSaturation ?? 0.15) * 100)} %
                  </label>
                  <div>
                    <HelpButton
                      disabled={busy}
                      help={modeHelp.sampleColor}
                      aria-pressed={mode === "sampleColor"}
                      onClick={() => {
                        setMode("sampleColor");
                        setDraft([]);
                        setPreview(null);
                      }}
                    >
                      Faserfarben aufnehmen
                    </HelpButton>
                    <p>
                      {img.settings.colorSamples?.length ?? 0} Farbreferenzen
                    </p>
                    <div className="color-samples">
                      {img.settings.colorSamples?.map((c, i) => (
                        <button
                          key={i}
                          disabled={busy}
                          title="Farbreferenz entfernen"
                          aria-label={`Farbreferenz ${i + 1} entfernen`}
                          style={{
                            background: `hsl(${c.h} ${c.s * 100}% 45%)`,
                          }}
                          onClick={() =>
                            update({
                              settings: {
                                ...img.settings,
                                colorSamples: img.settings.colorSamples!.filter(
                                  (_, j) => i !== j,
                                ),
                              },
                            })
                          }
                        >
                          ×
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <label>
                    Hintergrundausgleich [%]
                    <input
                      disabled={busy}
                      type="range"
                      min="0"
                      max="100"
                      value={(img.settings.backgroundStrength ?? 1) * 100}
                      onChange={(e) =>
                        update({
                          settings: {
                            ...img.settings,
                            backgroundStrength: Number(e.target.value) / 100,
                          },
                        })
                      }
                    />
                    {Math.round((img.settings.backgroundStrength ?? 1) * 100)} %
                  </label>
                  <label>
                    Umgebung für Hintergrund [Pixel]
                    <input
                      disabled={busy}
                      type="number"
                      min="3"
                      max="200"
                      value={img.settings.backgroundRadius ?? 20}
                      onChange={(e) =>
                        update({
                          settings: {
                            ...img.settings,
                            backgroundRadius: Math.max(
                              3,
                              Math.min(200, Number(e.target.value)),
                            ),
                          },
                        })
                      }
                    />
                  </label>
                </>
              )}

              <label>
                Kontrastschwelle
                <input
                  type="number"
                  min="1"
                  max="100"
                  disabled={busy || img.settings.mode === "color"}
                  value={img.settings.contrast}
                  onChange={(e) =>
                    update({
                      settings: {
                        ...img.settings,
                        contrast: Math.max(
                          1,
                          Math.min(100, Number(e.target.value)),
                        ),
                      },
                    })
                  }
                />
              </label>
              <label>
                Minimale Strukturgröße [Pixel]
                <input
                  disabled={busy}
                  type="number"
                  min="3"
                  max="100"
                  value={img.settings.minPixels}
                  onChange={(e) =>
                    update({
                      settings: {
                        ...img.settings,
                        minPixels: Math.max(
                          3,
                          Math.min(100, Number(e.target.value)),
                        ),
                      },
                    })
                  }
                />
              </label>
              <label>
                Faserkontrast
                <select
                  disabled={busy}
                  value={img.settings.polarity}
                  onChange={(e) =>
                    update({
                      settings: {
                        ...img.settings,
                        polarity: e.target.value as "dark" | "light",
                      },
                    })
                  }
                >
                  <option value="dark">
                    Dunkle Fasern auf hellem Hintergrund
                  </option>
                  <option value="light">
                    Helle Fasern auf dunklem Hintergrund
                  </option>
                </select>
              </label>
            </div>
            <div className="button-row">
              <HelpButton
                help="Zeigt die als Fasern eingestuften Pixel, bevor daraus Mittellinien und Längen entstehen. Die Vorschau verändert vorhandene Messwerte nicht."
                disabled={busy}
                onClick={() => detect(true)}
              >
                Erkennungsvorschau
              </HelpButton>
              <button onClick={() => setPreview(null)} disabled={!preview}>
                Vorschau ausblenden
              </button>
              <button disabled={!scale || busy} onClick={() => detect(false)}>
                {busy ? "Erkennung läuft …" : "Fasern erkennen / neu erkennen"}
              </button>
              {busy && (
                <button
                  onClick={() => {
                    worker.current?.terminate();
                    setBusy(false);
                  }}
                >
                  Abbrechen
                </button>
              )}
            </div>
            <p>
              Neue Erkennung ersetzt automatische Verläufe; manuelle Verläufe
              bleiben erhalten. Niedrigere Kontrastschwellen erkennen schwächere
              Fasern, aber auch mehr Störungen. Kreuzungen werden als
              prüfpflichtige Fragmente dargestellt.
            </p>
          </section>
          <div className="button-row">
            <HelpButton
              disabled={busy}
              help="Dreht die Ansicht um 90° nach links. Kalibrierung und Faserlängen bleiben erhalten."
              onClick={() => rotate(-90)}
            >
              90° links
            </HelpButton>
            <HelpButton
              disabled={busy}
              help="Dreht die Ansicht um 90° nach rechts. Die Ausrichtung wird im Projekt gespeichert."
              onClick={() => rotate(90)}
            >
              90° rechts
            </HelpButton>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              Ganzes Bild einpassen
            </button>
            <button onClick={() => setExpanded(!expanded)}>Großansicht</button>
            <label>
              <input
                type="checkbox"
                checked={overlay}
                onChange={(e) => setOverlay(e.target.checked)}
              />{" "}
              Verläufe anzeigen
            </label>
            <label>
              <input
                type="checkbox"
                checked={ids}
                onChange={(e) => setIds(e.target.checked)}
              />{" "}
              Faser-IDs
            </label>
            <label>
              Linienfarbe
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
            <label>
              Zoom (1× = ganzes Bild)
              <select
                aria-label="Zoom (1× = ganzes Bild)"
                value={zoom}
                onChange={(e) => {
                  setZoom(Number(e.target.value));
                  if (Number(e.target.value) === 1) setPan({ x: 0, y: 0 });
                }}
              >
                {[1, 1.5, 2, 3, 4].map((z) => (
                  <option key={z} value={z}>
                    {z * 100} %
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() =>
                canvas.current?.toBlob((blob) => {
                  if (blob) download(blob, "flock-auswertung.png", "image/png");
                })
              }
            >
              Ansicht als PNG exportieren
            </button>
          </div>
          <div
            ref={viewport}
            className={expanded ? "flock-canvas expanded" : "flock-canvas"}
            style={{ aspectRatio: `${imageWidth}/${imageHeight}` }}
          >
            {expanded && (
              <button className="close-view" onClick={() => setExpanded(false)}>
                Großansicht schließen
              </button>
            )}
            <canvas
              ref={canvas}
              tabIndex={0}
              style={{
                transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
              }}
              onKeyDown={(e) => {
                if (e.key === "Delete" && !busy) {
                  e.preventDefault();
                  deleteSelection();
                }
                if (e.code === "Space") {
                  e.preventDefault();
                  setSpaceHeld(true);
                }
                if (e.key === "Escape") {
                  setExpanded(false);
                  setDraft([]);
                }
              }}
              onKeyUp={(e) => {
                if (e.code === "Space") setSpaceHeld(false);
              }}
              onBlur={() => setSpaceHeld(false)}
              onPointerMove={(e) => {
                if (panStart.current)
                  setPan({
                    x:
                      panStart.current.origin.x +
                      e.clientX -
                      panStart.current.x,
                    y:
                      panStart.current.origin.y +
                      e.clientY -
                      panStart.current.y,
                  });
              }}
              onPointerUp={(e) => {
                panStart.current = null;
                if (e.currentTarget.hasPointerCapture(e.pointerId))
                  e.currentTarget.releasePointerCapture(e.pointerId);
              }}
              onPointerCancel={() => {
                panStart.current = null;
              }}
              onPointerDown={click}
              aria-label="Bildeditor. Referenzpunkte, Ausschlussbereiche und Faserverläufe durch Klicken festlegen."
            />
          </div>
          <p>
            Durchgezogen: ausgewertet · Gestrichelt: prüfen oder ausgeschlossen
            · Blau: ausgewählt. Ausschlussbereiche: rot hinterlegt. Der Maßstab
            wird erst nach der Kalibrierung erzeugt.
          </p>
          <section className="controls">
            <h2>Messreihe: {img.series}</h2>
            <p>
              {stats.n} ausgewertete Fasern · Mittelwert {fmt(stats.mean)} mm ·
              Median {fmt(stats.median)} mm · Standardabweichung {fmt(stats.sd)}{" "}
              mm · Quartile {fmt(stats.q1)} / {fmt(stats.q3)} mm
            </p>
            <p>
              {img.fibers.filter((f) => f.status === "review").length} Verläufe
              zu prüfen ·{" "}
              {img.fibers.filter((f) => f.status === "excluded").length}{" "}
              ausgeschlossen. Zielabweichung ±0,03 mm ist noch nicht validiert.
            </p>
            <div className="button-row">
              <button
                disabled={busy || !img.fibers.length}
                onClick={() => setSelected(img.fibers.map((f) => f.id))}
              >
                Alle auswählen
              </button>
              <button
                disabled={!selected.length}
                onClick={() => {
                  setSelected([]);
                  selectionAnchor.current = undefined;
                }}
              >
                Auswahl aufheben
              </button>
              <span aria-live="polite">{selected.length} ausgewählt</span>
              <button
                disabled={!selected.length}
                onClick={() => status("accepted")}
              >
                Auswahl bestätigen
              </button>
              <button
                disabled={!selected.length}
                onClick={() => status("excluded")}
              >
                Auswahl ausschließen
              </button>
              <button
                disabled={!selected.length}
                onClick={() => status("review")}
              >
                Auswahl zur Prüfung
              </button>
              <button disabled={selected.length < 2} onClick={merge}>
                Auswahl verbinden
              </button>
              <button
                disabled={selected.length !== 1}
                onClick={() => {
                  setMode("split");
                  setDraft([]);
                }}
              >
                Teilungspunkt wählen
              </button>
              <button
                disabled={mode !== "split" || draft.length !== 1}
                onClick={split}
              >
                Am Punkt teilen
              </button>
              <button
                disabled={!selected.length}
                onClick={() => {
                  update({
                    fibers: img.fibers.filter((f) => !selected.includes(f.id)),
                  });
                  setSelected([]);
                }}
              >
                Auswahl löschen
              </button>
            </div>
            <div className="flock-table">
              <table>
                <thead>
                  <tr>
                    <th>Auswahl</th>
                    {(
                      [
                        ["id", "ID"],
                        ["length", "Länge [mm]"],
                        ["status", "Status"],
                        ["reason", "Hinweis"],
                      ] as [SortKey, string][]
                    ).map(([key, label]) => (
                      <th
                        key={key}
                        aria-sort={
                          sortKey === key
                            ? descending
                              ? "descending"
                              : "ascending"
                            : "none"
                        }
                      >
                        <button
                          onClick={() => {
                            if (sortKey === key) setDescending(!descending);
                            else {
                              setSortKey(key);
                              setDescending(false);
                            }
                            selectionAnchor.current = undefined;
                          }}
                        >
                          {label}
                          {sortKey === key ? (descending ? " ▼" : " ▲") : ""}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orderedFibers.map((f) => (
                    <tr
                      key={f.id}
                      tabIndex={0}
                      aria-selected={selected.includes(f.id)}
                      onClick={(e) => {
                        if (!(e.target as HTMLElement).closest("input"))
                          chooseRow(f.id, e);
                      }}
                      onKeyDown={(e) => {
                        if ((e.target as HTMLElement).tagName === "INPUT")
                          return;
                        if (e.key === "Enter" || e.code === "Space") {
                          e.preventDefault();
                          chooseRow(f.id, e);
                        }
                      }}
                      className={selected.includes(f.id) ? "selected" : ""}
                    >
                      <td>
                        <input
                          aria-label={`${f.id} auswählen`}
                          type="checkbox"
                          onClick={(e) => {
                            e.stopPropagation();
                            chooseRow(f.id, {
                              shiftKey: e.shiftKey,
                              ctrlKey: !e.shiftKey || e.ctrlKey,
                              metaKey: e.metaKey,
                            });
                          }}
                          checked={selected.includes(f.id)}
                          onChange={() => {}}
                        />
                      </td>
                      <td>{f.id}</td>
                      <td>{fmt(fiberLength(img, f))}</td>
                      <td>
                        {f.status === "accepted"
                          ? "Ausgewertet"
                          : f.status === "review"
                            ? "Prüfen"
                            : "Ausgeschlossen"}
                      </td>
                      <td>{f.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      <section className="controls">
        <h2>Mittlere Faserlängen vergleichen</h2>
        <div className="input-grid">
          <label>
            Vergleichsebene
            <select
              value={project.comparison.mode}
              onChange={(e) =>
                setProject({
                  ...project,
                  comparison: {
                    ...project.comparison,
                    mode: e.target.value as "series" | "material",
                    a: "",
                    b: "",
                  },
                })
              }
            >
              <option value="series">Messreihen – einzelne Faserwerte</option>
              <option value="material">
                Materialien – unabhängige Probenmittelwerte
              </option>
            </select>
          </label>
          <label>
            Signifikanzniveau [%]
            <input
              type="number"
              min="0.01"
              max="99.99"
              step="0.1"
              value={project.comparison.alpha * 100}
              onChange={(e) =>
                setProject({
                  ...project,
                  comparison: {
                    ...project.comparison,
                    alpha: Math.max(
                      0.0001,
                      Math.min(0.9999, Number(e.target.value) / 100),
                    ),
                  },
                })
              }
            />
          </label>
          {(["a", "b"] as const).map((key) => (
            <label key={key}>
              Gruppe {key.toUpperCase()}
              <select
                value={project.comparison[key]}
                onChange={(e) =>
                  setProject({
                    ...project,
                    comparison: {
                      ...project.comparison,
                      [key]: e.target.value,
                    },
                  })
                }
              >
                <option value="">Bitte auswählen</option>
                {keys.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <details>
          <summary>Was macht der Welch-Test?</summary>
          <p>
            Der zweiseitige Welch-Test untersucht, ob sich zwei unabhängige
            Gruppen in ihrer mittleren Faserlänge unterscheiden.
            Unterschiedliche Gruppengrößen und Varianzen sind erlaubt. Bei
            kleinen Stichproben sollten die Werte näherungsweise normalverteilt
            sein; starke Ausreißer erfordern besondere Prüfung.
          </p>
          <p>
            Die Nullhypothese lautet: Beide Gruppen haben denselben
            Erwartungswert. Liegt der p-Wert unter dem vorgegebenen
            Signifikanzniveau, wird diese Hypothese verworfen. Ein größerer
            p-Wert beweist keine Gleichheit. Der p-Wert ist auch nicht die
            Wahrscheinlichkeit, dass die Nullhypothese wahr ist.
          </p>
          <p>
            Die Differenz A − B zeigt die Größe und Richtung des Unterschieds.
            Das Konfidenzintervall beschreibt die Unsicherheit dieser Schätzung.
            Für Materialien geht je unabhängiger Probe ein Mittelwert ein;
            mehrere Bilder derselben Probe erzeugen keine zusätzlichen
            unabhängigen Proben. Wiederholte Vergleiche erhöhen das Risiko
            zufälliger signifikanter Ergebnisse.
          </p>
        </details>
        <p>
          {project.comparison.mode === "material"
            ? "Jede Probe wird gleich gewichtet; ihre Bilder werden zuvor zusammengeführt."
            : "Aussage über die ausgewählten Messreihen. Fasern müssen unabhängig sein; Bildfelder dürfen sich nicht überlappen. Materialaussagen benötigen unabhängige Proben."}
        </p>
        {!result && (
          <div className="result" role="status">
            <strong>Vergleich nicht auswertbar</strong>
            <p>{testError}</p>
          </div>
        )}
        {result && (
          <div className="result" role="status">
            <strong>
              {result.significant
                ? "Die mittleren Faserlängen unterscheiden sich statistisch signifikant."
                : "Kein statistisch signifikanter Unterschied der mittleren Faserlängen nachgewiesen."}
            </strong>
            <p>
              n(A) = {a.length}, n(B) = {b.length} · Mittelwerte{" "}
              {fmt(summarize(a).mean)} / {fmt(summarize(b).mean)} mm
            </p>
            <p>
              A − B = {fmt(result.difference)} mm (
              {fmt((result.difference / summarize(b).mean) * 100)} % bezogen auf
              B) ·{" "}
              {(100 * (1 - project.comparison.alpha)).toLocaleString("de-DE")}
              -%-Konfidenzintervall: [{fmt(result.low)}; {fmt(result.high)}] mm
            </p>
            <p>
              p ={" "}
              {result.p < 0.0001
                ? result.p.toExponential(3)
                : result.p.toFixed(4)}{" "}
              · α = {(project.comparison.alpha * 100).toLocaleString("de-DE")} %
              · t = {fmt(result.t)} · Freiheitsgrade = {fmt(result.df)}
            </p>
          </div>
        )}
        {!!a.length && !!b.length && (
          <Chart
            title={
              project.comparison.mode === "material"
                ? "Verteilung der Probenmittelwerte"
                : "Faserlängenverteilungen"
            }
            description="Beide Gruppen auf derselben Längenachse; Histogramme als relative Häufigkeiten."
            data={[
              {
                type: "histogram",
                x: a,
                name: project.comparison.a,
                histnorm: "probability",
                xbins: {
                  start: binStart,
                  end: binEnd + binSize,
                  size: binSize,
                },
                opacity: 0.6,
              },
              {
                type: "histogram",
                x: b,
                name: project.comparison.b,
                histnorm: "probability",
                xbins: {
                  start: binStart,
                  end: binEnd + binSize,
                  size: binSize,
                },
                opacity: 0.6,
              },
            ]}
            layout={{
              barmode: "overlay",
              xaxis: { title: { text: "Länge [mm]" } },
              yaxis: { title: { text: "Relative Häufigkeit" } },
            }}
          />
        )}
      </section>
      <SupportFooter appName="Flock-Inspector" />
    </div>
  );
}
