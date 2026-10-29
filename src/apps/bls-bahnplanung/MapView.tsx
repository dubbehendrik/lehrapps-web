import { useEffect, useRef } from 'react';
import { brush, colorAt, type Params, type Pose, type Result } from './model';
export default function MapView({ p, pose, z, max, log, r, axis, fraction, showCut }: {
  p: Params; pose: Pose; z: Float32Array; max: number; log: boolean; r: Result; axis: 'x' | 'y'; fraction: number; showCut: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current; if (!el) return;
    const ctx = el.getContext('2d')!; el.width = 1000; el.height = 640;
    ctx.fillStyle = '#f4f7fa'; ctx.fillRect(0, 0, 1000, 640);
    // Follow the translating carriage; the physical sheet rotates, nozzle and machine path move relative to it.
    const scale = Math.min(2.1, 470 / (Math.max(p.width, p.height) + 2 * p.over + 30));
    const angle = pose.angle - Math.PI / 2;
    const projectSheet = (x: number, y: number) => ({ x: 500 + scale * (Math.cos(angle) * x - Math.sin(angle) * y), y: 320 + scale * (Math.sin(angle) * x + Math.cos(angle) * y) });
    ctx.save(); ctx.translate(500, 320); ctx.rotate(-Math.PI / 2); ctx.scale(scale, scale);
    for (const s of r.segments) {
      if (!['Beschichtungsbahn', 'Düsenversatz'].includes(s.b.phase)) continue;
      ctx.strokeStyle = '#8098a8'; ctx.lineWidth = 1 / scale; ctx.setLineDash(s.b.phase === 'Düsenversatz' ? [4, 4] : []);
      ctx.beginPath(); ctx.moveTo(s.a.x, s.a.y); ctx.lineTo(s.b.x, s.b.y); ctx.stroke();
    }
    ctx.restore();
    ctx.save(); ctx.translate(500, 320); ctx.rotate(angle); ctx.scale(scale, scale);
    for (let j = 0; j < r.ny; j++) for (let i = 0; i < r.nx; i++) {
      ctx.fillStyle = colorAt(z[j * r.nx + i], max, log);
      ctx.fillRect(-p.width / 2 + i * r.dx, -p.height / 2 + j * r.dy, r.dx + .1, r.dy + .1);
    }
    ctx.setLineDash([]); ctx.strokeStyle = '#173748'; ctx.lineWidth = 2 / scale; ctx.strokeRect(-p.width / 2, -p.height / 2, p.width, p.height);
    if (showCut) {
      ctx.strokeStyle = '#673b9e'; ctx.lineWidth = 2 / scale; ctx.setLineDash([5 / scale, 3 / scale]); ctx.beginPath();
      if (axis === 'x') { const y = (fraction - .5) * p.height; ctx.moveTo(-p.width / 2, y); ctx.lineTo(p.width / 2, y); }
      else { const x = (fraction - .5) * p.width; ctx.moveTo(x, -p.height / 2); ctx.lineTo(x, p.height / 2); } ctx.stroke();
    }
    ctx.restore();
    // Nozzle position is expressed in the machine frame, cap orientation independent of sheet rotation.
    ctx.save(); ctx.translate(500 + pose.y * scale, 320 - pose.x * scale); ctx.rotate((p.orientation - 90) * Math.PI / 180);
    const b = brush(p); ctx.strokeStyle = pose.on ? '#007b45' : '#687e8d'; ctx.lineWidth = 3; ctx.setLineDash(pose.on ? [] : [5, 4]);
    ctx.beginPath(); ctx.ellipse(0, 0, b.sx * 2 * scale, b.sy * 2 * scale, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle; ctx.fill(); ctx.restore();
    const origin = projectSheet(-p.width / 2, -p.height / 2);
    const arrow = (x: number, y: number, label: string) => {
      const b = projectSheet(x, y), a = Math.atan2(b.y - origin.y, b.x - origin.x);
      ctx.strokeStyle = '#122f43'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - 12 * Math.cos(a - .4), b.y - 12 * Math.sin(a - .4)); ctx.lineTo(b.x - 12 * Math.cos(a + .4), b.y - 12 * Math.sin(a + .4)); ctx.closePath(); ctx.fillStyle = '#122f43'; ctx.fill();
      ctx.font = 'bold 19px system-ui'; ctx.fillText(label, b.x + 14, b.y - 10);
    };
    arrow(p.width / 2 + 30, -p.height / 2, `x / mm (${p.width})`); arrow(-p.width / 2, p.height / 2 + 30, `y / mm (${p.height})`);
    ctx.font = '17px system-ui'; ctx.fillText('0', origin.x - 20, origin.y + 22);
    ctx.font = '18px system-ui'; ctx.fillStyle = '#24485d'; ctx.fillText('Draufsicht folgt der Werkstückaufnahme · Pfeile werkstückfest', 24, 30);
    ctx.fillText('Spritzbildkontur: 2σ · Bahn durchgezogen / Versatz gestrichelt', 24, 610);
  }, [p, pose, z, max, log, r, axis, fraction, showCut]);
  return <canvas className="bls-map" ref={canvas} role="img" aria-label="Draufsicht des hochkant dargestellten Blechs mit werkstückfesten x- und y-Pfeilen, Drehung und Spritzbild" />;
}
