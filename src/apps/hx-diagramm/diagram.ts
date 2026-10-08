import {
  linspace,
  saturationX,
  properties,
  diagramY,
  diagramTemperature,
  processPath,
  FREE,
  type State,
  type Process,
} from "./logic";
const colors = {
  x: "#557ee6",
  T: "#67757b",
  phi: "#1d333b",
  h: "#df5561",
  rho: "#398449",
};
type Coord = [number, number];
interface Line {
  coords: Coord[];
  color: string;
  width: number;
  dashed?: boolean;
}
interface Label {
  x: number;
  y: number;
  text: string;
  color: string;
  rotation: number;
}
export const pixel = (x: number, y: number): Coord => [
  65 + (x / 20) * 645,
  76 + ((43 - y) / 60) * 760,
];
export function coordinates(x: number, y: number) {
  return { x: ((x - 65) / 645) * 20, y: 43 - ((y - 76) / 760) * 60 };
}
let cached: { p: number; lines: Line[]; labels: Label[] } | undefined;
function grid(p: number) {
  if (cached?.p === p) return cached;
  const lines: Line[] = [],
    labels: Label[] = [];
  const add = (coords: Coord[], group: keyof typeof colors, width: number) => {
    if (coords.length) lines.push({ coords, color: colors[group], width });
  };
  const xs = linspace(0, 20, 301);
  for (let x = 0; x <= 20; x += 0.5)
    add(
      [
        [x, -17],
        [x, 43],
      ],
      "x",
      x % 2 === 0 ? 0.55 : 0.25,
    );
  for (let t = -15; t <= 40; t++)
    add(
      xs.filter((x) => x <= saturationX(t, p)).map((x) => [x, diagramY(t, x)]),
      "T",
      t % 5 === 0 ? 0.8 : 0.3,
    );
  for (let h = -10; h <= 100; h += 5) {
    const coords: Coord[] = xs
      .map((x) => [x, (h - 2.501 * x) / 1.006] as Coord)
      .filter(([, y]) => y >= -17 && y <= 43);
    add(coords, "h", h % 20 === 0 ? 0.8 : 0.35);
    if (coords.length && h % 20 === 0) {
      const best = coords.reduce((a, b) =>
        Math.abs(
          properties(diagramTemperature(a[1], a[0]), a[0], p).phi - 110,
        ) <
        Math.abs(properties(diagramTemperature(b[1], b[0]), b[0], p).phi - 110)
          ? a
          : b,
      );
      labels.push({
        x: best[0],
        y: best[1] - 0.7,
        text: `h = ${h}`,
        color: colors.h,
        rotation: 43,
      });
    }
  }
  for (const phi of [5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
    const coords: Coord[] = [];
    for (const t of linspace(-15, 40, 401)) {
      const sat = saturationX(t, p) / 1000,
        pv = (((p * 100 * sat) / (0.621945 + sat)) * phi) / 100,
        x = (1000 * 0.621945 * pv) / (p * 100 - pv);
      if (x <= 20) coords.push([x, diagramY(t, x)]);
    }
    add(coords, "phi", phi === 100 ? 1.8 : 0.8);
    if (coords.length) {
      const [x, y] = coords.at(-1)!;
      labels.push({
        x: x + 0.1,
        y: y + 0.7,
        text: `${phi} %`,
        color: colors.phi,
        rotation: 0,
      });
    }
  }
  for (let i = 0; i <= 10; i++) {
    const rho = 0.95 + i * 0.05,
      coords: Coord[] = [];
    for (const x of xs) {
      const w = x / 1000,
        t = (p * 100 * (1 + w)) / (287.042 * rho * (1 + 1.607858 * w)) - 273.15;
      if (t >= -15 && t <= 40 && x <= saturationX(t, p))
        coords.push([x, diagramY(t, x)]);
    }
    add(coords, "rho", 1.1);
    if (coords.length) {
      const [x, y] = coords[0];
      labels.push({
        x: x + 0.12,
        y: y + 0.55,
        text: `ρ = ${rho.toFixed(2)}`,
        color: colors.rho,
        rotation: 0,
      });
    }
  }
  cached = { p, lines, labels };
  return cached;
}
export function svgChart(
  p: number,
  states: (State | null)[],
  kinds: Process[],
) {
  const base = grid(p),
    lines = [...base.lines],
    arrows: string[] = [],
    messages: string[] = [];
  for (let i = 1; i < states.length; i++) {
    const a = states[i - 1],
      b = states[i];
    if (!a || !b) continue;
    try {
      const { points } = processPath(a, b, kinds[i], p),
        coords: Coord[] = points.map((s) => [s.x, diagramY(s.T, s.x)]),
        color = kinds[i] === FREE ? "#7c8990" : "#007b83";
      lines.push({ coords, color, width: 2.8, dashed: kinds[i] === FREE });
      const j = Math.max(1, Math.floor((coords.length - 1) * 0.65));
      const start =
          coords.length === 2
            ? ([
                0.55 * coords[0][0] + 0.45 * coords[1][0],
                0.55 * coords[0][1] + 0.45 * coords[1][1],
              ] as Coord)
            : coords[Math.max(0, j - 5)],
        end =
          coords.length === 2
            ? ([
                0.4 * coords[0][0] + 0.6 * coords[1][0],
                0.4 * coords[0][1] + 0.6 * coords[1][1],
              ] as Coord)
            : coords[j];
      const aa = pixel(...start),
        bb = pixel(...end),
        dx = bb[0] - aa[0],
        dy = bb[1] - aa[1],
        l = Math.hypot(dx, dy);
      if (l > 0.01) {
        const d = [dx / l, dy / l],
          n = [-d[1], d[0]];
        arrows.push(
          `<polygon points="${bb} ${bb[0] - 10 * d[0] + 4 * n[0]},${bb[1] - 10 * d[1] + 4 * n[1]} ${bb[0] - 10 * d[0] - 4 * n[0]},${bb[1] - 10 * d[1] - 4 * n[1]}" fill="${color}"/>`,
        );
      }
    } catch (e) {
      messages.push(`${i} → ${i + 1}: ${(e as Error).message}`);
    }
  }
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 920" role="img" aria-label="Mollier h-x-Diagramm"><defs><clipPath id="hx-plot"><rect x="65" y="76" width="645" height="760"/></clipPath></defs><rect width="800" height="920" rx="12" fill="white"/><g font-family="Arial, sans-serif"><text x="65" y="27" fill="#17343c" font-size="19" font-weight="bold">Mollier h,x-Diagramm</text><text x="65" y="48" fill="#67757b" font-size="12">p = ${p} hPa · Feuchte bezogen auf Wasser</text><g clip-path="url(#hx-plot)">`,
  ];
  for (const line of lines)
    out.push(
      `<polyline points="${line.coords
        .map((c) =>
          pixel(...c)
            .map((v) => v.toFixed(2))
            .join(","),
        )
        .join(
          " ",
        )}" fill="none" stroke="${line.color}" stroke-width="${line.width}"${line.dashed ? ' stroke-dasharray="7 5"' : ""}/>`,
    );
  out.push(...arrows, "</g>");
  for (const label of base.labels) {
    const [a, b] = pixel(label.x, label.y);
    out.push(
      `<text x="${a}" y="${b}" transform="rotate(${label.rotation} ${a} ${b})" fill="${label.color}" font-size="11" stroke="white" stroke-width="3" paint-order="stroke">${label.text}</text>`,
    );
  }
  for (let x = 0; x <= 20; x += 2)
    out.push(
      `<text x="${pixel(x, 0)[0]}" y="69" text-anchor="middle" fill="${colors.x}" font-size="12">${x}</text>`,
    );
  out.push(
    '<text x="710" y="48" text-anchor="end" fill="#557ee6" font-size="12">x [g/kg trockene Luft]</text>',
  );
  for (let t = -15; t <= 40; t += 5)
    out.push(
      `<text x="53" y="${pixel(0, t)[1] + 4}" text-anchor="end" fill="#17343c" font-size="12">${t}°</text>`,
    );
  out.push('<text x="15" y="77" fill="#17343c" font-size="12">T [°C]</text>');
  states.forEach((s, i) => {
    if (!s) return;
    const [a, b] = pixel(s.x, diagramY(s.T, s.x));
    out.push(
      `<g><title>Punkt ${i + 1}: T = ${s.T.toFixed(2)} °C | x = ${s.x.toFixed(3)} g/kg | φ = ${s.phi.toFixed(2)} % | h = ${s.h.toFixed(2)} kJ/kg | ρ = ${s.rho.toFixed(4)} kg/m³</title><circle cx="${a}" cy="${b}" r="7" fill="#007b83" stroke="white" stroke-width="2"/><text x="${a + 11}" y="${b - 9}" fill="#00585e" font-size="15" font-weight="bold" stroke="white" stroke-width="3" paint-order="stroke">${i + 1}</text></g>`,
    );
  });
  out.push(
    '<text x="65" y="866" fill="#67757b" font-size="12">T: Temperatur · x: Wasserdampfbeladung · φ: relative Feuchte</text><text x="65" y="887" fill="#67757b" font-size="12">h [kJ/kg trockene Luft] · ρ [kg/m³ feuchte Luft]</text></g></svg>',
  );
  return { svg: out.join(""), messages };
}
