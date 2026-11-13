import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type { Data } from 'plotly.js';
import { RinseChart } from './RinseChart';
import { IndexedSymbol } from '../../components/MathNotation';
import { SupportFooter } from '../../components/SupportFooter';
import { calculate, canEdit, cellState, defaultParameters, fmt, MAX_SCENARIOS, MAX_STAGES, MAX_STEPS, validateParameters } from './logic';
import type { Parameters, Scenario } from './types';
import { ProgramDescription } from './ProgramDescription';
import { StageOverview } from './StageOverview';
import { exportWorkbook, importWorkbook } from './workbook';
import './style.css';

const colors = ['#164a87', '#007053', '#8c3483', '#9a4900', '#167984', '#5747a1'];
function initialScenarios(): Scenario[] {
  return [{ id: 'example-three', name: '3 × 100 L', parameters: defaultParameters(), interventions: [] },
    { id: 'example-one', name: '1 × 300 L', parameters: { ...defaultParameters(), stages: [{ volume: 300, initialConcentration: 0 }] }, interventions: [] }];
}
const copy = <T,>(value: T): T => structuredClone(value);
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const symbol = (base: string, index: string) => <IndexedSymbol base={base} index={index} />;
export default function App() {
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [activeId, setActiveId] = useState('example-three');
  const [draft, setDraft] = useState<Parameters>(defaultParameters);
  const [selected, setSelected] = useState(['example-three', 'example-one']);
  const [extraStages, setExtraStages] = useState<Record<string, number[]>>({});
  const [commonLimit, setCommonLimit] = useState(true);
  const [comparisonLimit, setComparisonLimit] = useState(25);
  const [viewStep, setViewStep] = useState(1);
  const [editor, setEditor] = useState<{ stage: number; step: number; value: string; comment: string } | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingImport, setPendingImport] = useState<Scenario[]>([]);
  const [importIds, setImportIds] = useState<string[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const active = scenarios.find(s => s.id === activeId)!;
  const locked = active.interventions.length > 0;
  const dirty = JSON.stringify(draft) !== JSON.stringify(active.parameters);
  const results = useMemo(() => new Map(scenarios.map(s => [s.id, calculate({ ...s.parameters, limit: commonLimit ? comparisonLimit : s.parameters.limit }, s.interventions)])), [scenarios, commonLimit, comparisonLimit]);
  const result = results.get(activeId)!;
  const baseline = useMemo(() => calculate(active.parameters), [active.parameters]);
  const toggle = (items: string[], id: string) => items.includes(id) ? items.filter(x => x !== id) : [...items, id];
  const updateActive = (update: (s: Scenario) => Scenario) => setScenarios(old => old.map(s => s.id === activeId ? update(s) : s));
  const choose = (s: Scenario) => {
    setActiveId(s.id); setDraft(copy(s.parameters)); setEditor(null); setViewStep(1); setError(''); setMessage('');
  };
  const numeric = (key: 'dragVolume' | 'sourceConcentration' | 'limit' | 'steps', label: ReactNode) => <label>{label}
    <input type="number" min={key === 'steps' ? 1 : 0} max={key === 'steps' ? MAX_STEPS : 1e9} step={key === 'steps' ? 1 : 'any'} value={Number.isNaN(draft[key]) ? '' : draft[key]}
      onChange={e => setDraft(p => ({ ...p, [key]: e.target.value === '' ? NaN : Number(e.target.value) }))} /></label>;
  const save = (asNew: boolean) => {
    try {
      validateParameters(draft);
      if (locked) throw new Error('Zuerst die Eingriffe zurücksetzen oder das Szenario ohne Eingriffe duplizieren.');
      if (asNew) {
        if (scenarios.length >= MAX_SCENARIOS) throw new Error(`Höchstens ${MAX_SCENARIOS} Szenarien.`);
        const s: Scenario = { id: crypto.randomUUID(), name: `Szenario ${scenarios.length + 1}`, parameters: copy(draft), interventions: [] };
        setScenarios(old => [...old, s]); setSelected(old => [...old, s.id]); choose(s);
      } else { updateActive(s => ({ ...s, parameters: copy(draft) })); setViewStep(1); setError(''); setMessage('Szenario neu berechnet.'); }
      setEditor(null);
    } catch (e) { setError((e as Error).message); }
  };
  const duplicate = (withoutEdits: boolean) => {
    if (scenarios.length >= MAX_SCENARIOS) { setError(`Höchstens ${MAX_SCENARIOS} Szenarien.`); return; }
    const s = { ...copy(active), id: crypto.randomUUID(), name: `${active.name} – Kopie`.slice(0, 100), interventions: withoutEdits ? [] : copy(active.interventions) };
    setScenarios(old => [...old, s]); setSelected(old => [...old, s.id]); choose(s);
  };
  const applyEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editor || dirty) return;
    try {
      if (editor.value.trim() === '') throw new Error('Bitte eine Konzentration eingeben.');
      if (!canEdit(active.interventions, editor.stage, editor.step)) throw new Error('Die Zelle ist durch einen späteren Eingriff gesperrt.');
      const interventions = [...active.interventions, { ...editor, value: Number(editor.value) }];
      calculate(active.parameters, interventions);
      updateActive(s => ({ ...s, interventions })); setEditor(null); setError(''); setMessage(`Eingriff bei n = ${editor.stage}, t = ${editor.step} übernommen.`);
    } catch (e) { setError((e as Error).message); }
  };
  const history = (all: boolean) => { updateActive(s => ({ ...s, interventions: all ? [] : s.interventions.slice(0, -1) })); setEditor(null); setError(''); setMessage(all ? 'Alle Eingriffe zurückgesetzt.' : 'Letzten Eingriff rückgängig gemacht.'); };
  const annotations: Partial<import("plotly.js").Annotation>[] = [];
  const traces: Data[] = [];
  scenarios.forEach((s, index) => {
    if (!selected.includes(s.id)) return;
    const r = results.get(s.id)!;
    const color = colors[index % colors.length];
    const stages = [s.parameters.stages.length, ...(extraStages[s.id] ?? []).filter(n => n < s.parameters.stages.length)];
    stages.forEach((n, j) => {
      const label = `${s.name} · Stufe ${n}${n === s.parameters.stages.length ? ' (Endkonzentration)' : ''}`;
      traces.push({ type: 'scatter', name: label, showlegend: true, mode: j === 0 ? 'lines' : 'lines+markers', marker: { color, size: 8, symbol: (['circle', 'diamond', 'square', 'triangle-up', 'triangle-down', 'pentagon', 'hexagon', 'star', 'cross', 'x', 'triangle-right'] as const)[n - 1] }, x: r.concentrations.map((_, t) => t), y: r.concentrations.map(row => row[n - 1]),
        line: { color, width: j === 0 ? 4 : 1.3, dash: 'solid' },
        text: r.concentrations.map(row => `${escapeHtml(label)}<br>c = ${fmt(row[n - 1])} g/L`), hovertemplate: '%{text}<br>t = %{x}<extra></extra>' });
    });
    const limit = commonLimit ? comparisonLimit : s.parameters.limit;
    if (!commonLimit) {
      traces.push({ type: 'scatter', mode: 'lines', name: `${s.name} · Grenze ${fmt(limit)} g/L`, showlegend: true, x: [0, s.parameters.steps], y: [limit, limit], line: { color, width: 2, dash: 'dash' }, hoverinfo: 'skip' });
    }
    if (r.firstExceedance !== null) {
      const t = r.firstExceedance;
      traces.push({ type: 'scatter', name: `${s.name} · erste Überschreitung bei t = ${t}`, showlegend: true, mode: 'markers', x: [t], y: [r.concentrations[t].at(-1)!], marker: { color, size: 12, symbol: 'diamond', line: { color: '#fff', width: 2 } }, text: [`${escapeHtml(s.name)} · erste Grenzüberschreitung`], hovertemplate: '%{text}<br>t = %{x}<br>c = %{y:.1f} g/L<extra></extra>' });
    }
    s.interventions.forEach((e, k) => {
      traces.push({ type: 'scatter', name: `${s.name} · Eingriff n = ${e.stage}, t = ${e.step}`, showlegend: true, mode: 'markers', x: [e.step], y: [e.value], marker: { color, size: 9, symbol: 'square' }, hovertemplate: `Eingriff · n = ${e.stage}<br>t = %{x}<br>c = %{y:.1f} g/L<extra></extra>` });
      annotations.push({ x: e.step, y: e.value, xref: 'x', yref: 'y', ax: 30 + (k % 3) * 25, ay: -55 - (k % 3) * 35,
        text: `${escapeHtml(s.name)} · n = ${e.stage}, t = ${e.step}<br>${escapeHtml(e.comment || 'Manueller Eingriff')}`,
        showarrow: true, arrowhead: 2, arrowcolor: color, bordercolor: color, borderwidth: 1, borderpad: 6, bgcolor: `rgb(${[1, 3, 5].map(i => Math.round(255 * 0.87 + parseInt(color.slice(i, i + 2), 16) * 0.13)).join(',')})`, font: { color: '#162c3c', size: 13 } });
    });
  });
  if (commonLimit && selected.length) {
    traces.push({ type: 'scatter', mode: 'lines', name: `Gemeinsame Grenze ${fmt(comparisonLimit)} g/L`, showlegend: true, x: [0, Math.max(...scenarios.filter(s => selected.includes(s.id)).map(s => s.parameters.steps))], y: [comparisonLimit, comparisonLimit], line: { color: '#b3261e', dash: 'dash', width: 2 }, hoverinfo: 'skip' });
  }
  const displayStep = Math.min(viewStep, active.parameters.steps);
  const lastEdit = active.interventions.at(-1);
  const readFile = async (file?: File) => {
    if (!file) return;
    setBusy(true); setError(''); setPendingImport([]); setImportErrors([]);
    try {
      const imported = await importWorkbook(file);
      setImportErrors(imported.errors);
      if (!imported.scenarios.length) throw new Error('Keine gültigen Szenarien gefunden. Bitte einen aus dieser App exportierten Modellstand verwenden.');
      setPendingImport(imported.scenarios); setImportIds(imported.scenarios.map(s => s.id));
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  return <article className="rinse-app"><h1>Mehrfachspüle</h1><ProgramDescription />
    <section className="controls"><h2>Szenarien verwalten</h2>
      <div className="rinse-inputs"><label>Bearbeitetes Szenario<select value={activeId} onChange={e => choose(scenarios.find(s => s.id === e.target.value)!)}>{scenarios.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
        <label>Szenarioname<input type="text" maxLength={100} value={active.name} onChange={e => updateActive(s => ({ ...s, name: e.target.value }))} onBlur={() => { if (!active.name.trim()) updateActive(s => ({ ...s, name: 'Szenario' })); }} /></label></div>
      <p>Beim Wechsel werden noch nicht berechnete Eingaben verworfen. Szenarien werden bis zum Schließen der Seite im Arbeitsspeicher gehalten.</p>
      <div className="button-row"><button onClick={() => duplicate(false)} disabled={scenarios.length >= MAX_SCENARIOS}>Szenario duplizieren</button>
        {locked && <button onClick={() => duplicate(true)} disabled={scenarios.length >= MAX_SCENARIOS}>Ohne Eingriffe duplizieren</button>}
        <button disabled={scenarios.length === 1} onClick={() => {
          const remaining = scenarios.filter(s => s.id !== activeId); setScenarios(remaining); setSelected(old => old.filter(id => id !== activeId)); choose(remaining[0]);
        }}>Szenario entfernen</button>
        <button disabled={busy || dirty || !active.name.trim()} onClick={async () => { setBusy(true); setError(''); try { await exportWorkbook(scenarios); setMessage('Excel-Modellstand exportiert.'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>Alle Szenarien als Excel exportieren</button></div>
      <label className="rinse-file">Excel-Modellstand laden<input type="file" accept=".xlsx" disabled={busy} onChange={e => { void readFile(e.target.files?.[0]); e.target.value = ''; }} /></label>
      {busy && <p role="status">Excel-Datei wird verarbeitet …</p>}
      {importErrors.length > 0 && <div className="error"><p>Diese Blätter können nicht importiert werden:</p><ul>{importErrors.map((v, i) => <li key={i}>{v}</li>)}</ul></div>}
      {pendingImport.length > 0 && <fieldset><legend>Szenarien für den Import auswählen</legend>
        {pendingImport.map(s => <label className="rinse-check" key={s.id}><input type="checkbox" checked={importIds.includes(s.id)} onChange={() => setImportIds(old => toggle(old, s.id))} />{s.name} · {s.parameters.stages.length} Stufen · {s.parameters.steps} Schritte · {s.interventions.length} Eingriffe</label>)}
        <p>Die Auswahl wird zu den vorhandenen Szenarien hinzugefügt.</p><div className="button-row"><button disabled={!importIds.length || scenarios.length + importIds.length > MAX_SCENARIOS} onClick={() => {
          const additions = pendingImport.filter(s => importIds.includes(s.id));
          setScenarios(old => [...old, ...additions]); setSelected(old => [...old, ...additions.map(s => s.id)]); choose(additions[0]); setPendingImport([]); setImportErrors([]); setMessage(`${additions.length} Szenarien importiert und neu berechnet.`);
        }}>Auswahl importieren</button><button onClick={() => setPendingImport([])}>Abbrechen</button></div>
        {scenarios.length + importIds.length > MAX_SCENARIOS && <p className="error">Zusammen höchstens {MAX_SCENARIOS} Szenarien.</p>}
      </fieldset>}
    </section>
    <section className="controls"><h2>Vorgaben</h2>
      {locked && <p className="rinse-notice">Parameter durch Eingriffe gesperrt. „Ohne Eingriffe duplizieren“ erstellt eine frei bearbeitbare Variante.</p>}
      <fieldset disabled={locked}><legend>Prozess und Berechnungsumfang</legend><div className="rinse-inputs">
        {numeric('dragVolume', <>Verschleppungsvolumen {symbol('V', 'A')} [L]</>)}
        {numeric('sourceConcentration', <>Eingangskonzentration {symbol('c', '0')} [g/L]</>)}
        {numeric('limit', <>Grenzschmutzkonzentration {symbol('c', 'grenz')} [g/L]</>)}
        {numeric('steps', <>Letzter Tauchschritt T [–]</>)}
        <label>Stufenzahl N [–]<input type="number" min={1} max={MAX_STAGES} step={1} value={draft.stages.length} onChange={e => {
          const n = Number(e.target.value); if (Number.isInteger(n) && n >= 1 && n <= MAX_STAGES) setDraft(p => ({ ...p, stages: Array.from({ length: n }, (_, i) => p.stages[i] ?? { volume: 100, initialConcentration: 0 }) }));
        }} /></label></div>
        <h3>Becken und Anfangszustände</h3><div className="rinse-bath-inputs">{draft.stages.map((b, i) => <div key={i}><h4>Stufe {i + 1}</h4>
          {(['volume', 'initialConcentration'] as const).map(key => <label key={key}>{key === 'volume' ? <>Beckenvolumen {symbol('V', `B,${i + 1}`)} [L]</> : <>Anfangskonzentration {symbol('c', `${i + 1},0`)} [g/L]</>}
            <input type="number" min={key === 'volume' ? Number.MIN_VALUE : 0} max={1e9} step="any" value={Number.isNaN(b[key]) ? '' : b[key]} onChange={e => setDraft(p => ({ ...p, stages: p.stages.map((s, j) => j === i ? { ...s, [key]: e.target.value === '' ? NaN : Number(e.target.value) } : s) }))} /></label>)}
        </div>)}</div>
        <div className="button-row"><button onClick={() => save(false)}>Szenario berechnen</button><button disabled={scenarios.length >= MAX_SCENARIOS} onClick={() => save(true)}>Als neues Szenario berechnen</button></div>
      </fieldset>
      {dirty && <p className="rinse-notice" role="status">Eingaben geändert. Diagramm, Übersicht und Tabelle zeigen weiterhin den zuletzt berechneten Stand. Vor Zelländerungen oder Export bitte berechnen.</p>}
    </section>
    {error && <p className="error" role="alert">{error}</p>}{message && <p className="rinse-notice" role="status">{message}</p>}
    <section className="result" aria-label="Ergebnis des bearbeiteten Szenarios"><h2>{active.name}</h2>
      <p>Gesamtvolumen: <strong>{fmt(result.totalVolume)} L</strong> · N = {active.parameters.stages.length} · T = {active.parameters.steps}</p>
      <p>Nach T: Endkonzentration <strong>{fmt(result.concentrations.at(-1)!.at(-1)!)} g/L</strong> · Spülkriterium <strong>{fmt(result.criterion.at(-1)!)}</strong></p>
      <p><strong>{result.firstExceedance === null ? `Keine Grenzüberschreitung innerhalb der berechneten ${active.parameters.steps} Tauchschritte.` : `Erste Grenzüberschreitung: t = ${result.firstExceedance}. Zuvor ${result.firstExceedance - 1} aufeinanderfolgende zulässige Tauchschritte.`}</strong></p>
      {active.interventions.length > 0 && <p>Manuelle Eingriffe aktiv: externe Stoffentnahmen oder Stoffzugaben werden nicht bilanziert.</p>}
    </section>
    <label className="rinse-step">Tauchschritt für die Stufenübersicht: t = {displayStep}<input type="range" min={0} max={active.parameters.steps} value={displayStep} onChange={e => setViewStep(Number(e.target.value))} /><input aria-label="Tauchschritt der Stufenübersicht" type="number" min={0} max={active.parameters.steps} step={1} value={displayStep} onChange={e => { const t = Number(e.target.value); if (Number.isInteger(t) && t >= 0 && t <= active.parameters.steps) setViewStep(t); }} /></label>
    <StageOverview parameters={active.parameters} concentrations={result.concentrations[displayStep]} step={displayStep} />
    <section className="controls"><h2>Szenarien vergleichen</h2>
      <label className="rinse-check"><input type="checkbox" checked={commonLimit} onChange={e => setCommonLimit(e.target.checked)} />Gemeinsame Grenzschmutzkonzentration</label>
      {commonLimit && <label>Gemeinsame Grenze [g/L]<input type="number" min={0} max={1e9} step="any" value={comparisonLimit} onChange={e => { const v = Number(e.target.value); if (e.target.value !== '' && Number.isFinite(v) && v >= 0 && v <= 1e9) setComparisonLimit(v); }} /><button onClick={() => setComparisonLimit(scenarios[0].parameters.sourceConcentration / 2)}>Auf c₀/2 des ersten Szenarios setzen</button></label>}
      <p>Die gemeinsame Grenze gilt auch für Ergebnisanzeigen und Überschreitungsmarker. Ohne gemeinsame Grenze gelten die individuellen Szenariogrenzen.</p>
      {scenarios.map((s, i) => <div className="rinse-scenario-row" key={s.id}>
        <label className="rinse-check"><input type="checkbox" checked={selected.includes(s.id)} onChange={() => setSelected(old => toggle(old, s.id))} /><span className="rinse-swatch" style={{ background: colors[i % colors.length] }} />{s.name} · Endstufe {s.parameters.stages.length}</label>
        <div className="rinse-checks">{s.parameters.stages.slice(0, -1).map((_, n) => <label className="rinse-check" key={n}><input type="checkbox" aria-label={`${s.name}: Stufe ${n + 1}`} checked={(extraStages[s.id] ?? []).includes(n + 1)} onChange={() => setExtraStages(old => { const current = old[s.id] ?? []; return { ...old, [s.id]: current.includes(n + 1) ? current.filter(v => v !== n + 1) : [...current, n + 1] }; })} />Stufe {n + 1}</label>)}</div>
      </div>)}
      {selected.length ? <><RinseChart title="Konzentrationsverlauf" description="Endkonzentrationen der ausgewählten Szenarien; rote gestrichelte Linien zeigen deren Grenzschmutzkonzentrationen." data={traces}
        layout={{ annotations, showlegend: true, xaxis: { title: { text: 'Tauchschritt t [–]' }, rangemode: 'tozero', tickformat: 'd' }, yaxis: { title: { text: 'Konzentration c [g/L]' }, rangemode: 'tozero', tickformat: '.1f', exponentformat: 'none' }, margin: { l: 95, r: 20, t: 20, b: 65 } }} />
</> : <p>Mindestens ein Szenario zum Vergleich auswählen.</p>}
    </section>
    <section className="controls"><h2>Konzentrationstabelle · {active.name}</h2>
      <p><span className="rinse-key manual">Manuell</span> selbst gesetzter Zustand. <span className="rinse-key affected">Folge</span> dadurch geänderter Wert gegenüber der Rechnung ohne Eingriffe. 🔒 gesperrte Zelle.</p>
      {lastEdit && <p>Weitere Eingriffe nur für n ≥ {lastEdit.stage} und t ≥ {lastEdit.step}. Vorherige Zustände werden über „Rückgängig“ freigegeben.</p>}
      <div className="button-row"><button disabled={!locked} onClick={() => history(false)}>Rückgängig</button><button disabled={!locked} onClick={() => history(true)}>Alle Änderungen zurücksetzen</button></div>
      {editor && <form className="rinse-editor" onSubmit={applyEdit}><h3>Zelle bearbeiten: n = {editor.stage}, t = {editor.step}</h3><div className="rinse-inputs">
        <label>Neue Konzentration [g/L]<input autoFocus required type="number" min={0} max={1e9} step="any" value={editor.value} onChange={e => setEditor({ ...editor, value: e.target.value })} /></label>
        <label>Kommentar (optional)<input type="text" maxLength={500} placeholder="z. B. Wasserwechsel" value={editor.comment} onChange={e => setEditor({ ...editor, comment: e.target.value })} /></label></div>
        <div className="button-row"><button type="submit" disabled={dirty}>Änderung übernehmen</button><button type="button" onClick={() => setEditor(null)}>Abbrechen</button></div></form>}
      <div className="rinse-table" tabIndex={0} role="region" aria-label="Konzentrationen, horizontal scrollbar"><table><thead><tr><th scope="col">Tauchschritt t</th>{active.parameters.stages.map((_, i) => <th scope="col" key={i}>{symbol('c', `${i + 1},t`)} [g/L]</th>)}<th scope="col">{symbol('R', 't')} [–]</th></tr></thead>
        <tbody>{result.concentrations.map((row, t) => { return <tr key={t}><th scope="row">{t}</th>{row.map((value, i) => {
          const n = i + 1, state = cellState(active, t, n, value, baseline.concentrations[t][i]);
          const disabled = t === 0 || dirty || !canEdit(active.interventions, n, t);
          const edit = [...active.interventions].reverse().find(e => e.stage === n && e.step === t);
          return <td key={n} className={state} title={edit?.comment || undefined}><button disabled={disabled} aria-label={`Stufe ${n}, Tauchschritt ${t}: ${fmt(value)} g/L${disabled ? ', gesperrt' : ', bearbeiten'}`} onClick={() => { setEditor({ stage: n, step: t, value: String(value), comment: '' }); setError(''); }}>
            {disabled && <span aria-label="Gesperrt">🔒 </span>}{fmt(value)}<small>{state === 'manual' ? 'Manuell' : state === 'affected' ? 'Folge' : disabled ? 'Gesperrt' : 'Bearbeiten'}</small>{edit?.comment && <small className="rinse-comment">{edit.comment}</small>}</button></td>;
        })}<td className={t > 0 && result.criterion[t] !== baseline.criterion[t] ? 'affected' : ''}>{t === 0 ? 'Noch kein Tauchschritt' : result.criterion[t] === null ? 'Nicht definiert (0/0)' : fmt(result.criterion[t])}{t > 0 && result.criterion[t] !== baseline.criterion[t] && <small className="rinse-result-note">Folge</small>}</td></tr>; })}</tbody></table></div>
      <details className="rinse-history"><summary>Eingriffshistorie ({active.interventions.length})</summary>{locked ? <ol>{active.interventions.map((e, i) => <li key={i}>n = {e.stage}, t = {e.step}: {fmt(e.value)} g/L{e.comment ? ` – ${e.comment}` : ''}</li>)}</ol> : <p>Keine manuellen Eingriffe.</p>}</details>
    </section>
    <SupportFooter appName="Mehrfachspüle" reviewed={false} />
  </article>;
}
