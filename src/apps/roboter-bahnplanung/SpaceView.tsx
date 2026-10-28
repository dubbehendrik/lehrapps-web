import { useEffect, useRef, useState } from 'react';
import { poseAt, makeKernel, type Result } from './model';
import { format } from './spray';
import { colorAt } from './MapView';
type P3 = { u: number; v: number; z: number };
export default function SpaceView({ result: r, values, time, max, profile }: {
  result: Result; values: Float32Array; time: number; max: number; profile: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null), host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(800), [yaw, setYaw] = useState(-35), [pitch, setPitch] = useState(55), [zoom, setZoom] = useState(1);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  useEffect(() => {
    const observer = new ResizeObserver(entries => setSize(Math.max(200, entries[0].contentRect.width)));
    if (host.current) observer.observe(host.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = canvas.current; if (!element) return;
    const w = size, h = Math.min(500, Math.max(330, size * .62)), dpr = Math.min(2, window.devicePixelRatio || 1);
    element.width = w * dpr; element.height = h * dpr; element.style.height = `${h}px`;
    const ctx = element.getContext('2d')!; ctx.scale(dpr, dpr); ctx.fillStyle = '#fbfcfd'; ctx.fillRect(0, 0, w, h);
    const c = r.config, p = poseAt(r.path, time), k = makeKernel(c.brush);
    const cy = Math.cos(yaw * Math.PI / 180), sy = Math.sin(yaw * Math.PI / 180);
    const cp = Math.cos(pitch * Math.PI / 180), sp = Math.sin(pitch * Math.PI / 180);
    const heightFactor = profile ? Math.max(c.sheetWidth, c.sheetHeight) * .48 / max : 1;
    const rotate = (q: P3) => {
      const x = -(q.u - c.sheetWidth / 2), y = q.v - c.sheetHeight / 2;
      const xx = cy * x - sy * y, yy = sy * x + cy * y, z = q.z * heightFactor;
      return { x: xx, y: cp * yy - sp * z, depth: sp * yy + cp * z };
    };
    const points = profile ? [] : r.path.points;
    const minU = Math.min(0, ...points.map(q => q.u)), maxU = Math.max(c.sheetWidth, ...points.map(q => q.u));
    const minV = Math.min(0, ...points.map(q => q.v)), maxV = Math.max(c.sheetHeight, ...points.map(q => q.v));
    const corners = [minU, maxU].flatMap(u => [minV, maxV].flatMap(v => [0, profile ? max : c.brush.distance].map(z => rotate({ u, v, z }))));
    const lx = Math.min(...corners.map(q => q.x)), rx = Math.max(...corners.map(q => q.x));
    const ty = Math.min(...corners.map(q => q.y)), by = Math.max(...corners.map(q => q.y));
    const scale = Math.min((w - 100) / Math.max(1, rx - lx), (h - 100) / Math.max(1, by - ty)) * zoom;
    const project = (q: P3) => { const p = rotate(q); return { x: w / 2 + (p.x - (lx + rx) / 2) * scale, y: h / 2 - 10 + (p.y - (ty + by) / 2) * scale, depth: p.depth }; };
    const line = (a: P3, b: P3, color: string, width = 2, dashed = false) => {
      const aa = project(a), bb = project(b); ctx.beginPath(); ctx.moveTo(aa.x, aa.y); ctx.lineTo(bb.x, bb.y);
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dashed ? [5, 4] : []); ctx.stroke(); ctx.setLineDash([]);
    };
    const base = [{u:0,v:0,z:0},{u:c.sheetWidth,v:0,z:0},{u:c.sheetWidth,v:c.sheetHeight,z:0},{u:0,v:c.sheetHeight,z:0}];
    ctx.beginPath(); base.map(project).forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle='#edf3f6';ctx.fill();
    // Downsample only the display mesh. The integration and section grids retain full resolution.
    const stepU = profile ? 1 : Math.max(1, Math.ceil(r.u.length / 48)), stepV = profile ? 1 : Math.max(1, Math.ceil(r.v.length / 48));
    const indices = (n: number, step: number) => [...Array.from({ length: Math.ceil((n - 1) / step) }, (_, i) => i * step), n - 1];
    const iu = indices(r.u.length, stepU), iv = indices(r.v.length, stepV);
    const quads: { points: ReturnType<typeof project>[]; color: string; depth: number }[] = [];
    for (let j = 0; j < iv.length - 1; j++) for (let i = 0; i < iu.length - 1; i++) {
      const grid = [[iu[i],iv[j]],[iu[i+1],iv[j]],[iu[i+1],iv[j+1]],[iu[i],iv[j+1]]];
      const amounts = grid.map(([a,b]) => values[b*r.u.length+a]);
      const points = grid.map(([a,b],k) => project({u:r.u[a],v:r.v[b],z:profile?amounts[k]:0}));
      const color = colorAt(amounts.reduce((a,b)=>a+b,0)/4/max);
      quads.push({points,color:`rgb(${color.join(',')})`,depth:points.reduce((a,b)=>a+b.depth,0)/4});
    }
    quads.sort((a,b)=>a.depth-b.depth).forEach(q=>{
      ctx.beginPath();q.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=q.color;ctx.fill();
      ctx.strokeStyle=profile?'rgba(31,59,74,.14)':q.color;ctx.lineWidth=.55;ctx.stroke();
    });
    base.forEach((q,i)=>line(q,base[(i+1)%4],'#40576a',1));
    if (!profile) {
      const z=c.brush.distance;
      r.path.segments.forEach(s=>{
        line({...s.a,z},{...s.b,z},'#ba4352',2,!s.spray);
        if(time>s.start){const f=Math.min(1,(time-s.start)/(s.end-s.start));line({...s.a,z},{u:s.a.u+(s.b.u-s.a.u)*f,v:s.a.v+(s.b.v-s.a.v)*f,z},'#007053',3,!s.spray);}
      });
      if(p.spray&&c.brush.flow>0){
        const radius=k.radius+2.5*k.sigma,n=28,top=project({...p,z});
        const faces=Array.from({length:n},(_,i)=>{
          const a=i/n*2*Math.PI,b=(i+1)/n*2*Math.PI;
          const aa=project({u:p.u+radius*Math.cos(a),v:p.v+radius*Math.sin(a),z:0});
          const bb=project({u:p.u+radius*Math.cos(b),v:p.v+radius*Math.sin(b),z:0});
          return {aa,bb,depth:(aa.depth+bb.depth+top.depth)/3};
        });
        faces.sort((a,b)=>a.depth-b.depth).forEach(({aa,bb})=>{ctx.beginPath();ctx.moveTo(top.x,top.y);ctx.lineTo(aa.x,aa.y);ctx.lineTo(bb.x,bb.y);ctx.closePath();ctx.fillStyle='rgba(51,158,181,.10)';ctx.fill();});
      }
      line({...p,z:0},{...p,z},'#a46800',2,true);
      const tool=project({...p,z});ctx.beginPath();ctx.arc(tool.x,tool.y,7,0,Math.PI*2);ctx.fillStyle='#b27612';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
    }
    const text=(q:P3,text:string,dx=0,dy=0)=>{const p=project(q);ctx.font='13px system-ui';ctx.fillStyle='#253e50';ctx.fillText(text,p.x+dx,p.y+dy);};
    text({u:0,v:0,z:0},'0',6,16);text({u:c.sheetWidth,v:0,z:0},`u ${c.sheetWidth} mm`,-30,-12);text({u:0,v:c.sheetHeight,z:0},`v ${c.sheetHeight} mm`,8,12);
    const axisTop={u:0,v:0,z:profile?max:c.brush.distance};line({u:0,v:0,z:0},axisTop,'#536983',1,true);
    if(profile){for(const f of [.25,.5,.75]){const z=max*f;line({u:0,v:0,z},{u:12,v:0,z},'#536983',1);text({u:0,v:0,z},`${format(z)} µm`,8,0);}}
    text(axisTop,profile?`${format(max)} µm`:`${c.brush.distance} mm`,8,-8);
    ctx.font='13px system-ui';ctx.fillStyle='#526b79';ctx.fillText(profile?'Trockenschichtdicke / µm · Höhe überzeichnet':'Werkzeug und Sprühkegel symbolisch',14,h-16);
  }, [r, values, time, max, profile, size, yaw, pitch, zoom]);
  return <div ref={host} className="rb-space">
    <canvas ref={canvas} role="img" aria-label={profile?'Drehbares dreidimensionales Höhenprofil der Modell-Trockenschichtdicke in Mikrometern':'Drehbare dreidimensionale Bahn über dem Blech'}
      onPointerDown={e=>{drag.current={x:e.clientX,y:e.clientY,yaw,pitch};e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerMove={e=>{const d=drag.current;if(!d)return;setYaw(Math.max(-180,Math.min(180,d.yaw+(e.clientX-d.x)*.4)));setPitch(Math.max(20,Math.min(85,d.pitch+(e.clientY-d.y)*.3)));}}
      onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} />
    <div className="rb-space-controls"><label>Drehung {yaw.toFixed(0)}°<input type="range" min={-180} max={180} value={yaw} onChange={e=>setYaw(Number(e.target.value))}/></label>
      <label>Neigung {pitch.toFixed(0)}°<input type="range" min={20} max={85} value={pitch} onChange={e=>setPitch(Number(e.target.value))}/></label>
      <button onClick={()=>setZoom(z=>Math.min(2,z*1.2))} aria-label="3D vergrößern">+</button><button onClick={()=>setZoom(z=>Math.max(.5,z/1.2))} aria-label="3D verkleinern">−</button>
      <button onClick={()=>{setYaw(-35);setPitch(55);setZoom(1);}}>Ansicht zurücksetzen</button></div>
    <p className="rb-small">Zum Drehen ziehen oder die Regler verwenden. 3D-Darstellung ohne WebGL; im Bahnraum wird das Flächennetz zur Darstellung vereinfacht.</p>
  </div>;
}
