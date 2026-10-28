import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Chart } from '../../components/Chart';
import { SupportFooter } from '../../components/SupportFooter';
import MapView from './MapView';
import { SCENARIOS, INITIAL, makeKernel, makePath, poseAt, section, simulate, stats, validate, valuesAt,
  type Result, type Scenario, type Settings } from './model';
import { thicknessRate, format as fmt, modelNotes, RECONSTRUCTION } from './spray';
import ProfileView from './SpaceView';
import ProgramFormulas from './ProgramFormulas';
import './style.css';
const SpaceView = lazy(() => import('./RobotScene'));
const STORAGE = 'lehrapps-roboter-demo-v2-micrometre';
const COPY = 'Generischer 2K-Lack · generischer Hochrotationszerstäuber. Literaturgestütztes Näherungsmodell für Trockenschichtdicken in µm. Die Parametertrends dienen der Lehre; keine kalibrierte Prognose für eine konkrete Anlage.';
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
  return <div className="rb-scale"><div className="rb-scale-bar" /><div><span>0</span><span>{fmt(max / 2)} µm</span><span>{fmt(max)} µm</span></div></div>;
}
export default function App() {
  const [config, setConfig] = useState<Settings>(() => structuredClone(INITIAL));
  const [result, setResult] = useState<Result>(() => simulate(INITIAL));
  const [time, setTime] = useState(() => makePath(INITIAL).duration), [playing, setPlaying] = useState(false);
  const [tempo, setTempo] = useState(1), [view, setView] = useState<'2d' | '3d' | 'profile'>('2d');
  const [axis, setAxis] = useState<'u' | 'v'>('u'), [cutFraction, setCutFraction] = useState(.5);
  const [edge, setEdge] = useState(20), [showPath, setShowPath] = useState(true);
  const [showCabin, setShowCabin] = useState(true), [transparentWalls, setTransparentWalls] = useState(true), [showCut, setShowCut] = useState(true);
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
  const calculate = (c = config, keepTime = dirty) => {
    if (busy) return; const fraction = Math.min(1, time / Math.max(result.path.duration, 1e-12)); setPlaying(false); setBusy(true); setError('');
    timer.current = setTimeout(() => {
      try { const r = simulate(c); setResult(r); setTime(keepTime ? fraction * r.path.duration : 0); setMessage(keepTime ? 'Versuch aktualisiert. Die relative Zeitposition wurde beibehalten.' : 'Versuch berechnet. Mit „Start“ den Auftrag aufbauen oder den Zeitregler bewegen.'); }
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
    const c = r.config, staticPart = `${SCENARIOS[c.scenario]} · LL innen/außen ${fmt(c.brush.innerAir)}/${fmt(c.brush.outerAir)} Nl/min · ${fmt(c.brush.rpm)} 1/min · FK ${fmt(c.brush.solids)} Vol.% · ${c.brush.voltage} kV · ${c.brush.distance} mm · ${c.brush.flow} ml/min`;
    if (c.scenario === 'spot') return `${staticPart} · ${c.hold} s`;
    const raster = !['line', 'lineHold'].includes(c.scenario);
    return `${staticPart} · ${c.speed} mm/s${c.scenario === 'lineHold' ? ` · ${c.hold} s halten` : ''}${raster ? ` · Sollabstand u/v ${c.pitchU}/${c.pitchV} mm` : ` · ${c.lineAxis === 'horizontal' ? 'horizontal' : 'vertikal'}`}`;
  };
  const compareCompatible = !reference || reference.config.sheetWidth === result.config.sheetWidth && reference.config.sheetHeight === result.config.sheetHeight;
  return <article className="rb-app">
    <p className="eyebrow">Fokus: Labor · Virtueller Beschichtungsversuch</p>
    <h1>Roboter Bahnplanung <span>(Demo)</span></h1>
    <details className="rb-program-info"><summary>Programmbeschreibung, Formeln und Modellgrenzen</summary>
      <p>Brush einstellen, Spritzbild untersuchen und den zeitlichen Schichtaufbau auf stationären und bewegten Bahnen vergleichen. Der violette Schnitt wird in 2D und in beiden 3D-Ansichten an derselben Position dargestellt.</p>
      <p>{COPY} CAD und TCP-Bewegung dienen der Anschauung; keine Bestätigung von Erreichbarkeit oder Kollisionsfreiheit.</p>
      <ProgramFormulas/>
      <p>Quelle: Nico Güttler (2024), „Methodik für numerische Lackiersimulationen: Bedeutung der Modell- und Eingangsparameter bei der Hochrotationszerstäubung“. Referenzprofil: Abb. A.1, ABB RB1000 SSD, Brush 1; Parameterreihen: Abb. A.7–A.11; Stoffdaten: Tab. 3.4. Diese konkrete Literaturkombination dient als Ausgangspunkt des generischen Modells, nicht als Kalibrierung des dargestellten CAD-Werkzeugs.</p>
      <p>Die Einzelbahn wurde aus den PDF-Vektorlinien ausgelesen und spiegelsymmetrisch gemittelt. Eine positive, geglättete radiale Verteilung wurde so angepasst, dass ihr Linienintegral bei 150 mm/s das Einzelbahnprofil reproduziert. Es wurde nicht das Einzelbahnprofil um seine Achse rotiert.</p>
      <Chart title="Kontrolle: stationären Kern wieder zur Einzelbahn integrieren" description={`Referenz: 250 ml/min, 57 Vol.% Festkörper, 150 mm/s. Anpassungsabweichung ${fmt(RECONSTRUCTION.curves.measured.wmapePercent)} % wMAPE; keine Prognosegenauigkeit.`}
        data={[{type:'scatter',mode:'lines',x:RECONSTRUCTION.xMm,y:RECONSTRUCTION.curves.measured.observedSymmetric,name:'Literaturprofil · symmetrisiert',line:{color:'#9a4a17',dash:'dash'}}, {type:'scatter',mode:'lines',x:RECONSTRUCTION.xMm,y:RECONSTRUCTION.curves.measured.forward,name:'Rückintegrierter Kern',line:{color:'#00776b'}}]}
        layout={{xaxis:{title:{text:'Querposition / mm'}},yaxis:{title:{text:'Trockenschichtdicke / µm'},rangemode:'tozero',tickformat:'.1f'},legend:{orientation:'h',y:-.3}}}/>
      <p>Die lokalen CFD-Parameterreihen verändern die normierte Form des rekonstruierten Referenzkerns. Einzelne Parameterwirkungen werden addiert; Wechselwirkungen sind nicht identifiziert. Abb. A.8 variiert beide Lenklüfte gemeinsam. Ihre Trennung nutzt die Breitenempfindlichkeiten aus Tab. 5.4 und ist eine zusätzliche Modellannahme. Extrapolation wird auf das Dreifache der untersuchten Parameteränderung begrenzt; negative Dichten werden auf null gesetzt und die Verteilung erneut flächennormiert.</p>
      <p>Die aus dem Referenzprofil abgeleitete Abscheidung auf einer großen Ebene beträgt {fmt(RECONSTRUCTION.etaReference*100)} %. Dieser Wert bleibt konstant: Aus den lokalen Reihen lässt sich kein belastbares variables Wirkungsgradmodell ableiten. Auf dem endlichen Blech wird außerhalb liegender Auftrag als Overspray abgeschnitten, ohne Nachnormierung. Die µm-Skala folgt aus Lackvolumenstrom × volumetrischem Festkörperanteil × Abscheidung × normiertem Flächenkern × Spritzzeit.</p>
      <p>Rotationssymmetrie, ebene senkrechte Zielfläche, konstanter Abstand, lineare Überlagerung. Kein Ablauf, keine Filmumverteilung, kein An-/Abschalttransient, keine Zerstäubungs-, Randfeld- oder Abschattungssimulation. Zeitsteuerung zeigt die aufsummierte spätere Trockenschicht, keinen Trocknungsvorgang. Der Festkörperanteil verändert nur die Menge; ein anderer realer Lack kann auch die Form verändern. Die Quelle deckt das Querprofil nur bis ±400 mm ab; der geglättete Rand wird bis 500 mm ergänzt. Keine unabhängige experimentelle Validierung des generischen Modells.</p>
      <p>CAD und Gelenkstellungen dienen der Anschauung. Keine Kollisionsprüfung oder Steuerungsfreigabe. Numerik: {result.u.length} × {result.v.length} Zellen ({fmt(result.du)} × {fmt(result.dv)} mm), {result.integrationSteps} Integrationsschritte, 81 Zeitstände.</p>
    </details>
    <div className="rb-steps" aria-label="Versuchsablauf"><span>1 <b>Brush & Szenario</b></span><span>2 <b>Auftrag verfolgen</b></span><span>3 <b>Schnitte vergleichen</b></span></div>
    <div className="rb-layout">
      <aside className="rb-settings" aria-label="Versuchseinstellungen">
        <h2>1 · Versuch einstellen</h2>
        <label>Szenario<select value={config.scenario} onChange={e => scenario(e.target.value as Scenario)}>
          {Object.entries(SCENARIOS).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
        </select></label>
        {['line', 'lineHold'].includes(config.scenario) && <label>Einzelbahnrichtung<select value={config.lineAxis} onChange={e => change('lineAxis', e.target.value as Settings['lineAxis'])}><option value="horizontal">Horizontal</option><option value="vertical">Vertikal</option></select></label>}
        <fieldset><legend>Brush · Modellparameter</legend>
          <Slider label="Innere Lenkluft" value={config.brush.innerAir} min={450} max={550} step={5} unit="Nl/min" onChange={v => change('brush', { ...config.brush, innerAir: v })} />
          <Slider label="Äußere Lenkluft" value={config.brush.outerAir} min={67.5} max={82.5} step={.5} unit="Nl/min" onChange={v => change('brush', { ...config.brush, outerAir: v })} />
          <Slider label="Glockendrehzahl" value={config.brush.rpm} min={31500} max={38500} step={100} unit="1/min" onChange={v => change('brush', { ...config.brush, rpm: v })} />
          <Slider label="Hochspannung" value={config.brush.voltage} min={58.5} max={71.5} step={.5} unit="kV" onChange={v => change('brush', { ...config.brush, voltage: v })} />
          <NumberField label="Werkstückabstand (mm)" value={config.brush.distance} min={150} max={250} step={5} onChange={v => change('brush', { ...config.brush, distance: v })} />
          <NumberField label="Fördermenge (ml/min)" value={config.brush.flow} min={0} max={500} step={5} onChange={v => change('brush', { ...config.brush, flow: v })} />
          <NumberField label="Festkörperanteil (Vol.%)" value={config.brush.solids} min={1} max={100} step={1} onChange={v => change('brush', { ...config.brush, solids: v })} />
          <p className="rb-small">Nl/min = Normliter pro Minute. Datenbereich: 225–275 ml/min; Referenz: 57 Vol.% Festkörper. Mehr innere Lenkluft bündelt, mehr äußere Lenkluft verbreitert im lokalen Lehrmodell. Die Spannung wirkt hier nur schwach.</p>
          {modelNotes(config.brush).outside && <p className="rb-notice" role="status">Außerhalb des lokalen Literaturbereichs: begrenzte generische Extrapolation, keine abgesicherte Prognose. Auch kombinierte Änderungen sind nicht unabhängig validiert.</p>}
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
          try { localStorage.setItem(STORAGE, JSON.stringify({ schema: 2, config })); setMessage('Versuchsstand in diesem Browser gespeichert.'); }
          catch { setError('Der Browser erlaubt das Speichern dieses Versuchsstands nicht.'); }
        }} disabled={!!errors.length}>Stand merken</button><button onClick={() => {
          try { const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null'); if (saved?.schema !== 2 || !saved.config?.brush || validate(saved.config).length) throw Error();
            setConfig(saved.config); setPlaying(false); setMessage('Gemerkter Stand geladen. Zum Anwenden „Änderungen berechnen“ wählen.');
          } catch { setError('Kein gültiger Versuchsstand in diesem Browser vorhanden.'); }
        }}>Stand laden</button><button onClick={() => { const c = structuredClone(INITIAL); setConfig(c); setView('2d'); calculate(c, false); }}>Beispiel zurücksetzen</button></div>
        <p className="rb-small">„Stand merken“ speichert nur die Einstellungen in diesem Browser.</p>
      </aside>
      <section className="rb-results" aria-label="Versuchsergebnis">
        <div className="rb-result-heading"><h2>2 · Auftrag verfolgen</h2><span className="rb-badge">{SCENARIOS[result.config.scenario]}</span></div>
        {dirty && <div className="rb-dirty"><p role="status">Einstellungen geändert. Die Ansichten zeigen noch den zuletzt berechneten Versuch.</p><button className="rb-primary" disabled={busy || !!errors.length} onClick={() => calculate()}>{busy ? 'Wird aktualisiert …' : 'Jetzt aktualisieren'}</button></div>}
        {message && <p className="rb-message" role="status">{message}</p>}{error && <p className="error" role="alert">{error}</p>}
        <section className="rb-player" aria-label="Zeitsteuerung">
          <div className="button-row"><button className="rb-primary" disabled={busy || dirty} onClick={() => { if (time >= result.path.duration) setTime(0); setPlaying(!playing); }}>{playing ? 'Pause' : 'Start'}</button>
            <button onClick={() => { setPlaying(false); setTime(0); }}>Von vorn</button>
            <button onClick={() => { setPlaying(false); setTime(t => Math.min(result.path.duration, t + result.path.duration / 80)); }}>Einzelschritt +</button>
            <button onClick={() => { setPlaying(false); setTime(result.path.duration); }}>Endergebnis</button>
            <label>Tempo<select value={tempo} onChange={e => setTempo(Number(e.target.value))}><option value={.5}>0,5×</option><option value={1}>1×</option><option value={2}>2×</option><option value={5}>5×</option></select></label>
          </div>
          <label className="rb-time">Zeit: {fmt(time)} / {fmt(result.path.duration)} s · {currentPose.phase}
            <input aria-label="Versuchszeit" type="range" min={0} max={result.path.duration} step={result.path.duration / 160} value={time} onChange={e => { setPlaying(false); setTime(Number(e.target.value)); }} /></label>
          <p className="rb-small">Nur Applikation und Umsetzen bei konstantem Vorschub. Gelenkstellungen dienen der Anschauung; keine reale Bewegungs-, Beschleunigungs- oder Steuerungssimulation.</p>
        </section>
        <div className="rb-tabs" role="group" aria-label="Ansicht wählen">{([['2d', 'Blech & Bahn · 2D'], ['profile', 'Schichtwachstum · 3D'], ['3d', 'Roboter & Auftrag · 3D']] as const).map(([v, title]) => <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{title}</button>)}</div>
        {view !== '2d' && <div className="rb-view-options">{view === '3d' && <><label className="rb-check"><input type="checkbox" checked={showCabin} onChange={e => setShowCabin(e.target.checked)}/> Kabine einblenden</label><label className="rb-check"><input type="checkbox" checked={transparentWalls} disabled={!showCabin} onChange={e => setTransparentWalls(e.target.checked)}/> Wände transparent</label></>}<label className="rb-check"><input type="checkbox" checked={showCut} onChange={e => setShowCut(e.target.checked)}/> Schnittebene einblenden</label><span>Schnitt {axis === 'u' ? 'v' : 'u'} = {fmt(cut)} mm</span></div>}
        <figure className="rb-mainplot"><figcaption><h3>{view === '2d' ? 'Trockenschichtdicke auf dem Blech' : view === '3d' ? 'Roboter, Aufhängung und wachsender Auftrag' : 'Schichtwachstum auf dem zentral aufgehängten Blech'}</h3>
          <p>{view === 'profile' ? 'Die Auftragsschicht wächst räumlich aus dem Blech heraus. Die Höhenachse zeigt die Modell-Trockenschichtdicke in µm; geometrisch ist die Schicht überhöht. Zeitregler bewegen oder „Von vorn“ und „Start“ wählen.' : view === '3d' ? 'CAD-Modelle dienen der Anschauung. Das Spritzmodell bleibt generisch und ist nicht für das dargestellte Werkzeug kalibriert. Das Blech hängt zentral; die berechnete Auftragsschicht wächst überhöht aus seiner Oberfläche. Sprühstrahlen und Gelenkbewegung dienen der Anschauung.' : 'Die gestrichelte violette Linie zeigt den Schnitt. Orange: Startpunkt; bei stationärem Versuch und Flächenbahnen ziehbar. Änderungen anschließend berechnen.'}</p></figcaption>
          {view === '2d' ? <><MapView result={result} values={values} max={max} time={time} axis={axis} cut={cut} edge={effectiveEdge} showPath={showPath}
            draftStart={config.scenario === result.config.scenario && !['line', 'lineHold'].includes(config.scenario) ? { u: config.startU, v: config.startV } : undefined}
            onStart={config.scenario !== result.config.scenario || config.sheetWidth !== result.config.sheetWidth || config.sheetHeight !== result.config.sheetHeight || ['line', 'lineHold'].includes(config.scenario) ? undefined : p => { setPlaying(false); setConfig(c => ({ ...c, startU: Math.max(-1600, Math.min(1600, p.u)), startV: Math.max(-1600, Math.min(1600, p.v)) })); }} />
            <label className="rb-check"><input type="checkbox" checked={showPath} onChange={e => setShowPath(e.target.checked)} /> Bahn und Spritzkreis einblenden</label>{legend(max)}</>
            : <><SpaceBoundary><Suspense fallback={<p>3D-Ansicht wird geladen …</p>}>{view === 'profile' ? <ProfileView result={result} values={values} max={max} time={time} profile axis={axis} cut={cut} showCut={showCut} /> : <SpaceView result={result} values={values} max={max} time={time} profile={false} axis={axis} cut={cut} showCut={showCut} showCabin={showCabin} transparentWalls={transparentWalls} />}</Suspense></SpaceBoundary>{legend(max)}</>}
        </figure>
        <dl className="rb-metrics"><div><dt>Applikationszeit</dt><dd>{fmt(result.path.sprayDuration)} s</dd></div><div><dt>Bewegungsstrecke</dt><dd>{fmt(result.path.length / 1000)} m</dd></div><div><dt>Auf Blech · Modell, final</dt><dd>{fmt(result.supplied ? result.captured / result.supplied * 100 : 0)} %</dd></div></dl>
        {config.scenario === 'spot' && <section className="rb-profile-preview"><h3>Stationäres Spritzbild · Schnitt durch das Zentrum</h3>
          <p className="rb-small">Vorschau der aktuellen Brush-Einstellung auf einer unendlich ausgedehnten Ebene. Zeitlicher Aufbau auf dem endlichen Blech oben nach „Änderungen berechnen“.</p>
          <Chart title="Doppelhöcker im diametralen Schnitt" description="Ein Schnitt durch den aus dem Einzelbahnprofil rekonstruierten, rotationssymmetrischen Auftragskern. Die Kurve wird nicht auf ihr eigenes Maximum normiert."
            data={[{ type: 'scatter', mode: 'lines', name: 'Modellprofil', x: Array.from({ length: 301 }, (_, i) => (i / 300 * 2 - 1) * kernel.support),
              y: Array.from({ length: 301 }, (_, i) => thicknessRate(config.brush, kernel, Math.abs((i / 300 * 2 - 1) * kernel.support)) * config.hold), line: { color: '#00776b', width: 3 } }]}
            layout={{ xaxis: { title: { text: 'Abstand vom Zentrum / mm' }, range: [-kernel.support, kernel.support] }, yaxis: { title: { text: 'Trockenschichtdicke / µm' }, tickformat: '.1f', hoverformat: '.1f', rangemode: 'tozero' }, showlegend: false }} />
        </section>}
        <section className="rb-analysis"><h2>3 · Schichtverteilung auswerten</h2>
          <p>Modell-Trockenschichtdicke in µm für den generischen Referenzlack. Die Trocknung selbst wird nicht simuliert.</p>
          <div className="rb-analysis-controls"><label>Schnittrichtung<select value={axis} onChange={e => setAxis(e.target.value as 'u' | 'v')}><option value="u">Horizontal · entlang u</option><option value="v">Vertikal · entlang v</option></select></label>
            <Slider label={`Schnittposition ${axis === 'u' ? 'v' : 'u'}`} value={cut} min={0} max={axis === 'u' ? result.config.sheetHeight : result.config.sheetWidth} unit="mm" onChange={v => setCutFraction(v / (axis === 'u' ? result.config.sheetHeight : result.config.sheetWidth))} />
            <Slider label="Rand von Statistik ausschließen" value={effectiveEdge} min={0} max={maxEdge} step={5} unit="mm" onChange={setEdge} /></div>
          <Chart title={`Auftragsschnitt entlang ${axis}`} description={`Aktueller Versuch bei ${fmt(time)} s. ${reference ? 'Referenz A zeigt stets den abgeschlossenen Versuch.' : 'Schnittposition über den Schieberegler verändern.'}`}
            data={[{ type: 'scatter', mode: 'lines', x, y: cutData, name: 'Aktueller Versuch B', line: { color: '#00776b', width: 3 } },
              ...(reference && compareCompatible ? [{ type: 'scatter' as const, mode: 'lines' as const,
                x: axis === 'u' ? reference.u : reference.v, y: section(reference, reference.frames[80].values, axis, cut), name: 'Referenz A · final', line: { color: '#9a4a17', width: 3, dash: 'dash' as const } }] : [])]}
            layout={{ xaxis: { title: { text: `${axis} / mm` }, range: [0, axis === 'u' ? result.config.sheetWidth : result.config.sheetHeight] },
              yaxis: { title: { text: 'Trockenschichtdicke / µm' }, tickformat: '.1f', hoverformat: '.1f', range: [0, max * 1.05] }, legend: { orientation: 'h', y: -.3 } }} />
          <dl className="rb-metrics"><div><dt>Mittelwert</dt><dd>{fmt(metrics.mean)} µm</dd></div><div><dt>Minimum / Maximum</dt><dd>{fmt(metrics.min)} / {fmt(metrics.max)} µm</dd></div><div><dt>Variationskoeffizient</dt><dd>{metrics.mean ? `${fmt(metrics.cv)} %` : '– (kein Auftrag)'}</dd></div></dl>
          <p className="rb-small">Statistik der aktuellen Zeit innerhalb der gestrichelt umrandeten Fläche, mit {fmt(effectiveEdge)} mm Randabstand. Gleichmäßigkeit allein beschreibt keine ausreichende Auftragsmenge.</p>
          <div className="button-row"><button disabled={dirty || busy} onClick={() => { setReference(result); setPlaying(false); setMessage('Berechnetes Endergebnis als Referenz A festgehalten. Jetzt einen Parameter ändern und neu berechnen.'); }}>Endergebnis als Referenz A festhalten</button>
            {reference && <button onClick={() => setReference(null)}>Referenz entfernen</button>}</div>
          {reference && <section className="rb-comparison"><h3>A/B-Vergleich · gemeinsame Farb- und Höhenskala</h3><p><strong>A:</strong> {brushName(reference)}</p><p><strong>B:</strong> {brushName(result)}</p>
            {!compareCompatible && <p className="rb-notice">Die Blechabmessungen unterscheiden sich. Ein gemeinsamer Schnitt wäre irreführend und wird deshalb nicht eingeblendet. Für einen kontrollierten Vergleich dieselbe Geometrie verwenden.</p>}
            <figure><figcaption><h3>Referenz A · abgeschlossen</h3></figcaption><MapView result={reference} values={refValues!} max={max} time={reference.path.duration} axis={axis} cut={cutFraction * (axis === 'u' ? reference.config.sheetHeight : reference.config.sheetWidth)} edge={compareCompatible ? effectiveEdge : 0} showPath={false} />{legend(max)}</figure>
            {refMetrics && compareCompatible && <p>Referenz A: Mittelwert {fmt(refMetrics.mean)} µm · Variationskoeffizient {refMetrics.mean ? `${fmt(refMetrics.cv)} %` : '–'}.</p>}
          </section>}
        </section>
      </section>
    </div>
    <details className="rb-help"><summary>Drei kurze Lernversuche</summary><ol>
      <li><strong>Stationär:</strong> Brushversuch berechnen, 3D-Auftragsprofil öffnen und die Zeit von 0 bis zur Endzeit bewegen. Danach den Abstand ändern. Werden Spritzbild und Maximalauftrag größer oder kleiner?</li>
      <li><strong>Überlagerung:</strong> Horizontalen Mäander als A festhalten. Nur den Bahnabstand reduzieren, neu berechnen und Endergebnisse vergleichen. Mittelwert, Streuung und Versuchsdauer gemeinsam bewerten.</li>
      <li><strong>Rand und Wenden:</strong> Auftrag beim Wenden aus- und einschalten. Schnitte an den Blechrand verschieben. Danach den Überlauf verändern. Wo entstehen lokale Maxima oder Unterauftrag?</li>
    </ol></details>
    <SupportFooter appName="Roboter Bahnplanung (Demo)" reviewed={false} />
  </article>;
}
