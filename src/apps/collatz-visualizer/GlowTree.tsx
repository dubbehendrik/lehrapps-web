import { useEffect, useRef, useState } from 'react';
import { includePath, makeGlowPath, type Bounds, type GlowPath } from './glowTree';

const limit = 9999;
const width = 1100, height = 680, padding = 42;
const format = (n: number) => n.toLocaleString('de-DE');
type Progress = { prepared: number; drawn: number; currentSteps: number; bestStart: number; bestSteps: number; phase: 'preparing'|'ready'|'running'|'paused'|'finished'|'error' };
const initial: Progress = {prepared:0,drawn:0,currentSteps:0,bestStart:1,bestSteps:0,phase:'preparing'};

export default function GlowTree() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const data = useRef<{paths: GlowPath[]; bounds: Bounds; maxSteps: number} | null>(null);
  const background = useRef<HTMLCanvasElement | null>(null);
  const frame = useRef(0), current = useRef(0), best = useRef({start:1,steps:0});
  const [progress, setProgress] = useState<Progress>(initial);
  const [speed, setSpeed] = useState(60);
  const speedRef = useRef(speed); speedRef.current = speed;
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true, next = 1, maxSteps = 0;
    const paths: GlowPath[] = [], bounds = {minX:0,maxX:0,minY:0,maxY:0};
    const prepare = () => {
      if (!alive) return;
      try {
        const end = Math.min(next + 99, limit);
        for (; next <= end; next++) { const p = makeGlowPath(next); paths.push(p); includePath(bounds,p); maxSteps=Math.max(maxSteps,p.steps); }
        setProgress(prev => ({...prev,prepared:next-1}));
        if (next <= limit) frame.current = requestAnimationFrame(prepare);
        else { data.current = {paths,bounds,maxSteps}; setProgress(prev => ({...prev,phase:'ready'})); }
      } catch (e) { setError(e instanceof Error ? e.message : 'Berechnung fehlgeschlagen.'); setProgress(prev => ({...prev,phase:'error'})); }
    };
    frame.current = requestAnimationFrame(prepare);
    return () => { alive=false; cancelAnimationFrame(frame.current); };
  }, []);

  function trace(ctx: CanvasRenderingContext2D, path: GlowPath, color: string, lineWidth: number) {
    const geometry = data.current; if (!geometry) return;
    const {minX,maxX,minY,maxY} = geometry.bounds;
    const scale = Math.min((width-2*padding)/(maxX-minX || 1),(height-2*padding)/(maxY-minY || 1));
    const left = (width - (maxX-minX)*scale)/2 - minX*scale;
    const top = (height - (maxY-minY)*scale)/2 - minY*scale;
    const xy = path.coordinates;
    ctx.beginPath(); ctx.moveTo(left + xy[0]*scale, top + xy[1]*scale);
    for(let i=2;i<xy.length;i+=2) ctx.lineTo(left+xy[i]*scale,top+xy[i+1]*scale);
    ctx.strokeStyle=color; ctx.lineWidth=lineWidth; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.stroke();
  }
  function render(last?: GlowPath) {
    const target=canvas.current, buffer=background.current; if (!target || !buffer) return;
    const ctx=target.getContext('2d'); if (!ctx) return;
    ctx.fillStyle='#06122d'; ctx.fillRect(0,0,width,height); ctx.drawImage(buffer,0,0);
    if (last) { ctx.save(); ctx.shadowColor='#fff7a8'; ctx.shadowBlur=8; trace(ctx,last,'#fff8a6',2.2); ctx.restore(); }
  }
  function step() {
    const geometry=data.current, buffer=background.current; if (!geometry || !buffer) return;
    const ctx=buffer.getContext('2d'); if (!ctx) return;
    const end=Math.min(current.current+speedRef.current,geometry.paths.length);
    while(current.current<end) {
      const p=geometry.paths[current.current++];
      const t=p.steps / geometry.maxSteps;
      trace(ctx,p,`hsla(${210 + t*115}, 100%, ${60+t*10}%, 0.13)`,0.75);
      if(p.steps>best.current.steps) best.current={start:p.start,steps:p.steps};
    }
    const last=geometry.paths[current.current-1]; render(last);
    setProgress(prev=>({...prev,drawn:current.current,currentSteps:last?.steps ?? 0,bestStart:best.current.start,bestSteps:best.current.steps,phase:current.current===limit?'finished':'running'}));
    if(current.current<limit) frame.current=requestAnimationFrame(step);
  }
  function begin() {
    if(!data.current) return;
    if(current.current===limit) reset();
    if(!background.current) { background.current=document.createElement('canvas'); background.current.width=width; background.current.height=height; }
    setProgress(p=>({...p,phase:'running'})); cancelAnimationFrame(frame.current); frame.current=requestAnimationFrame(step);
  }
  function pause() { cancelAnimationFrame(frame.current); setProgress(p=>({...p,phase:'paused'})); }
  function reset() {
    cancelAnimationFrame(frame.current); current.current=0; best.current={start:1,steps:0};
    background.current?.getContext('2d')?.clearRect(0,0,width,height);
    canvas.current?.getContext('2d')?.clearRect(0,0,width,height);
    setProgress(p=>({...p,drawn:0,currentSteps:0,bestStart:1,bestSteps:0,phase:data.current?'ready':'preparing'}));
  }
  function download() { const c=canvas.current; if(!c)return; const a=document.createElement('a'); a.href=c.toDataURL('image/png'); a.download='collatz-leuchtbaum.png'; a.click(); }
  const busy=progress.phase==='preparing';
  return <section className="collatz-glow"><h2>Animierter Collatz-Leuchtbaum</h2>
    <p>Für die Startzahlen 1 bis 9.999 werden reguläre Collatz-Folgen bis zur ersten 1 berechnet und rückwärts von der 1 aus gezeichnet. Gleiche Folgenabschnitte verlaufen auf derselben Linie. Gerade Vorgänger biegen leicht nach links, ungerade stärker nach rechts. Die Richtung und Länge der Linien sind eine grafische Gestaltung, keine Werteachsen.</p>
    <p>Die Farbe zeigt die Gesamtlänge der Folge: kurze Wege blau, lange violett bis pink. Der zuletzt gezeichnete Weg ist hell hervorgehoben. Die Auswertung ist auf diesen Startwertbereich begrenzt und kein Beweis der Vermutung.</p>
    <div className="collatz-glow-controls"><button onClick={begin} disabled={busy || progress.phase==='running' || progress.phase==='error'}>{progress.phase==='paused'?'Fortsetzen':progress.phase==='finished'?'Erneut starten':'Starten'}</button><button onClick={pause} disabled={progress.phase!=='running'}>Pause</button><button onClick={reset} disabled={busy || progress.phase==='error'}>Zurücksetzen</button><button onClick={download} disabled={!progress.drawn}>Bild als PNG</button><label>Geschwindigkeit: {speed} Wege pro Bild<input type="range" min="1" max="200" step="1" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/></label></div>
    <div className="collatz-glow-stats" aria-live="polite"><span>{busy?`Vorbereitet: ${format(progress.prepared)} / ${format(limit)}`:`Startzahl: ${format(progress.drawn)}`}</span><span>Weg zur 1: {format(progress.currentSteps)} Schritte</span><span>Längster bisher: {format(progress.bestStart)} ({format(progress.bestSteps)} Schritte)</span><span>{progress.phase==='finished'?'Abgeschlossen':progress.phase==='paused'?'Pausiert':''}</span></div>
    {error && <p role="alert">{error}</p>}
    <div className="collatz-glow-frame"><canvas ref={canvas} width={width} height={height} role="img" aria-label={`Animierter Collatz-Baum. ${format(progress.drawn)} Startzahlen gezeichnet; längster bisher ${format(progress.bestStart)} mit ${progress.bestSteps} Schritten.`}/><div className="collatz-glow-legend"><span>Kürzer</span><span className="collatz-glow-gradient" aria-hidden="true"/><span>Länger</span><span>Heller Weg: zuletzt gezeichnet</span></div></div>
  </section>;
}
