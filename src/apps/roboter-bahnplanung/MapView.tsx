import { useMemo, useRef } from 'react';
import { makeKernel, poseAt, type Result, type Point } from './model';
const colors = [[244,248,252],[198,228,237],[52,158,179],[22,119,111],[229,187,70],[183,70,37]];
const stops = [0,.08,.3,.55,.78,1];
export function colorAt(value: number) {
  const t = Math.max(0, Math.min(1, value));
  const k = Math.max(0, Math.min(4, stops.findIndex((s, i) => i > 0 && t <= s) - 1));
  const f = (t - stops[k]) / (stops[k+1] - stops[k]);
  return colors[k].map((v, i) => Math.round(v + f * (colors[k+1][i] - v)));
}
export default function MapView({ result: r, values, max, time, axis, cut, edge, showPath, onStart, draftStart }: {
  result: Result; values: Float32Array; max: number; time: number; axis: 'u' | 'v'; cut: number;
  edge: number; showPath: boolean; onStart?: (p: Point) => void; draftStart?: Point;
}) {
  const svg = useRef<SVGSVGElement>(null), dragging = useRef(false), c = r.config;
  const href = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = r.u.length; canvas.height = r.v.length;
    const context = canvas.getContext('2d')!; const image = context.createImageData(canvas.width, canvas.height);
    values.forEach((v, index) => {
      const j = Math.floor(index / r.u.length), i = index % r.u.length;
      const pixel = (j * r.u.length + (r.u.length - 1 - i)) * 4;
      const color = colorAt(v / max); image.data.set([...color, 255], pixel);
    });
    context.putImageData(image, 0, 0); return canvas.toDataURL();
  }, [r, values, max]);
  const points = showPath ? r.path.points : [];
  const minU = Math.min(0, ...points.map(p => p.u)) - 35, maxU = Math.max(c.sheetWidth, ...points.map(p => p.u)) + 35;
  const minV = Math.min(0, ...points.map(p => p.v)) - 35, maxV = Math.max(c.sheetHeight, ...points.map(p => p.v)) + 35;
  const worldW = maxU - minU, worldH = maxV - minV;
  const scale = Math.min(760 / worldW, 420 / worldH), x = (u: number) => 55 + (maxU - u) * scale;
  const y = (v: number) => 40 + (v - minV) * scale;
  const p = poseAt(r.path, time), kernel = makeKernel(c.brush);
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current || !onStart || !svg.current) return;
    const matrix = svg.current.getScreenCTM(); if (!matrix) return;
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
    onStart({ u: Math.round((maxU - (q.x - 55) / scale) / 5) * 5,
      v: Math.round((minV + (q.y - 40) / scale) / 5) * 5 });
  };
  return <svg ref={svg} className="rb-map" viewBox="0 0 870 520" role="img" aria-label="Auftrag auf dem Blech mit geplanter Bahn und Schnittposition"
    onPointerMove={move} onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }}>
    <rect x="0" y="0" width="870" height="520" fill="#fff" />
    <image href={href} x={x(c.sheetWidth)} y={y(0)} width={c.sheetWidth * scale} height={c.sheetHeight * scale} preserveAspectRatio="none" />
    <rect x={x(c.sheetWidth)} y={y(0)} width={c.sheetWidth * scale} height={c.sheetHeight * scale} fill="none" stroke="#344d61" strokeWidth="2" />
    {edge > 0 && <rect x={x(c.sheetWidth - edge)} y={y(edge)} width={(c.sheetWidth - 2 * edge) * scale} height={(c.sheetHeight - 2 * edge) * scale} fill="none" stroke="#212f40" strokeDasharray="3 5" />}
    {showPath && r.path.segments.map((s, i) => <line key={i} x1={x(s.a.u)} y1={y(s.a.v)} x2={x(s.b.u)} y2={y(s.b.v)} stroke="#b83b47" strokeWidth="2" strokeDasharray={s.spray ? undefined : '5 5'} />)}
    {showPath && r.path.segments.filter(s => s.start < time).map((s, i) => {
      const f = Math.min(1, (time - s.start) / (s.end - s.start));
      return <line key={i} x1={x(s.a.u)} y1={y(s.a.v)} x2={x(s.a.u + f * (s.b.u - s.a.u))} y2={y(s.a.v + f * (s.b.v - s.a.v))} stroke="#006d4f" strokeWidth="3" strokeDasharray={s.spray ? undefined : '5 5'} />;
    })}
    {axis === 'u' ? <line x1={x(0)} x2={x(c.sheetWidth)} y1={y(cut)} y2={y(cut)} stroke="#382675" strokeWidth="3" strokeDasharray="10 5" />
      : <line x1={x(cut)} x2={x(cut)} y1={y(0)} y2={y(c.sheetHeight)} stroke="#382675" strokeWidth="3" strokeDasharray="10 5" />}
    {showPath && <><circle cx={x(p.u)} cy={y(p.v)} r={Math.max(4, kernel.radius * scale)} fill="none" stroke="#9d6700" strokeWidth="2" />
      <circle cx={x(p.u)} cy={y(p.v)} r="5" fill="#9d6700" /></>}
    {showPath && r.path.points[0] && <circle cx={x((draftStart ?? r.path.points[0]).u)} cy={y((draftStart ?? r.path.points[0]).v)} r="9" fill="#e49025" stroke="#fff" strokeWidth="2"
      style={{ cursor: onStart ? 'grab' : 'default', touchAction: 'none' }} onPointerDown={e => {
        if (!onStart) return; dragging.current = true; svg.current?.setPointerCapture(e.pointerId); e.preventDefault();
      }} />}
    <g fontSize="17" fill="#344d61"><text x="25" y="22">Blech · {c.sheetWidth} × {c.sheetHeight} mm</text>
      <text x="25" y="485">u ← · v ↓ · Ursprung: Blech rechts oben</text>
      <text x="25" y="510">Rot: geplant · Grün: abgefahren · Violett: Auswerteschnitt</text></g>
  </svg>;
}
