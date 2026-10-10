import { useState } from 'react';
import { Chart } from '../../components/Chart';
import { MathExpression, math as m } from '../../components/MathNotation';
import { SupportFooter } from '../../components/SupportFooter';
import { calculate, compareStages, DEFAULTS, MAX_STAGES, type Parameters } from './logic';
import { FlowDiagram, fmt, type LabelMode } from './FlowDiagram';
import './style.css';

export default function App() {
  const [p, setP] = useState<Parameters>({ ...DEFAULTS });
  const [basis, setBasis] = useState('Charge');
  const [selected, setSelected] = useState(1);
  const [labels, setLabels] = useState<LabelMode>('both');
  const [logarithmic, setLogarithmic] = useState(false);
  let result: ReturnType<typeof calculate> | null = null;
  let error = '';
  try { result = calculate(p); } catch (e) { error = (e as Error).message; }
  const comparisons = result ? compareStages(p) : [];
  const update = (key: keyof Parameters, value: number) => setP(old => ({ ...old, [key]: value }));
  const number = (key: keyof Parameters, label: string, min: number, step: number | 'any' = 'any') => <label>{label}
    <input type="number" min={min} step={step} value={Number.isNaN(Number(p[key])) ? '' : Number(p[key])}
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
  const vA = m.index('V̇', 'A');
  const vW = m.index('V̇', 'VE');
  const plus = m.operator('+');
  const eq = m.operator('=');
  const minus = m.operator('−');
  const i = Math.min(selected, p.stages);
  const nextSymbol = i === p.stages ? 'VE' : String(i + 1);
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
    <p>Untersuchen Sie, wie zusätzliche Spülstufen den Wasserbedarf und die Restkonzentration verändern. Bauteile werden vorwärts transportiert, das Spülwasser fließt im Gegenstrom.</p>
    <section className="controls" aria-label="Eingaben">
      <div className="cascade-toolbar"><h2>Spülstufen</h2>
        <button aria-label="Eine Spülstufe entfernen" disabled={p.stages === 1} onClick={() => changeStages(-1)}>−</button>
        <output aria-live="polite" aria-label="Anzahl Spülstufen">{p.stages}</output>
        <button aria-label="Eine Spülstufe hinzufügen" disabled={p.stages === MAX_STAGES} onClick={() => changeStages(1)}>+</button>
        <button onClick={() => { setP({ ...DEFAULTS }); setBasis('Charge'); setSelected(1); setLabels('both'); setLogarithmic(false); }}>Aufgabenbeispiel laden</button>
      </div>
      <fieldset><legend>Betriebsart</legend>
        <label className="radio-label"><input type="radio" name="cascade-mode" checked={p.mode === 'target'} onChange={() => changeMode('target')} />Spülkriterium vorgeben → erforderlichen Frischwasserstrom berechnen</label>
        <label className="radio-label"><input type="radio" name="cascade-mode" checked={p.mode === 'flow'} onChange={() => changeMode('flow')} />Frischwasserstrom vorgeben → erreichtes Spülkriterium berechnen</label>
      </fieldset>
      <div className="input-grid cascade-inputs">
        <label>Bezugsgröße<select value={basis} onChange={e => setBasis(e.target.value)}><option>Charge</option><option>Bauteil</option></select></label>
        {number('area', `Benetzte Oberfläche je ${basis} [m²]`, 0)}
        {number('throughput', `Durchsatz [${basis === 'Charge' ? 'Chargen' : 'Bauteile'}/h]`, 0)}
        {number('specificDrag', 'Spezifische Verschleppung [ml/m²]', 0)}
        {number('initialConcentration', 'Konzentration der eingeschleppten Flüssigkeit c₀ [g/L]', 0)}
        {number('freshConcentration', 'Frischwasserkonzentration cVE [g/L]', 0)}
        {number('targetCriterion', p.mode === 'target' ? 'Gefordertes Spülkriterium Sk = c₀ / cN [−]' : 'Spülkriterium zum Vergleich Sk [−]', 1)}
        {p.mode === 'flow' && number('freshFlow', 'Frischwasserstrom [L/min]', 0)}
      </div>
      <p className="cascade-hint">Oberfläche und Durchsatz beziehen sich auf dieselbe Bezugsgröße. Für eine Charge alle gleichzeitig gespülten Oberflächen zusammenzählen. Oberfläche, Durchsatz, Verschleppung und c₀ müssen größer als 0 sein.</p>
    </section>
    {error && <p className="error" role="alert">{error}</p>}
    {result && <>
      <section className="result" aria-label="Berechnungsergebnisse">
        <dl className="cascade-metrics">
          <div><dt>{p.mode === 'target' ? 'Erforderlicher Frischwasserstrom' : 'Vorgegebener Frischwasserstrom'}</dt><dd>{fmt(result.freshFlow, 6)} L/min</dd></div>
          <div><dt>Verschleppungsstrom</dt><dd>{fmt(result.dragFlow, 6)} L/min</dd></div>
          <div><dt>Endkonzentration cN</dt><dd>{fmt(result.finalConcentration, 6)} g/L</dd></div>
          <div><dt>Erreichtes Spülkriterium</dt><dd>{fmt(result.criterion, 6)}</dd></div>
        </dl>
        <p><strong>{result.meetsTarget ? 'Spülkriterium erfüllt' : 'Spülkriterium nicht erfüllt'}</strong> · Grenzwert: {fmt(result.limit, 6)} g/L · Spülverhältnis R: {fmt(result.ratio, 6)}</p>
        <p>Verschleppung je {basis}: {fmt(result.dragVolume, 6)} L · Frischwasser je {basis}: {fmt(result.freshFlow * 60 / p.throughput, 6)} L</p>
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
        <MathExpression label="Volumenbilanz: Verschleppung plus Wasserzulauf minus Verschleppung minus Wasserablauf gleich null">{m.row(vA, plus, vW, minus, vA, minus, vW, eq, m.number('0'))}</MathExpression>
        <p>Schmutzmassenbilanz: Eingehende Schmutzströme entsprechen den ausgehenden Schmutzströmen.</p>
        <div className="cascade-equation"><MathExpression label={`Schmutzbilanz für Stufe ${i}`}>
          {m.row(vA, c(String(i - 1)), plus, vW, c(nextSymbol), minus, vA, c(String(i)), minus, vW, c(String(i)), eq, m.number('0'))}
        </MathExpression></div>
        {balances && <p>{fmt(balances.dragIn, 6)} + {fmt(balances.waterIn, 6)} − {fmt(balances.dragOut, 6)} − {fmt(balances.waterOut, 6)} = {fmt(balances.dragIn + balances.waterIn - balances.dragOut - balances.waterOut, 3)} g/min</p>}
        <p className="cascade-hint">c₀ ist die Eingangskonzentration des Flüssigkeitsfilms; in der letzten Stufe stammt der Wasserzulauf aus dem Frischwasser mit cVE. Alle Zahlen werden erst für die Anzeige gerundet.</p>
      </section>
      <div className="cascade-chart-options"><label><input type="checkbox" checked={logarithmic} onChange={e => setLogarithmic(e.target.checked)} /> Konzentrationen logarithmisch darstellen</label></div>
      <div className="charts">
        <Chart title="Konzentration entlang der Kaskade" description="Stufe 0 bezeichnet die eingeschleppte Flüssigkeit. Die gestrichelte Linie markiert die erlaubte Endkonzentration."
          data={[
            { x: result.concentrations.map((_, j) => j), y: result.concentrations, type: 'scatter', mode: 'lines+markers', name: 'Konzentration', line: { color: '#164a87' } },
            { x: [0, p.stages], y: [result.limit, result.limit], type: 'scatter', mode: 'lines', name: 'Grenzwert', line: { color: '#a34c00', dash: 'dash' } },
            ...(p.freshConcentration > 0 ? [{ x: [0, p.stages], y: [p.freshConcentration, p.freshConcentration], type: 'scatter' as const, mode: 'lines' as const, name: 'Frischwasser', line: { color: '#007053', dash: 'dot' as const } }] : []),
          ]}
          layout={{ xaxis: { title: { text: 'Spülstufe [−]' }, dtick: 1 }, yaxis: { title: { text: 'Konzentration [g/L]' }, type: logarithmic ? 'log' : 'linear' }, legend: { orientation: 'h', y: -0.3 } }} />
        <Chart title={p.mode === 'target' ? 'Wasserbedarf nach Stufenzahl' : 'Spülwirkung nach Stufenzahl'}
          description={p.mode === 'target' ? 'Gleiches Spülkriterium und gleicher Durchsatz für alle Varianten. Der aktuelle Aufbau ist orange markiert.' : 'Gleicher Frischwasserstrom und gleicher Durchsatz für alle Varianten. Die gestrichelte Linie zeigt das Vergleichskriterium.'}
          data={[
            { x: comparisons.map(row => row.stages), y: comparisons.map(row => row.result ? p.mode === 'target' ? row.result.freshFlow : row.result.criterion : null), type: 'scatter', mode: 'lines+markers', name: p.mode === 'target' ? 'Wasserbedarf' : 'Spülkriterium', line: { color: '#164a87' } },
            { x: [p.stages], y: [p.mode === 'target' ? result.freshFlow : result.criterion], type: 'scatter', mode: 'markers', name: 'Aktuelle Stufenzahl', marker: { color: '#a34c00', size: 12, symbol: 'diamond' } },
            ...(p.mode === 'flow' ? [{ x: [1, MAX_STAGES], y: [p.targetCriterion, p.targetCriterion], type: 'scatter' as const, mode: 'lines' as const, name: 'Vergleichskriterium', line: { color: '#007053', dash: 'dash' as const } }] : []),
          ]}
          layout={{ xaxis: { title: { text: 'Anzahl Spülstufen [−]' }, dtick: 1 }, yaxis: { title: { text: p.mode === 'target' ? 'Frischwasserstrom [L/min]' : 'Spülkriterium [−]' }, type: p.mode === 'target' && result.freshFlow === 0 ? 'linear' : 'log' }, legend: { orientation: 'h', y: -0.3 } }} />
      </div>
      <h2>Ergebnisse je Stufe</h2>
      <div className="cascade-table"><table><thead><tr><th scope="col">Stufe</th><th scope="col">Konzentration [g/L]</th><th scope="col">Verschleppung hinaus [g/min]</th><th scope="col">Überlauf hinaus [g/min]</th></tr></thead>
        <tbody>{result.concentrations.slice(1).map((value, j) => <tr key={j} aria-current={i === j + 1}><th scope="row"><button onClick={() => setSelected(j + 1)}>Stufe {j + 1}</button></th><td>{fmt(value, 6)}</td><td>{fmt(value * result.dragFlow, 6)}</td><td>{fmt(value * result.freshFlow, 6)}</td></tr>)}</tbody>
      </table></div>
      <p>Abwasser aus Stufe 1: {fmt(result.bathWasteLoad, 6)} g/min Schmutz. Flüssigkeitsfilm nach der letzten Stufe: {fmt(result.outputDragLoad, 6)} g/min Schmutz.</p>
      <div className="button-row"><button onClick={exportCsv}>Ergebnisse als CSV herunterladen</button></div>
      <details><summary>Vergleich aller Stufenzahlen als Tabelle</summary><div className="cascade-table"><table><thead><tr><th scope="col">Spülstufen</th><th scope="col">Wasserstrom [L/min]</th><th scope="col">Endkonzentration [g/L]</th><th scope="col">Spülkriterium [−]</th></tr></thead><tbody>{comparisons.map(row => <tr key={row.stages} aria-current={p.stages === row.stages}><th scope="row">{row.stages}</th><td>{row.result ? fmt(row.result.freshFlow, 6) : '–'}</td><td>{row.result ? fmt(row.result.finalConcentration, 6) : '–'}</td><td>{row.result ? fmt(row.result.criterion, 6) : row.error}</td></tr>)}</tbody></table></div></details>
      {p.mode === 'target' && result.approximateFlow !== null && <details><summary>Exakte Lösung und Näherung vergleichen</summary>
        <p>Exakt: {fmt(result.freshFlow, 6)} L/min. Näherung: {fmt(result.approximateFlow, 6)} L/min.
          {result.freshFlow > 0 && <> Abweichung: +{fmt((result.approximateFlow / result.freshFlow - 1) * 100, 4)} %.</>}</p>
        <p>Für unbelastetes Frischwasser gilt R ≈ Sk<sup>1/N</sup>. Bei belastetem Frischwasser wird stattdessen [(c₀ − cVE) / (c₀/Sk − cVE)]<sup>1/N</sup> verwendet.</p>
        <p>Die Näherung lässt die kleineren Potenzen in der Summe weg und überschätzt den Mindestwasserbedarf. Sie ist nur bei hinreichend großem R brauchbar. Ein großes Spülkriterium allein garantiert dies bei vielen Stufen nicht.</p>
      </details>}
    </>}
    <details><summary>Berechnungsmodell und Annahmen</summary>
      <p>Stationärer Zustand, ideal durchmischte Becken, inkompressible Flüssigkeit mit näherungsweise gleicher Dichte. Der mitgeführte Flüssigkeitsfilm nimmt nach jeder Spülstufe deren Konzentration an. Der Verschleppungsstrom bleibt an allen Stufen gleich. Verdunstung, Reaktion und zusätzliche Flüssigkeitsverluste werden vernachlässigt.</p>
      <p>Die Eingangskonzentration beschreibt Schmutz in der mitgeführten Flüssigkeit, keine unabhängig auf der Oberfläche haftende Schmutzmasse. Die Zahl der Stufen ist auf 1 bis 8 begrenzt. Für eine Nullstufen-Anlage gilt dieses Modell nicht.</p>
      <div className="cascade-equation"><MathExpression label="Verschleppungsstrom in Liter je Minute gleich Fläche mal spezifische Verschleppung mal Durchsatz geteilt durch 60000">
        {m.row(vA, eq, m.fraction(m.row(m.identifier('A'), m.operator('·'), m.index('v', 'A'), m.operator('·'), m.identifier('ṅ')), m.number('60000')))}
      </MathExpression></div>
      <p>Einheiten dieser Umrechnung: A in m², vA in ml/m² und Durchsatz in 1/h; Ergebnis in L/min.</p>
      <div className="cascade-equation"><MathExpression label="Spülverhältnis gleich Frischwasserstrom geteilt durch Verschleppungsstrom">
        {m.row(m.identifier('R'), eq, m.fraction(vW, vA))}
      </MathExpression></div>
      <p>Mit Sⱼ = 1 + R + … + Rʲ gilt für jede Stufe i:</p>
      <div className="cascade-equation"><MathExpression label="Konzentration in Stufe i gleich Frischwasserkonzentration plus Eingangskonzentration minus Frischwasserkonzentration mal S N minus i geteilt durch S N">
        {m.row(c('i'), eq, c('VE'), plus, m.operator('('), c('0'), minus, c('VE'), m.operator(')'), m.operator('·'), m.fraction(m.index('S', 'N−i'), m.index('S', 'N')))}
      </MathExpression></div>
      <p>Bei unbelastetem Frischwasser folgt Sk = Sₙ. Für R = 1 ergibt sich cᵢ = cVE + (c₀ − cVE) · (N − i + 1)/(N + 1). Bei Wasserstrom 0 findet stationär keine Verdünnung statt.</p>
      <p>Bei cVE &gt; 0 ist c₀/cVE die asymptotische Obergrenze des erreichbaren Spülkriteriums, sofern cVE &lt; c₀. Ein Ziel genau an dieser Grenze benötigt einen unendlich großen Wasserstrom.</p>
      <p>Die Mindestwassermenge wird numerisch aus der vollständigen Bilanz berechnet. Beckenvolumen, Bauteilmasse, Verweilzeit und Transportzeit gehen in dieses stationäre Idealmodell nicht ein. Der Durchsatz wird direkt vorgegeben.</p>
    </details>
    <SupportFooter appName="Gegenstromkaskade" reviewed={false} />
  </article>;
}
