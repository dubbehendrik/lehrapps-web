import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Chart } from '../../components/Chart';
import { SupportFooter } from '../../components/SupportFooter';
import MapView from './MapView';
import { SCENARIOS, INITIAL, makeKernel, makePath, poseAt, section, simulate, stats, validate, valuesAt,
  type Result, type Scenario, type Settings } from './model';
import './style.css';
const SpaceView = lazy(() => import('./RobotScene'));
const STORAGE = 'lehrapps-roboter-demo-v1';
const fmt = (x: number, digits = 1) => x.toLocaleString('de-DE', { maximumFractionDigits: Math.min(1, digits), ...(x !== 0 && Math.abs(x) < .1 ? { notation: 'scientific' as const } : {}) });
const COPY = 'Didaktisches Auftragsmodell: Spritzbild und Parameterwirkungen beruhen auf frei gewählten mathematischen Annahmen, nicht auf einem physikalischen oder kalibrierten Anlagenmodell. Keine Vorhersage des realen Beschichtungsprozesses.';
class SpaceBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p className="rb-notice">Die 3D-Ansicht ist in diesem Browser nicht verfügbar. Bahn und Auftrag lassen sich weiter in 2D untersuchen.</p> : this.props.children; }
}
function NumberField({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
}) {
  return <label>{label}<input type="number" value={value} min={min} max={max} step={step}
    onChange={e => { const v = Number(e.target.value); if (Number.isFinite(v)) onChange(v); }} /></label>;
}
function Slider({ label, value, min, max, step = 1, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return <label className="rb-slider"><span>{label} <strong>{fmt(value)} {unit}</strong></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /></label>;
}
function legend(max: number) {
  return <div className="rb-scale"><div className="rb-scale-bar" /><div><span>0</span><span>{fmt(max / 2)} AE</span><span>{fmt(max)} AE</span></div></div>;
}
export default function App() {
  const [config, setConfig] = useState<Settings>(() => structuredClone(INITIAL));
  const [result, setResult] = useState<Result>(() => simulate(INITIAL));
  const [time, setTime] = useState(() => makePath(INITIAL).duration), [playing, setPlaying] = useState(false);
  const [tempo, setTempo] = useState(1), [view, setView] = useState<'2d' | '3d' | 'profile'>('2d');
  const [axis, setAxis] = useState<'u' | 'v'>('u'), [cutFraction, setCutFraction] = useState(.5);
  const [edge, setEdge] = useState(20), [showPath, setShowPath] = useState(true);
  const [reference, setReference] = useState<Result | null>(null), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(''), [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const dirty = JSON.stringify(config) !== JSON.stringify(result.config), errors = validate(config);
  const values = useMemo(() => valuesAt(result, time), [result, time]);
  const refValues = reference?.frames[80].values;
  const max = Math.max(.01, result.max, reference?.max ?? 0);
  const cut = cutFraction * (axis === 'u' ? result.config.sheetHeight : result.config.sheetWidth);
  const maxEdge = Math.max(0, Math.min(result.config.sheetWidth, result.config.sheetHeight) / 2 - 10);
  const effectiveEdge = Math.min(edge, maxEdge);
  const metrics = useMemo(() => stats(result, values, effectiveEdge), [result, values, effectiveEdge]);
  const refMetrics = useMemo(() => reference && stats(reference, reference.frames[80].values, effectiveEdge), [reference, effectiveEdge]);
  const currentPose = poseAt(result.path, time), kernel = makeKernel(errors.length ? result.config.brush : config.brush);
  useEffect(() => {
    if (!playing) return;
    let id = 0, last = performance.now(), accumulated = 0;
    const tick = (now: number) => {
      accumulated += Math.min(.25, (now - last) / 1000); last = now;
      if (accumulated >= .10) {
        const dt = accumulated; accumulated = 0;
        setTime(t => { const next = Math.min(result.path.duration, t + dt * tempo); if (next >= result.path.duration) setPlaying(false); return next; });
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick); return () => cancelAnimationFrame(id);
  }, [playing, result, tempo]);
  const change = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setPlaying(false); setConfig(c => ({ ...c, [key]: value })); setMessage('');
  };
  const calculate = (c = config) => {
    if (busy) return; setPlaying(false); setBusy(true); setError('');
    timer.current = setTimeout(() => {
      try { const r = simulate(c); setResult(r); setTime(0); setMessage('Versuch berechnet. Mit „Start“ den Auftrag aufbauen oder den Zeitregler bewegen.'); }
      catch (e) { setError((e as Error).message); }
      finally { setBusy(false); }
    }, 20);
  };
  const scenario = (s: Scenario) => {
    const next = { ...config, scenario: s };
    if (s === 'spot') { next.startU = config.sheetWidth / 2; next.startV = config.sheetHeight / 2; }
    else if (config.scenario === 'spot') { next.startU = -60; next.startV = -60; next.width = config.sheetWidth + 120; next.height = config.sheetHeight + 120; }
    setConfig(next); setPlaying(false); setMessage('');
  };
  const field = (key: 'sheetWidth' | 'sheetHeight' | 'startU' | 'startV' | 'width' | 'height' | 'pitchU' | 'pitchV' | 'speed' | 'hold' | 'wedgeEnd', label: string, min: number, max: number, step = 1) =>
    <NumberField key={key} label={label} value={config[key]} min={min} max={max} step={step} onChange={v => change(key, v)} />;
  const fit = () => { setPlaying(false); setConfig(c => ({ ...c, startU: -60, startV: -60, width: c.sheetWidth + 120, height: c.sheetHeight + 120, signU: 1, signV: 1 })); };
  const x = axis === 'u' ? result.u : result.v;
  const cutData = section(result, values, axis, cut);
  const brushName = (r: Result) => {
    const c = r.config, staticPart = `${SCENARIOS[c.scenario]} · LL ${c.brush.air} % · ${c.brush.voltage} kV · ${c.brush.distance} mm · ${c.brush.flow} ml/min`;
    if (c.scenario === 'spot') return `${staticPart} · ${c.hold} s`;
    const raster = !['line', 'lineHold'].includes(c.scenario);
    return `${staticPart} · ${c.speed} mm/s${c.scenario === 'lineHold' ? ` · ${c.hold} s halten` : ''}${raster ? ` · Sollabstand u/v ${c.pitchU}/${c.pitchV} mm` : ` · ${c.lineAxis === 'horizontal' ? 'horizontal' : 'vertikal'}`}`;
  };
  const compareCompatible = !reference || reference.config.sheetWidth === result.config.sheetWidth && reference.config.sheetHeight === result.config.sheetHeight;
  return <article className="rb-app">
    <p className="eyebrow">Fokus: Labor · Virtueller Beschichtungsversuch</p>
    <h1>Roboter Bahnplanung <span>(Demo)</span></h1>
    <p className="rb-lead">Brush einstellen, Spritzbild verstehen, Bahnen variieren – und den Auftrag auf dem Blech vergleichen.</p>
    <aside className="rb-notice"><strong>Lehrmodell · keine reale Roboterbahnplanung</strong><p>{COPY} Die Darstellung bestätigt weder Erreichbarkeit noch Kollisionsfreiheit oder Ausführbarkeit am Roboter.</p></aside>
    <div className="rb-steps" aria-label="Versuchsablauf"><span>1 <b>Brush & Szenario</b></span><span>2 <b>Auftrag verfolgen</b></span><span>3 <b>Schnitte vergleichen</b></span></div>
    <div className="rb-layout">
      <aside className="rb-settings" aria-label="Versuchseinstellungen">
        <h2>1 · Versuch einstellen</h2>
        <label>Szenario<select value={config.scenario} onChange={e => scenario(e.target.value as Scenario)}>
          {Object.entries(SCENARIOS).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
        </select></label>
        {['line', 'lineHold'].includes(config.scenario) && <label>Einzelbahnrichtung<select value={config.lineAxis} onChange={e => change('lineAxis', e.target.value as Settings['lineAxis'])}><option value="horizontal">Horizontal</option><option value="vertical">Vertikal</option></select></label>}
        <fieldset><legend>Brush · Modellparameter</legend>
          <Slider label="Lenkluft · relative Einstellung" value={config.brush.air} min={0} max={100} unit="%" onChange={v => change('brush', { ...config.brush, air: v })} />
          <Slider label="Hochspannung" value={config.brush.voltage} min={0} max={100} unit="kV" onChange={v => change('brush', { ...config.brush, voltage: v })} />
          <NumberField label="Werkstückabstand (mm)" value={config.brush.distance} min={100} max={500} step={10} onChange={v => change('brush', { ...config.brush, distance: v })} />
          <NumberField label="Fördermenge (ml/min)" value={config.brush.flow} min={0} max={500} step={10} onChange={v => change('brush', { ...config.brush, flow: v })} />
          <p className="rb-small">Rotationssymmetrisch. Mehr Lenkluft bündelt hier das Spritzbild. Hochspannung erhöht den angenommenen Auftragsanteil und verändert die Form leicht. Diese Kennlinien sind frei gewählt.</p>
          <button type="button" onClick={() => scenario('spot')}>Brush stationär untersuchen</button>
        </fieldset>
        <fieldset><legend>Blech & Bewegung</legend><div className="rb-two">
          {field('sheetWidth', 'Blechbreite (mm)', 100, 1200, 10)}{field('sheetHeight', 'Blechhöhe (mm)', 100, 1200, 10)}
          {config.scenario !== 'spot' && field('speed', 'Geschwindigkeit (mm/s)', 10, 1000, 10)}
          {['spot', 'lineHold'].includes(config.scenario) && field('hold', config.scenario === 'spot' ? 'Spritzdauer (s)' : 'Haltezeit im Zentrum (s)', .2, 20, .2)}
        </div></fieldset>
        <details open><summary>Bahngeometrie & Variation</summary>
          <div className="rb-two">{(!['line', 'lineHold'].includes(config.scenario) || config.lineAxis === 'horizontal') && field('startU', 'Start u (mm)', -1600, 1600, 5)}
            {(!['line', 'lineHold'].includes(config.scenario) || config.lineAxis === 'vertical') && field('startV', 'Start v (mm)', -1600, 1600, 5)}
            {config.scenario !== 'spot' && config.scenario !== 'lineHold' && (config.scenario !== 'line' || config.lineAxis === 'horizontal') && field('width', 'Bahnbreite (mm)', 10, 1600, 10)}
            {config.scenario === 'line' && config.lineAxis === 'vertical' && field('height', 'Bahnhöhe (mm)', 10, 1600, 10)}
            {!['spot', 'line', 'lineHold'].includes(config.scenario) && <>
              {field('height', 'Bahnhöhe (mm)', 10, 1600, 10)}
              {['vertical', 'cross'].includes(config.scenario) && field('pitchU', 'Sollabstand u (mm)', 10, 500, 5)}
              {config.scenario !== 'vertical' && field('pitchV', 'Sollabstand v (mm)', 10, 500, 5)}
            </>}
          </div>
          {config.scenario !== 'spot' && config.scenario !== 'lineHold' && (config.scenario !== 'line' || config.lineAxis === 'horizontal') && <label>Start in u-Richtung<select value={config.signU} onChange={e => change('signU', Number(e.target.value) as 1 | -1)}><option value={1}>Nach links (+u)</option><option value={-1}>Nach rechts (−u)</option></select></label>}
          {config.scenario === 'line' && config.lineAxis === 'vertical' && <label>Start in v-Richtung<select value={config.signV} onChange={e => change('signV', Number(e.target.value) as 1 | -1)}><option value={1}>Nach unten (+v)</option><option value={-1}>Nach oben (−v)</option></select></label>}
          {!['spot', 'line', 'lineHold'].includes(config.scenario) && <>
            <label>Start in v-Richtung<select value={config.signV} onChange={e => change('signV', Number(e.target.value) as 1 | -1)}><option value={1}>Nach unten (+v)</option><option value={-1}>Nach oben (−v)</option></select></label>
            <label className="rb-check"><input type="checkbox" checked={config.coatTurns} onChange={e => change('coatTurns', e.target.checked)} /> Auch beim Wenden applizieren</label>
            <button onClick={fit}>Bahnrechteck um Blech legen · 60 mm Überlauf</button>
            <p className="rb-small">Beide Rechteckgrenzen erhalten eine Bahn. Der tatsächliche Abstand wird gleichmäßig an die Abmessungen angepasst. Keil: örtlich veränderlicher Abstand.</p>
          </>}
          {config.scenario === 'wedge' && field('wedgeEnd', 'Enddichte relativ zum Start (%)', 25, 300, 5)}
          {['line', 'lineHold'].includes(config.scenario) && <p className="rb-small">Einzelbahn durch die Blechmitte. „Bis Zentrum + Halten“ endet immer im Blechzentrum.</p>}
          <p className="rb-small">u nach links, v nach unten; Ursprung rechts oben am Blech. Bei stationärem Versuch und Flächenbahnen lässt sich der orangefarbene Startpunkt in 2D ziehen. Anschließend neu berechnen.</p>
        </details>
        {!!errors.length && <div className="error" role="alert">{errors.map(e => <p key={e}>{e}</p>)}</div>}
        <button className="rb-primary" disabled={busy || !!errors.length} onClick={() => calculate()}>{busy ? 'Auftrag wird berechnet …' : dirty ? 'Änderungen berechnen' : 'Versuch neu starten'}</button>
        <div className="rb-save"><button onClick={() => {
          try { localStorage.setItem(STORAGE, JSON.stringify({ schema: 1, config })); setMessage('Versuchsstand in diesem Browser gespeichert.'); }
          catch { setError('Der Browser erlaubt das Speichern dieses Versuchsstands nicht.'); }
        }} disabled={!!errors.length}>Stand merken</button><button onClick={() => {
          try { const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null'); if (saved?.schema !== 1 || !saved.config?.brush || validate(saved.config).length) throw Error();
            setConfig(saved.config); setPlaying(false); setMessage('Gemerkter Stand geladen. Zum Anwenden „Änderungen berechnen“ wählen.');
          } catch { setError('Kein gültiger Versuchsstand in diesem Browser vorhanden.'); }
        }}>Stand laden</button><button onClick={() => { const c = structuredClone(INITIAL); setConfig(c); setView('2d'); calculate(c); }}>Beispiel zurücksetzen</button></div>
        <p className="rb-small">„Stand merken“ speichert nur die Einstellungen in diesem Browser.</p>
      </aside>
      <section className="rb-results" aria-label="Versuchsergebnis">
        <div className="rb-result-heading"><h2>2 · Auftrag verfolgen</h2><span className="rb-badge">{SCENARIOS[result.config.scenario]}</span></div>
        {dirty && <p className="rb-dirty" role="status">Einstellungen geändert. Die Ansichten zeigen noch den zuletzt berechneten Versuch.</p>}
        {message && <p className="rb-message" role="status">{message}</p>}{error && <p className="error" role="alert">{error}</p>}
        <section className="rb-player" aria-label="Zeitsteuerung">
          <div className="button-row"><button className="rb-primary" disabled={busy || dirty} onClick={() => { if (time >= result.path.duration) setTime(0); setPlaying(!playing); }}>{playing ? 'Pause' : 'Start'}</button>
            <button onClick={() => { setPlaying(false); setTime(0); }}>Von vorn</button>
            <button onClick={() => { setPlaying(false); setTime(t => Math.min(result.path.duration, t + result.path.duration / 80)); }}>Einzelschritt +</button>
            <button onClick={() => { setPlaying(false); setTime(result.path.duration); }}>Endergebnis</button>
            <label>Tempo<select value={tempo} onChange={e => setTempo(Number(e.target.value))}><option value={.5}>0,5×</option><option value={1}>1×</option><option value={2}>2×</option><option value={5}>5×</option></select></label>
          </div>
          <label className="rb-time">Zeit: {fmt(time, 1)} / {fmt(result.path.duration, 1)} s · {currentPose.phase}
            <input aria-label="Versuchszeit" type="range" min={0} max={result.path.duration} step={result.path.duration / 160} value={time} onChange={e => { setPlaying(false); setTime(Number(e.target.value)); }} /></label>
          <p className="rb-small">Nur Applikation und Umsetzen bei konstantem Vorschub. Gelenkstellungen dienen der Anschauung; keine reale Bewegungs-, Beschleunigungs- oder Steuerungssimulation.</p>
        </section>
        <div className="rb-tabs" role="group" aria-label="Ansicht wählen">{([['2d', 'Blech & Bahn · 2D'], ['3d', 'Roboter & Auftrag · 3D'], ['profile', 'Schichtwachstum · 3D']] as const).map(([v, title]) => <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{title}</button>)}</div>
        <figure className="rb-mainplot"><figcaption><h3>{view === '2d' ? 'Bahn und relativer Auftrag auf dem Blech' : view === '3d' ? 'Roboter, Aufhängung und wachsender Auftrag' : 'Schichtwachstum auf dem zentral aufgehängten Blech'}</h3>
          <p>{view === 'profile' ? 'Die Auftragsschicht wächst räumlich aus dem Blech heraus. Die Höhe ist überzeichnet und entspricht keiner realen Schichtdicke. Zeitregler bewegen oder „Von vorn“ und „Start“ wählen.' : view === '3d' ? 'Originale CAD-Modelle von Roboter, EcoBell und Werkstückaufhängung. Das Blech hängt zentral; die berechnete Auftragsschicht wächst überhöht aus seiner Oberfläche. Sprühstrahlen und Gelenkbewegung dienen der Anschauung.' : 'Die gestrichelte violette Linie zeigt den Schnitt. Orange: Startpunkt; bei stationärem Versuch und Flächenbahnen ziehbar. Änderungen anschließend berechnen.'}</p></figcaption>
          {view === '2d' ? <><MapView result={result} values={values} max={max} time={time} axis={axis} cut={cut} edge={effectiveEdge} showPath={showPath}
            draftStart={config.scenario === result.config.scenario && !['line', 'lineHold'].includes(config.scenario) ? { u: config.startU, v: config.startV } : undefined}
            onStart={config.scenario !== result.config.scenario || config.sheetWidth !== result.config.sheetWidth || config.sheetHeight !== result.config.sheetHeight || ['line', 'lineHold'].includes(config.scenario) ? undefined : p => { setPlaying(false); setConfig(c => ({ ...c, startU: Math.max(-1600, Math.min(1600, p.u)), startV: Math.max(-1600, Math.min(1600, p.v)) })); }} />
            <label className="rb-check"><input type="checkbox" checked={showPath} onChange={e => setShowPath(e.target.checked)} /> Bahn und Spritzkreis einblenden</label>{legend(max)}</>
            : <><SpaceBoundary><Suspense fallback={<p>3D-Ansicht wird geladen …</p>}><SpaceView result={result} values={values} max={max} time={time} profile={view === 'profile'} /></Suspense></SpaceBoundary>{legend(max)}</>}
        </figure>
        <dl className="rb-metrics"><div><dt>Applikationszeit</dt><dd>{fmt(result.path.sprayDuration, 1)} s</dd></div><div><dt>Bewegungsstrecke</dt><dd>{fmt(result.path.length / 1000)} m</dd></div><div><dt>Auf Blech · Modell, final</dt><dd>{fmt(result.supplied ? result.captured / result.supplied * 100 : 0, 1)} %</dd></div></dl>
        {config.scenario === 'spot' && <section className="rb-profile-preview"><h3>Stationäres Spritzbild · Schnitt durch das Zentrum</h3>
          <p className="rb-small">Vorschau der aktuellen Brush-Einstellung auf einer unendlich ausgedehnten Ebene. Zeitlicher Aufbau auf dem endlichen Blech oben nach „Änderungen berechnen“.</p>
          <Chart title="Doppelhöcker im diametralen Schnitt" description="Ein Schnitt durch die rotationssymmetrische Ringverteilung. Die Kurve wird nicht auf ihr eigenes Maximum normiert."
            data={[{ type: 'scatter', mode: 'lines', name: 'Modellprofil', x: Array.from({ length: 301 }, (_, i) => (i / 300 * 2 - 1) * kernel.support),
              y: Array.from({ length: 301 }, (_, i) => kernel.density(Math.abs((i / 300 * 2 - 1) * kernel.support)) * config.brush.flow / 150 * kernel.eta * config.hold * 10000), line: { color: '#00776b', width: 3 } }]}
            layout={{ xaxis: { title: { text: 'Abstand vom Zentrum / mm' }, range: [-kernel.support, kernel.support] }, yaxis: { title: { text: 'Relativer Auftrag / AE' }, rangemode: 'tozero' }, showlegend: false }} />
        </section>}
        <section className="rb-analysis"><h2>3 · Schichtverteilung auswerten</h2>
          <p>Auswertung des relativen Auftrags. Ohne Kalibrierung entspricht AE keiner Schichtdicke in µm.</p>
          <div className="rb-analysis-controls"><label>Schnittrichtung<select value={axis} onChange={e => setAxis(e.target.value as 'u' | 'v')}><option value="u">Horizontal · entlang u</option><option value="v">Vertikal · entlang v</option></select></label>
            <Slider label={`Schnittposition ${axis === 'u' ? 'v' : 'u'}`} value={cut} min={0} max={axis === 'u' ? result.config.sheetHeight : result.config.sheetWidth} unit="mm" onChange={v => setCutFraction(v / (axis === 'u' ? result.config.sheetHeight : result.config.sheetWidth))} />
            <Slider label="Rand von Statistik ausschließen" value={effectiveEdge} min={0} max={maxEdge} step={5} unit="mm" onChange={setEdge} /></div>
          <Chart title={`Auftragsschnitt entlang ${axis}`} description={`Aktueller Versuch bei ${fmt(time, 1)} s. ${reference ? 'Referenz A zeigt stets den abgeschlossenen Versuch.' : 'Schnittposition über den Schieberegler verändern.'}`}
            data={[{ type: 'scatter', mode: 'lines', x, y: cutData, name: 'Aktueller Versuch B', line: { color: '#00776b', width: 3 } },
              ...(reference && compareCompatible ? [{ type: 'scatter' as const, mode: 'lines' as const,
                x: axis === 'u' ? reference.u : reference.v, y: section(reference, reference.frames[80].values, axis, cut), name: 'Referenz A · final', line: { color: '#9a4a17', width: 3, dash: 'dash' as const } }] : [])]}
            layout={{ xaxis: { title: { text: `${axis} / mm` }, range: [0, axis === 'u' ? result.config.sheetWidth : result.config.sheetHeight] },
              yaxis: { title: { text: 'Relativer Auftrag / AE' }, range: [0, max * 1.05] }, legend: { orientation: 'h', y: -.3 } }} />
          <dl className="rb-metrics"><div><dt>Mittelwert</dt><dd>{fmt(metrics.mean, 3)} AE</dd></div><div><dt>Minimum / Maximum</dt><dd>{fmt(metrics.min, 3)} / {fmt(metrics.max, 3)} AE</dd></div><div><dt>Variationskoeffizient</dt><dd>{metrics.mean ? `${fmt(metrics.cv, 1)} %` : '– (kein Auftrag)'}</dd></div></dl>
          <p className="rb-small">Statistik der aktuellen Zeit innerhalb der gestrichelt umrandeten Fläche, mit {fmt(effectiveEdge)} mm Randabstand. Gleichmäßigkeit allein beschreibt keine ausreichende Auftragsmenge.</p>
          <div className="button-row"><button disabled={dirty || busy} onClick={() => { setReference(result); setPlaying(false); setMessage('Berechnetes Endergebnis als Referenz A festgehalten. Jetzt einen Parameter ändern und neu berechnen.'); }}>Endergebnis als Referenz A festhalten</button>
            {reference && <button onClick={() => setReference(null)}>Referenz entfernen</button>}</div>
          {reference && <section className="rb-comparison"><h3>A/B-Vergleich · gemeinsame Farb- und Höhenskala</h3><p><strong>A:</strong> {brushName(reference)}</p><p><strong>B:</strong> {brushName(result)}</p>
            {!compareCompatible && <p className="rb-notice">Die Blechabmessungen unterscheiden sich. Ein gemeinsamer Schnitt wäre irreführend und wird deshalb nicht eingeblendet. Für einen kontrollierten Vergleich dieselbe Geometrie verwenden.</p>}
            <figure><figcaption><h3>Referenz A · abgeschlossen</h3></figcaption><MapView result={reference} values={refValues!} max={max} time={reference.path.duration} axis={axis} cut={cutFraction * (axis === 'u' ? reference.config.sheetHeight : reference.config.sheetWidth)} edge={compareCompatible ? effectiveEdge : 0} showPath={false} />{legend(max)}</figure>
            {refMetrics && compareCompatible && <p>Referenz A: Mittelwert {fmt(refMetrics.mean, 3)} AE · Variationskoeffizient {refMetrics.mean ? `${fmt(refMetrics.cv, 1)} %` : '–'}.</p>}
          </section>}
        </section>
      </section>
    </div>
    <details className="rb-help"><summary>Modellannahmen, Kennlinien und Grenzen</summary>
      <p>{COPY}</p>
      <p>Das Spritzbild ist die rotationssymmetrische Überlagerung eines Gaußrings und eines zentralen Gaußprofils. Der Flächeninhalt unter dem Profil wird auf 1 normiert. Eine Verbreiterung erzeugt damit keine zusätzliche Materialmenge.</p>
      <p>Mit a = Lenkluft/100, e = Hochspannung/100 und d = Werkstückabstand in mm gelten die frei gewählten Kennlinien:</p>
      <ul><li>Ringradius R = d · (0,38 − 0,16a) · (1 − 0,08e).</li><li>Ringbreite σ = d · (0,085 − 0,025a); Breite des zentralen Profils = 1,8σ.</li><li>Gewicht des Ringprofils = 0,92 − 0,16e. Die beiden Profilanteile werden anschließend gemeinsam flächennormiert.</li><li>Angenommener Auftragsanteil η = 0,30 + 0,55e. Kein real gemessener Wirkungsgrad.</li></ul>
      <p>Der lokale Auftrag wird als AE = ∫ (Fördermenge / 150 ml/min) · η · normiertes Spritzbild · 10 000 mm² · dt aufsummiert. AE ist eine relative Demonstrationsgröße mit festem Bezugsmaßstab. Die verbleibende Modellmenge landet außerhalb des Blechs oder wird durch den angenommenen Auftragsanteil nicht abgeschieden. Der ausgewiesene Blechanteil bezieht sich auf die gesamte zugeführte Modellmenge bei eingeschaltetem Spritzen.</p>
      <p>Die Projektion erfolgt senkrecht auf ein ebenes Blech bei konstantem Abstand. Es gibt keine elliptische Verformung, keine Tropfenflug-, Elektrostatik-, Lenkluftströmungs-, Randfeld-, Abschattungs-, Ablauf- oder Trocknungssimulation. Kurven und Farben sind keine Messdaten.</p>
      <p>Die geometrischen Szenarien und originalen CAD-Modelle stammen aus dem Bahnplanungstool. Das Blech hängt zentral an der Aufhängung. Die Gelenkstellungen werden nur zur Veranschaulichung berechnet. Nicht darstellbare Stellungen werden gemeldet; die Auftragsrechnung bleibt davon unabhängig. Maschinenprogramme werden weder eingelesen noch erzeugt. Es gibt keine Kollisionsprüfung oder Steuerungsfreigabe.</p>
      <p>Numerik des berechneten Versuchs: {result.u.length} × {result.v.length} Flächenelemente ({fmt(result.du)} × {fmt(result.dv)} mm), {result.integrationSteps} Integrationsschritte. Materialauftrag am Zellzentrum, 81 gespeicherte Zeitstände; Zwischenzeiten werden linear interpoliert. Zellraster und Zeitschritte können kleine Abweichungen verursachen.</p>
    </details>
    <details className="rb-help"><summary>Drei kurze Lernversuche</summary><ol>
      <li><strong>Stationär:</strong> Brushversuch berechnen, 3D-Auftragsprofil öffnen und die Zeit von 0 bis zur Endzeit bewegen. Danach den Abstand ändern. Werden Spritzbild und Maximalauftrag größer oder kleiner?</li>
      <li><strong>Überlagerung:</strong> Horizontalen Mäander als A festhalten. Nur den Bahnabstand reduzieren, neu berechnen und Endergebnisse vergleichen. Mittelwert, Streuung und Versuchsdauer gemeinsam bewerten.</li>
      <li><strong>Rand und Wenden:</strong> Auftrag beim Wenden aus- und einschalten. Schnitte an den Blechrand verschieben. Danach den Überlauf verändern. Wo entstehen lokale Maxima oder Unterauftrag?</li>
    </ol></details>
    <SupportFooter appName="Roboter Bahnplanung (Demo)" reviewed={false} />
  </article>;
}
