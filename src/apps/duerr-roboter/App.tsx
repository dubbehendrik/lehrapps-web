import { useEffect, useMemo, useState } from 'react';
import { SupportFooter } from '../../components/SupportFooter';
import { download } from '../../lib/download';
import { REFERENCE_BASE64, REFERENCE_NAME } from './reference';
import { applyPlan, changedBrushes, exportDocument, fields, importDocument, makePlan, patchBrush, readBrush, type Axis, type Brush, type Document, type Key } from './logic';
import './style.css';
const reference = () => importDocument(REFERENCE_NAME, Uint8Array.from(atob(REFERENCE_BASE64), c => c.charCodeAt(0)));
const editable = (b: Brush): Brush => ({...b, BLL1: Math.round(b.BLL1 * 100) / 100, BLL2: Math.round(b.BLL2 * 100) / 100});
const noteKey = (d: Document) => JSON.stringify([d.readme, d.user, d.date]);
const fmt = (key: Key, n: number) => n.toLocaleString('de-DE', {minimumFractionDigits: key.startsWith('BLL') ? 2 : 0, maximumFractionDigits: key.startsWith('BLL') ? 2 : 0});
function NumberField({label, value, set, min = 0, max, step = 1}: {label: string; value: number; set: (n: number) => void; min?: number; max: number; step?: number}) {
  return <label>{label}<input type="number" value={Number.isNaN(value) ? '' : value} min={min} max={max} step={step} onChange={e => set(e.target.value === '' ? NaN : Number(e.target.value))}/></label>;
}
export default function App() {
  const [doc, setDoc] = useState<Document>(reference);
  const [baselineNotes, setBaselineNotes] = useState(() => noteKey(reference()));
  const [history, setHistory] = useState<Uint8Array[]>(() => [reference().original]);
  const [cursor, setCursor] = useState(0);
  const bytes = history[cursor];
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const [selected, setSelected] = useState(100), [edit, setEdit] = useState<Brush>(() => editable(readBrush(bytes, 100)));
  const [showProtected, setShowProtected] = useState(false), [onlyChanged, setOnlyChanged] = useState(false), [page, setPage] = useState(0);
  const [source, setSource] = useState(2), [start, setStart] = useState(100), [count, setCount] = useState(10);
  const [mode, setMode] = useState<'paired' | 'combinations'>('paired');
  const [axes, setAxes] = useState<Axis[]>(fields.map((f, i) => ({key:f.key, enabled:i < 2, from: i < 2 ? 0.5 : 0, to:i < 2 ? 2 : 0, count:10})));
  const [preview, setPreview] = useState(false), [overwrite, setOverwrite] = useState(false);
  const [zipName, setZipName] = useState(`Duerr_Brushes_${new Date().toLocaleDateString('sv-SE')}`);
  const changed = useMemo(() => changedBrushes(doc.original, bytes), [doc.original, bytes]);
  const rows = Array.from({length: showProtected ? 500 : 401}, (_, i) => i + (showProtected ? 1 : 100)).filter(n => !onlyChanged || changed.includes(n));
  const pages = Math.max(1, Math.ceil(rows.length / 25)), currentPage = Math.min(page, pages - 1);
  const planned = useMemo(() => {try { return {rows: makePlan(bytes, source, start, count, mode, axes), error:''}; } catch(e) {return {rows:[], error: String((e as Error).message)};}}, [bytes, source, start, count, mode, axes]);
  const occupied = planned.rows.filter(row => fields.some(f => readBrush(bytes, row.n)[f.key] !== 0)).map(row => row.n);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (changed.length || noteKey(doc) !== baselineNotes) {event.preventDefault(); event.returnValue = '';}};
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [changed.length, doc, baselineNotes]);
  function run(action: () => void) {setError(''); setMessage(''); try {action();} catch(e) {setError((e as Error).message);}}
  function commit(next: Uint8Array, notice: string) {
    if (next.some((b, i) => b !== bytes[i])) {setHistory([...history.slice(0, cursor + 1), next]); setCursor(cursor + 1);}
    setEdit(editable(readBrush(next, selected))); setPreview(false); setOverwrite(false); setMessage(notice);
  }
  function load(next: Document) {
    setDoc(next); setBaselineNotes(noteKey(next)); setHistory([next.original]); setCursor(0); setEdit(editable(readBrush(next.original, selected))); setPreview(false); setOverwrite(false); setPage(0); setMessage(`Geladen: ${next.name}`);
  }
  function confirmReplace() {return (changed.length === 0 && noteKey(doc) === baselineNotes) || window.confirm('Brush-Änderungen und Notizen dieses Arbeitsstands werden ersetzt. Vorher bei Bedarf als ZIP exportieren. Neue Datei laden?');}
  async function importFile(file?: File) {
    if (!file) return;
    try {setError(''); if (file.size > 8 * 1024 * 1024) throw Error('Import ist größer als 8 MB.'); const next = importDocument(file.name, new Uint8Array(await file.arrayBuffer())); if (confirmReplace()) load(next);} catch(e) {setError((e as Error).message);}
  }
  function select(n: number) {setSelected(n);setEdit(editable(readBrush(bytes,n)));}
  function undo(delta: number) {const next = cursor + delta; setCursor(next); setEdit(editable(readBrush(history[next], selected))); setPreview(false);setOverwrite(false);setMessage('');setError('');}
  const axisChange = (index: number, patch: Partial<Axis>) => {setAxes(axes.map((a,i) => i === index ? {...a,...patch} : a));setPreview(false);setOverwrite(false);};
  return <div className="duerr-app">
    <h1>Dürr Roboter</h1>
    <aside className="duerr-warning" role="note"><strong>Vorläufige Version · Testphase</strong><p>Der Brush-Editor befindet sich in der Erprobung. Exportierte Werte vor der Verwendung am Roboter mit der geplanten Brush-Tabelle abgleichen. Ein erfolgreicher Export bestätigt nicht die Eignung der Parameter für den Lackierprozess.</p></aside>
    <details className="duerr-description"><summary>Programmbeschreibung und Bedienung</summary>
      <p>Brush-Editor für die Dürr-Brush-Tabelle mit 500 Einträgen. Brushes 1–99 sind geschützt, Brushes 100–500 können bearbeitet werden. Die bereitgestellte Originaldatei ist beim Start geladen. Alternativ können eigene Dateien desselben Formats oder exportierte ZIP-Archive geladen werden. Die Verarbeitung erfolgt lokal im Browser.</p>
      <p>Eine Versuchsreihe übernimmt die fünf Parameter eines Ausgangsbrushs und variiert ausgewählte Parameter linear. „Gemeinsam“ erzeugt Wertepaarungen, „Alle Kombinationen“ das vollständige Raster. Beide Intervallgrenzen sind enthalten. Drücke werden auf 0,01 bar, andere Größen auf ganze Zahlen gerundet; dadurch können gleiche Werte entstehen. HV erlaubt nur 0 oder 100–400 µA.</p>
      <p>Der ZIP-Export enthält die Roboterdatei mit unverändertem Namen, README.md, Nutzer/Datum in brush-editor.json und Aenderungen.csv als Vergleich zum letzten Import. Für den Roboter die Brush-Datei aus dem ZIP entpacken. Nur diese Datei wird dort importiert. Notizen werden nicht in die Roboterdatei geschrieben. Der unbekannte Anfangsblock und die reservierten Datenbereiche bleiben erhalten.</p>
      <p>Änderungen und Notizen bleiben bis zum Neuladen der Seite im Arbeitsspeicher. Zum Aufbewahren als ZIP exportieren. Ein Bahnplaner ist für eine spätere Erweiterung vorgesehen.</p>
    </details>
    <section className="duerr-panel"><h2>1. Datei und Arbeitsstand</h2><p className="duerr-filename">{doc.name}</p><div className="duerr-toolbar">
      <label className="duerr-file">Brush-Datei / ZIP importieren<input type="file" onChange={e => {void importFile(e.target.files?.[0]);e.target.value='';}}/></label>
      <button onClick={() => run(() => {if(confirmReplace())load(reference());})}>Referenzdatei laden</button>
      <button disabled={cursor === 0} onClick={() => undo(-1)}>Rückgängig</button><button disabled={cursor === history.length - 1} onClick={() => undo(1)}>Wiederholen</button>
    </div><p><strong>{changed.length}</strong> Brushes gegenüber dem Import verändert · 401 bearbeitbare Einträge</p></section>
    <div aria-live="polite">{error && <p role="alert" className="duerr-error">{error}</p>}{message && <p className="duerr-success">{message}</p>}</div>
    <section className="duerr-panel"><h2>2. Einzelnen Brush bearbeiten</h2><div className="duerr-inputs"><NumberField label="Brush-Nummer" value={selected} min={1} max={500} set={n => {if(Number.isInteger(n)&&n>=1&&n<=500)select(n);}}/>
      {fields.map(f => <NumberField key={f.key} label={`${f.key} (${f.unit})`} value={edit[f.key]} max={f.max} step={f.step} set={n => setEdit({...edit,[f.key]:n})}/>)}</div>
      <p className="duerr-hint">BLL1/BLL2: 0–6,00 bar · ML1: 0–70.000 U/min · FM: 0–900 cm³/min · HV: 0 oder 100–400 µA</p>
      {selected < 100 ? <p>Dieser Brush ist geschützt. Seine Werte können als Ausgangspunkt einer Versuchsreihe verwendet werden.</p> : <div className="duerr-toolbar"><button className="primary" onClick={() => run(() => {
        const old=editable(readBrush(bytes,selected)); const patch:Partial<Brush>={};for(const f of fields) {const x=edit[f.key]; if(x!==old[f.key])patch[f.key]=x;} commit(patchBrush(bytes,selected,patch),`Brush ${selected} übernommen.`);
      })}>Brush übernehmen</button><button onClick={() => run(() => {const next=bytes.slice();next.set(doc.original.slice(selected*24,(selected+1)*24),selected*24);commit(next,`Brush ${selected} auf Importstand zurückgesetzt.`);})}>Auf Importstand zurücksetzen</button></div>}
    </section>
    <section className="duerr-panel"><h2>3. Versuchsreihe erzeugen</h2><div className="duerr-inputs">
      <NumberField label="Ausgangsbrush" value={source} set={n => {setSource(n);setPreview(false);}} min={1} max={500}/><NumberField label="Erste Zielnummer" value={start} set={n => {setStart(n);setPreview(false);}} min={100} max={500}/>
      <label>Variation<select value={mode} onChange={e=>{setMode(e.target.value as typeof mode);setPreview(false);setOverwrite(false);}}><option value="paired">Gemeinsam</option><option value="combinations">Alle Kombinationen</option></select></label>
      {mode==='paired'&&<NumberField label="Anzahl Brushes (inkl. Grenzen)" value={count} set={n=>{setCount(n);setPreview(false);}} min={1} max={401}/>}
    </div><p>Unveränderte Parameter aus Brush {source}: {Number.isInteger(source)&&source>=1&&source<=500 ? fields.map(f=>`${f.key} ${fmt(f.key,readBrush(bytes,source)[f.key])} ${f.unit}`).join(' · ') : 'ungültige Nummer'}</p>
    <div className="duerr-scroll"><table><thead><tr><th>Variieren</th><th>Parameter</th><th>Von</th><th>Bis</th>{mode==='combinations'&&<th>Anzahl Werte</th>}</tr></thead><tbody>{axes.map((a,i)=>{const f=fields[i];return <tr key={a.key}><td><input type="checkbox" aria-label={`${a.key} variieren`} checked={a.enabled} onChange={e=>axisChange(i,{enabled:e.target.checked})}/></td><th scope="row">{a.key} ({f.unit})</th><td><input aria-label={`${a.key} von`} type="number" disabled={!a.enabled} value={Number.isNaN(a.from)?'':a.from} min={0} max={f.max} step={f.step} onChange={e=>axisChange(i,{from:e.target.value===''?NaN:Number(e.target.value)})}/></td><td><input aria-label={`${a.key} bis`} type="number" disabled={!a.enabled} value={Number.isNaN(a.to)?'':a.to} min={0} max={f.max} step={f.step} onChange={e=>axisChange(i,{to:e.target.value===''?NaN:Number(e.target.value)})}/></td>{mode==='combinations'&&<td><input aria-label={`${a.key} Anzahl Werte`} disabled={!a.enabled} type="number" min={1} max={401} value={Number.isNaN(a.count)?'':a.count} onChange={e=>axisChange(i,{count:e.target.value===''?NaN:Number(e.target.value)})}/></td>}</tr>;})}</tbody></table></div>
    <p className="duerr-hint">Auflösung: 0,01 bar bzw. ganze Zahlen. Jede Reihe wird vor der Übernahme geprüft.</p>
    <button onClick={()=>run(()=>{if(planned.error)throw Error(planned.error);setPreview(true);setOverwrite(false);})}>Vorschau erstellen</button>
    {preview&&<div className="duerr-preview"><h3>{planned.rows.length} Brushes · {start}–{start+planned.rows.length-1}</h3><p>{occupied.length} Zielbrushes sind bereits belegt.</p><div className="duerr-scroll duerr-preview-table"><table><thead><tr><th>Brush</th>{fields.map(f=><th key={f.key}>{f.key}: bisher → neu ({f.unit})</th>)}</tr></thead><tbody>{planned.rows.map(row=><tr key={row.n}><th>{row.n}</th>{fields.map(f=><td key={f.key}>{fmt(f.key,readBrush(bytes,row.n)[f.key])} → <strong>{fmt(f.key,row.values[f.key])}</strong></td>)}</tr>)}</tbody></table></div>
      {occupied.length>0&&<label className="duerr-check"><input type="checkbox" checked={overwrite} onChange={e=>setOverwrite(e.target.checked)}/>Die {occupied.length} belegten Zielbrushes überschreiben.</label>}
      <button className="primary" disabled={occupied.length>0&&!overwrite} onClick={()=>run(()=>commit(applyPlan(bytes,planned.rows),`${planned.rows.length} Brushes übernommen.`))}>Versuchsreihe übernehmen</button></div>}
    </section>
    <section className="duerr-panel"><h2>4. Brush-Tabelle</h2><div className="duerr-toolbar"><label className="duerr-check"><input type="checkbox" checked={showProtected} onChange={e=>{setShowProtected(e.target.checked);setPage(0);}}/>Geschützte Brushes 1–99 anzeigen</label><label className="duerr-check"><input type="checkbox" checked={onlyChanged} onChange={e=>{setOnlyChanged(e.target.checked);setPage(0);}}/>Nur geänderte Brushes</label></div>
    <div className="duerr-scroll"><table><thead><tr><th>Brush</th>{fields.map(f=><th key={f.key}>{f.key} ({f.unit})</th>)}<th>Status</th><th>Bearbeiten</th></tr></thead><tbody>{rows.slice(currentPage*25,currentPage*25+25).map(n=><tr key={n} className={changed.includes(n)?'duerr-changed':''}><th scope="row">{n}</th>{fields.map(f=><td key={f.key}>{fmt(f.key,readBrush(bytes,n)[f.key])}</td>)}<td>{n<100?'Geschützt':changed.includes(n)?'Geändert':'Importstand'}</td><td><button onClick={()=>{select(n);document.querySelector('.duerr-inputs')?.scrollIntoView({behavior:'smooth',block:'center'});}}>Brush {n} wählen</button></td></tr>)}</tbody></table></div>
      {!rows.length&&<p>Keine geänderten Brushes.</p>}<div className="duerr-toolbar"><button disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Zurück</button><span>Seite {currentPage+1} / {pages}</span><button disabled={currentPage===pages-1} onClick={()=>setPage(currentPage+1)}>Weiter</button></div>
    </section>
    <section className="duerr-panel"><h2>5. Notizen und ZIP-Export</h2><div className="duerr-inputs"><label>Nutzer<input value={doc.user} onChange={e=>setDoc({...doc,user:e.target.value})}/></label><label>Datum<input type="date" value={doc.date} onChange={e=>setDoc({...doc,date:e.target.value})}/></label><label>ZIP-Dateiname<input value={zipName} onChange={e=>setZipName(e.target.value)}/></label></div>
    <button onClick={()=>setZipName([doc.user||'Duerr',doc.date,'Brushes'].join('_'))}>ZIP-Namen aus Nutzer und Datum bilden</button>
    <label>README.md · Anwendung, Versuchsbedingungen und Notizen<textarea rows={8} value={doc.readme} placeholder={'# Anwendung\n\nLack / Bauteil / Versuchsbedingungen / Hinweise'} onChange={e=>setDoc({...doc,readme:e.target.value})}/></label>
    <p>Im ZIP bleibt der Name der Roboterdatei unverändert: <strong className="duerr-filename">{doc.name}</strong>. Vor dem Import am Roboter entpacken.</p>
    <button className="primary" onClick={()=>run(()=>{const name=zipName.trim().replace(/\.zip$/i,'');if(!name||/[<>:"/\\|?*\x00-\x1f]/.test(name)||/[. ]$/.test(name))throw Error('Bitte einen gültigen ZIP-Dateinamen ohne Pfad- oder Sonderzeichen eingeben.');const out=exportDocument(doc,bytes);download(new Blob([out as BlobPart],{type:'application/zip'}),`${name}.zip`);setMessage('ZIP erstellt. Roboterdatei, README und Änderungsübersicht sind enthalten.');})}>ZIP exportieren</button>
    </section>
    <SupportFooter appName="Dürr Roboter" reviewed={false}/>
  </div>;
}
