import { useState, type ReactNode } from 'react';
import { Chart } from '../../components/Chart';
import { MathExpression, math as m } from '../../components/MathNotation';
import { SupportFooter } from '../../components/SupportFooter';
import { calculate, compareStages, DEFAULTS, MAX_STAGES, type Parameters } from './logic';
import { FlowDiagram, type LabelMode } from './FlowDiagram';
import { flow, Symbol } from './Notation';
import { ProgramDescription, ApproximationFormula } from './ProgramDescription';
import { fmt } from './format';
import { powerAxis } from './display';
import { TransientPanel } from './TransientPanel';
import './style.css';

export default function App() {
  const [p, setP] = useState<Parameters>({ ...DEFAULTS });
  const basis = 'Bauteil';
  const [transient, setTransient] = useState(false);
  const [editingFlow, setEditingFlow] = useState(false);
  const [selected, setSelected] = useState(1);
  const [labels, setLabels] = useState<LabelMode>('both');
  const [logarithmic, setLogarithmic] = useState(false);
  let result: ReturnType<typeof calculate> | null = null;
  let error = '';
  try { result = calculate(p); } catch (e) { error = (e as Error).message; }
  const comparisons = result ? compareStages(p) : [];
  const update = (key: keyof Parameters, value: number) => setP(old => ({ ...old, [key]: value }));
  const number = (key: keyof Parameters, label: ReactNode, min: number, step: number | 'any' = 'any') => <label>{label}
    <input type="number" min={min} step={step} value={Number.isNaN(Number(p[key])) ? '' : key === 'freshFlow' && !editingFlow && Number.isFinite(p.freshFlow)
      ? Math.abs(p.freshFlow) >= 0.1 ? p.freshFlow.toFixed(1) : Number(p.freshFlow.toPrecision(2)).toString()
      : Number(p[key])}
      onFocus={() => { if (key === 'freshFlow') setEditingFlow(true); }}
      onBlur={() => { if (key === 'freshFlow') setEditingFlow(false); }}
      onChange={e => update(key, e.target.value === '' ? NaN : Number(e.target.value))} />
  </label>;
  const changeStages = (delta: number) => {
    const stages = Math.max(1, Math.min(MAX_STAGES, p.stages + delta));
    update('stages', stages);
    setSelected(old => Math.min(old, stages));
  };
  const changeMode = (mode: Parameters['mode']) => setP(old => ({ ...old, mode,
    freshFlow: mode === 'flow' && result ? result.freshFlow : old.freshFlow }));
  const c = (index: string) => m.index('c', index);
  const vA = flow('A');
  const plus = m.operator('+');
  const eq = m.operator('=');
  const minus = m.operator('−');
  const i = Math.min(selected, p.stages);
  const dragInIndex = `${i - 1}${i}`;
  const dragOutIndex = i === p.stages ? `${i},aus` : `${i}${i + 1}`;
  const waterOutIndex = i === 1 ? '1,aus' : `${i}${i - 1}`;
  const nextSymbol = i === p.stages ? 'VE' : `${i + 1}${i}`;
  const waterInFlow = flow(nextSymbol);
  const waterOutFlow = flow(waterOutIndex);
  const nextConcentration = result ? (i === p.stages ? p.freshConcentration : result.concentrations[i + 1]) : 0;
  const balances = result ? {
    dragIn: result.dragFlow * result.concentrations[i - 1],
    waterIn: result.freshFlow * nextConcentration,
    dragOut: result.dragFlow * result.concentrations[i],
    waterOut: result.freshFlow * result.concentrations[i],
  } : null;
  const exportCsv = () => {
    if (!result) return;
    const rows = [
      ['Gegenstromkaskade', 'Wert', 'Einheit'],
      ['Bezugsgröße', basis, ''], ['Oberfläche', p.area, 'm²'],
      ['Durchsatz', p.throughput, `${basis}/h`], ['Spezifische Verschleppung', p.specificDrag, 'ml/m²'],
      ['Verschleppungsstrom', result.dragFlow, 'L/min'], ['Frischwasserstrom', result.freshFlow, 'L/min'],
      ['Frischwasserkonzentration', p.freshConcentration, 'g/L'], ['Spülverhältnis R', result.ratio, ''],
      ['Erreichtes Spülkriterium', result.criterion, ''], ['Gefordertes Spülkriterium', p.targetCriterion, ''],
      ...result.concentrations.map((value, stage) => [stage === 0 ? 'Eingangskonzentration c0' : `Stufe ${stage}`, value, 'g/L']),
    ];
    const content = '\ufeff' + rows.map(row => row.map(value => `"${String(typeof value === 'number' ? value.toLocaleString('de-DE', { maximumSignificantDigits: 15 }) : value).replaceAll('"', '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'gegenstromkaskade.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <article className="cascade-app">
    <h1>Gegenstromkaskade</h1>
    <ProgramDescription />
    <section className="controls" aria-label="Eingaben">
      <div className="cascade-toolbar"><h2>Spülstufen</h2>
        <button aria-label="Eine Spülstufe entfernen" disabled={p.stages === 1} onClick={() => changeStages(-1)}>−</button>
        <output aria-live="polite" aria-label="Anzahl Spülstufen">{p.stages}</output>
        <button aria-label="Eine Spülstufe hinzufügen" disabled={p.stages === MAX_STAGES} onClick={() => changeStages(1)}>+</button>
        <button onClick={() => { setP({ ...DEFAULTS }); setTransient(false); setSelected(1); setLabels('both'); setLogarithmic(false); }}>Aufgabenbeispiel laden</button>
      </div>
      <fieldset><legend>Berechnungsmodus</legend>
        <label className="radio-label"><input type="radio" name="cascade-time-mode" checked={!transient} onChange={() => setTransient(false)} />Stationär</label>
        <label className="radio-label"><input type="radio" name="cascade-time-mode" checked={transient} onChange={() => { changeMode('flow'); setTransient(true); }} />Instationär · aufeinanderfolgende Bauteile</label>
      </fieldset>
      {!transient && <fieldset><legend>Betriebsart</legend>
        <label className="radio-label"><input type="radio" name="cascade-mode" checked={p.mode === 'target'} onChange={() => changeMode('target')} />Spülkriterium vorgeben → erforderlichen Frischwasserstrom berechnen</label>
        <label className="radio-label"><input type="radio" name="cascade-mode" checked={p.mode === 'flow'} onChange={() => changeMode('flow')} />Frischwasserstrom vorgeben → erreichtes Spülkriterium berechnen</label>
      </fieldset>}
      <div className="input-grid cascade-inputs">
        {number('area', `Benetzte Oberfläche je ${basis} [m²]`, 0)}
        {number('throughput', 'Durchsatz [Bauteile/h]', 0)}
        {number('specificDrag', 'Spezifische Verschleppung [ml/m²]', 0)}
        {number('initialConcentration', <>Konzentration der eingeschleppten Flüssigkeit <Symbol base="c" index="0" /> [g/L]</>, 0)}
        {number('freshConcentration', <>Frischwasserkonzentration <Symbol base="c" index="VE" /> [g/L]</>, 0)}
        {number('targetCriterion', <>{p.mode === 'target' ? 'Gefordertes Spülkriterium' : 'Spülkriterium zum Vergleich'} <MathExpression label="Spülkriterium gleich Eingangskonzentration geteilt durch Endkonzentration">{m.row(m.index('S', 'k'), eq, m.fraction(c('0'), c('N')))}</MathExpression> [−]</>, 1)}
        {p.mode === 'flow' && number('freshFlow', 'Frischwasserstrom [L/min]', 0)}
      </div>
      <p className="cascade-hint">Auch ein gemeinsam gespültes Paket kann als ein Bauteil gezählt werden. Dann ist die gesamte benetzte Oberfläche des Pakets anzugeben und der Durchsatz zählt Pakete pro Stunde. Oberfläche, Durchsatz, Verschleppung und c₀ müssen größer als 0 sein.</p>
    </section>
    {error && <p className="error" role="alert">{error}</p>}
    {result && (transient ? <TransientPanel p={p} /> : <>
      <section className="result" aria-label="Berechnungsergebnisse">
        <dl className="cascade-metrics">
          <div><dt>{p.mode === 'target' ? 'Erforderlicher Frischwasserstrom' : 'Vorgegebener Frischwasserstrom'}</dt><dd>{fmt(result.freshFlow)} L/min</dd></div>
          <div><dt>Verschleppungsstrom</dt><dd>{fmt(result.dragFlow)} L/min</dd></div>
          <div><dt>Endkonzentration <Symbol base="c" index="N" /></dt><dd>{fmt(result.finalConcentration)} g/L</dd></div>
          <div><dt>Erreichtes Spülkriterium</dt><dd>{fmt(result.criterion)}</dd></div>
        </dl>
        <p><strong>{result.meetsTarget ? 'Spülkriterium erfüllt' : 'Spülkriterium nicht erfüllt'}</strong></p><p>Grenzwert: {fmt(result.limit)} g/L</p><p>Spülverhältnis R: {fmt(result.ratio)}</p>
        <p>Verschleppung je {basis}: {fmt(result.dragVolume)} L</p><p>Frischwasser je {basis}: {fmt(result.freshFlow * 60 / p.throughput)} L</p>
      </section>
      <h2>Fließbild mit Stoffströmen</h2>
      <label className="cascade-display-mode">Beschriftung<select value={labels} onChange={e => setLabels(e.target.value as LabelMode)}><option value="both">Symbole und Zahlenwerte</option><option value="values">Zahlenwerte</option><option value="symbols">Symbole</option></select></label>
      <FlowDiagram p={p} result={result} selected={i} onSelect={setSelected} labels={labels} />
      <section className="cascade-balance" aria-label={`Bilanz Stufe ${i}`}>
        <div className="cascade-toolbar"><h2>Stationäre Bilanz · Stufe {i}</h2>
          <button onClick={() => setSelected(Math.max(1, i - 1))} disabled={i === 1} aria-label="Bilanz der vorherigen Stufe">←</button>
          <button onClick={() => setSelected(Math.min(p.stages, i + 1))} disabled={i === p.stages} aria-label="Bilanz der nächsten Stufe">→</button>
        </div>
        <p>Volumenbilanz: gleicher Verschleppungsstrom hinein und hinaus; alle Überläufe entsprechen dem Frischwasserstrom.</p>
        <MathExpression label="Volumenbilanz: Verschleppung plus Wasserzulauf minus Verschleppung minus Wasserablauf gleich null">{m.row(vA, plus, waterInFlow, minus, vA, minus, waterOutFlow, eq, m.number('0'))}</MathExpression>
        <p>Schmutzmassenbilanz: Eingehende Schmutzströme entsprechen den ausgehenden Schmutzströmen.</p>
        <div className="cascade-equation"><MathExpression label={`Schmutzbilanz für Stufe ${i}`}>
          {m.row(vA, c(dragInIndex), plus, waterInFlow, c(nextSymbol), minus, vA, c(dragOutIndex), minus, waterOutFlow, c(waterOutIndex), eq, m.number('0'))}
        </MathExpression></div>
        {balances && <p title="Bilanzgleichgewicht innerhalb numerischer Genauigkeit; Einzelwerte für die Anzeige gerundet.">{fmt(balances.dragIn)} + {fmt(balances.waterIn)} − {fmt(balances.dragOut)} − {fmt(balances.waterOut)} ≈ {fmt(0)} g/min</p>}
        <p className="cascade-hint"><Symbol base="c" index="0" /> ist die Eingangskonzentration des Flüssigkeitsfilms. Alle Stromkonzentrationen entsprechen ihrer Herkunftsstufe; in der letzten Stufe stammt der Wasserzulauf aus dem Frischwasser mit <Symbol base="c" index="VE" />. Alle Zahlen werden erst für die Anzeige gerundet.</p>
      </section>
      <div className="cascade-chart-options"><label><input type="checkbox" checked={logarithmic} onChange={e => setLogarithmic(e.target.checked)} /> Konzentrationen logarithmisch darstellen</label></div>
      <div className="charts">
        <Chart title="Konzentration entlang der Kaskade" description="Stufe 0 bezeichnet die eingeschleppte Flüssigkeit. Die gestrichelte Linie markiert die erlaubte Endkonzentration."
          data={[
            { x: result.concentrations.map((_, j) => j), y: result.concentrations, customdata: result.concentrations.map(fmt), hovertemplate: 'Stufe %{x}<br>%{customdata} g/L<extra>Konzentration</extra>', type: 'scatter', mode: 'lines+markers', name: 'Konzentration', line: { color: '#164a87' } },
            { x: [0, p.stages], y: [result.limit, result.limit], customdata: [fmt(result.limit), fmt(result.limit)], hovertemplate: '%{customdata} g/L<extra>Grenzwert</extra>', type: 'scatter', mode: 'lines', name: 'Grenzwert', line: { color: '#a34c00', dash: 'dash' } },
            ...(p.freshConcentration > 0 ? [{ x: [0, p.stages], y: [p.freshConcentration, p.freshConcentration], customdata: [fmt(p.freshConcentration), fmt(p.freshConcentration)], hovertemplate: '%{customdata} g/L<extra>Frischwasser</extra>', type: 'scatter' as const, mode: 'lines' as const, name: 'Frischwasser', line: { color: '#007053', dash: 'dot' as const } }] : []),
          ]}
          layout={{ separators: ',.', xaxis: { title: { text: 'Spülstufe [−]' }, dtick: 1 }, yaxis: { title: { text: 'Konzentration [g/L]' }, ...(logarithmic ? powerAxis([...result.concentrations, result.limit, p.freshConcentration]) : { type: 'linear' as const, tickformat: '.1f' }) }, legend: { orientation: 'h', y: -0.3 } }} />
        <Chart title={p.mode === 'target' ? 'Wasserbedarf nach Stufenzahl' : 'Spülwirkung nach Stufenzahl'}
          description={p.mode === 'target' ? 'Gleiches Spülkriterium und gleicher Durchsatz für alle Varianten. Der aktuelle Aufbau ist orange markiert.' : 'Gleicher Frischwasserstrom und gleicher Durchsatz für alle Varianten. Die gestrichelte Linie zeigt das Vergleichskriterium.'}
          data={[
            { x: comparisons.map(row => row.stages), y: comparisons.map(row => row.result ? p.mode === 'target' ? row.result.freshFlow : row.result.criterion : null), customdata: comparisons.map(row => row.result ? fmt(p.mode === 'target' ? row.result.freshFlow : row.result.criterion) : '–'), hovertemplate: `Stufen: %{x}<br>%{customdata}${p.mode === 'target' ? ' L/min' : ''}<extra></extra>`, type: 'scatter', mode: 'lines+markers', name: p.mode === 'target' ? 'Wasserbedarf' : 'Spülkriterium', line: { color: '#164a87' } },
            { x: [p.stages], y: [p.mode === 'target' ? result.freshFlow : result.criterion], customdata: [fmt(p.mode === 'target' ? result.freshFlow : result.criterion)], hovertemplate: `Stufen: %{x}<br>%{customdata}${p.mode === 'target' ? ' L/min' : ''}<extra>Aktuelle Stufenzahl</extra>`, type: 'scatter', mode: 'markers', name: 'Aktuelle Stufenzahl', marker: { color: '#a34c00', size: 12, symbol: 'diamond' } },
            ...(p.mode === 'flow' ? [{ x: [1, MAX_STAGES], y: [p.targetCriterion, p.targetCriterion], customdata: [fmt(p.targetCriterion), fmt(p.targetCriterion)], hovertemplate: '%{customdata}<extra>Vergleichskriterium</extra>', type: 'scatter' as const, mode: 'lines' as const, name: 'Vergleichskriterium', line: { color: '#007053', dash: 'dash' as const } }] : []),
          ]}
          layout={{ separators: ',.', xaxis: { title: { text: 'Anzahl Spülstufen [−]' }, dtick: 1 }, yaxis: { title: { text: p.mode === 'target' ? 'Frischwasserstrom [L/min]' : 'Spülkriterium [−]' }, ...(p.mode === 'target' && result.freshFlow === 0 ? { type: 'linear' as const, tickformat: '.1f' } : powerAxis([...comparisons.map(row => row.result ? p.mode === 'target' ? row.result.freshFlow : row.result.criterion : NaN), ...(p.mode === 'flow' ? [p.targetCriterion] : [])])) }, legend: { orientation: 'h', y: -0.3 } }} />
      </div>
      <h2>Ergebnisse je Stufe</h2>
      <div className="cascade-table"><table><thead><tr><th scope="col">Stufe</th><th scope="col">Konzentration [g/L]</th><th scope="col">Verschleppung hinaus [g/min]</th><th scope="col">Überlauf hinaus [g/min]</th></tr></thead>
        <tbody>{result.concentrations.slice(1).map((value, j) => <tr key={j} aria-current={i === j + 1}><th scope="row"><button onClick={() => setSelected(j + 1)}>Stufe {j + 1}</button></th><td>{fmt(value)}</td><td>{fmt(value * result.dragFlow)}</td><td>{fmt(value * result.freshFlow)}</td></tr>)}</tbody>
      </table></div>
      <p>Abwasser aus Stufe 1: {fmt(result.bathWasteLoad)} g/min Schmutz. Flüssigkeitsfilm nach der letzten Stufe: {fmt(result.outputDragLoad)} g/min Schmutz.</p>
      <div className="button-row"><button onClick={exportCsv}>Ergebnisse als CSV herunterladen</button></div>
      <details><summary>Vergleich aller Stufenzahlen als Tabelle</summary><div className="cascade-table"><table><thead><tr><th scope="col">Spülstufen</th><th scope="col">Wasserstrom [L/min]</th><th scope="col">Endkonzentration [g/L]</th><th scope="col">Spülkriterium [−]</th></tr></thead><tbody>{comparisons.map(row => <tr key={row.stages} aria-current={p.stages === row.stages}><th scope="row">{row.stages}</th><td>{row.result ? fmt(row.result.freshFlow) : '–'}</td><td>{row.result ? fmt(row.result.finalConcentration) : '–'}</td><td>{row.result ? fmt(row.result.criterion) : row.error}</td></tr>)}</tbody></table></div></details>
      {p.mode === 'target' && result.approximateFlow !== null && <details><summary>Exakte Lösung und Näherung vergleichen</summary>
        <p>Exakt: {fmt(result.freshFlow)} L/min. Näherung: {fmt(result.approximateFlow)} L/min.
          {result.freshFlow > 0 && <> Abweichung: +{fmt((result.approximateFlow / result.freshFlow - 1) * 100)} %.</>}</p>
        <p>Die Näherung berücksichtigt die Frischwasserkonzentration; für unbelastetes Frischwasser vereinfacht sie sich entsprechend.</p><ApproximationFormula />
        <p>Die Näherung lässt die kleineren Potenzen in der Summe weg und überschätzt den Mindestwasserbedarf. Sie ist nur bei hinreichend großem R brauchbar. Ein großes Spülkriterium allein garantiert dies bei vielen Stufen nicht.</p>
      </details>}
    </>)}
    <SupportFooter appName="Gegenstromkaskade" reviewed={false} />
  </article>;
}
