import { useMemo, useState } from 'react';
import { Chart } from '../../components/Chart';
import { FlowDiagram } from './FlowDiagram';
import { fmt } from './format';
import { powerAxis } from './display';
import { simulate } from './transient';
import type { Parameters } from './logic';

export function TransientPanel({ p }: { p: Parameters }) {
  const [volume, setVolume] = useState(2744);
  const [initial, setInitial] = useState(p.freshConcentration);
  const [count, setCount] = useState(1000);
  const [selected, setSelected] = useState(1);
  const [log, setLog] = useState(false);
  const [stage, setStage] = useState(1);
  const computation = useMemo(() => {
    try { return { result: simulate(p, { volume, initial, count }), error: '' }; }
    catch (error) { return { result: null, error: (error as Error).message }; }
  }, [p, volume, initial, count]);
  const r = computation.result;
  const part = r?.parts[Math.min(Math.max(selected, 1), count) - 1];
  const update = (value: string, set: (n: number) => void) => set(value === '' ? NaN : Number(value));
  const limit = p.initialConcentration / p.targetCriterion;
  const profiles = r ? r.parts.filter((_, index) => index % Math.max(1, Math.ceil(count / 60)) === 0 || index === count - 1) : [];
  const endValues = r?.parts.map(row => row.concentrations[p.stages]) ?? [];
  const meets = part ? part.concentrations[p.stages] <= limit : false;
  const exportCsv = () => {
    if (!r) return;
    const header = ['Bauteil', 'Austrittszeit [min]', ...Array.from({ length: p.stages + 1 }, (_, i) => `c_${i} [g/L]`)];
    const rows = r.parts.map(row => [row.number, row.timeMinutes, ...row.concentrations]);
    const content = '\ufeff' + [header, ...rows].map(row => row.map(v => typeof v === 'number' ? v.toLocaleString('de-DE', { maximumSignificantDigits: 15 }) : v).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'gegenstromkaskade-instationaer.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="cascade-transient">
    <section className="controls"><h2>Instationäre Berechnung</h2>
      <div className="input-grid">
        <label>Flüssigkeitsvolumen je Becken [L]<input type="number" min="0" value={Number.isNaN(volume) ? '' : volume} onChange={e => update(e.target.value, setVolume)} /></label>
        <label>Anfangskonzentration aller Becken [g/L]<input type="number" min="0" step="any" value={Number.isNaN(initial) ? '' : initial} onChange={e => update(e.target.value, setInitial)} /></label>
        <label>Anzahl ausgewerteter Bauteile<input type="number" min="1" max="10000" step="1" value={Number.isNaN(count) ? '' : count} onChange={e => update(e.target.value, setCount)} /></label>
      </div>
      <button className="cascade-reset-initial" onClick={() => setInitial(p.freshConcentration)}>Anfangskonzentration = Frischwasserkonzentration</button>
      <p className="cascade-hint">Gleiche Flüssigkeitsvolumina in allen Becken. Die Anlage ist anfangs ohne Bauteile. Bei jedem Wechsel rücken alle Bauteile eine Stufe weiter und ein neues tritt ein. Zwischen den Wechseln fließt das Wasser kontinuierlich.</p>
    </section>
    {computation.error && <p className="error" role="alert">{computation.error}</p>}
    {r && part && <>
      <section className="controls"><h2>Bauteil auswählen</h2>
        <div className="cascade-part-picker"><button disabled={part.number === 1} onClick={() => setSelected(part.number - 1)}>←</button>
          <label>Bauteilnummer<input type="number" min="1" max={count} step="1" value={part.number} onChange={e => setSelected(Math.max(1, Math.min(count, Math.round(Number(e.target.value) || 1))))} /></label>
          <button disabled={part.number === count} onClick={() => setSelected(part.number + 1)}>→</button></div>
        <input aria-label="Bauteil auswählen" type="range" min="1" max={count} step="1" value={part.number} onChange={e => setSelected(Number(e.target.value))} />
      </section>
      <section className="result"><h2>Bauteil {part.number}</h2>
        <p>Austritt nach {fmt(part.timeMinutes)} min</p><p>Endkonzentration: {fmt(part.concentrations[p.stages])} g/L</p>
        <p><strong>{meets ? 'Spülkriterium erfüllt' : 'Spülkriterium nicht erfüllt'}</strong></p><p>Grenzwert: {fmt(limit)} g/L</p>
        <p>Frischwasserstrom: {fmt(r.stationary.freshFlow)} L/min</p><p>Zeit zwischen zwei Bauteilen: {fmt(r.intervalMinutes * 60)} s</p>
        <p>Stationäre Referenz: {fmt(r.stationary.finalConcentration)} g/L</p>
        <p>{r.repeating ? 'Die Konzentrationen wiederholen sich am Simulationsende nahezu von Bauteil zu Bauteil.' : 'Ein wiederkehrender Zustand ist am Simulationsende noch nicht nachgewiesen.'}</p>
        <p className="cascade-hint">Prüfung aller Becken bei gleicher Zyklusphase über die letzten 10 Bauteilwechsel: maximale Änderung kleiner als 0,001 % der größten vorgegebenen Konzentration. Kleine Änderungen sind kein Beweis, dass der Grenzzustand bereits erreicht ist; bei Bedarf mehr Bauteile berechnen.</p>
      </section>
      <label className="cascade-chart-options"><input type="checkbox" checked={log} onChange={e => setLog(e.target.checked)} /> Konzentrationen logarithmisch darstellen</label>
      {log && [...part.concentrations, ...endValues].some(v => v === 0) && <p className="cascade-hint">Nullkonzentrationen können auf logarithmischen Achsen nicht dargestellt werden. Für diese Werte die lineare Darstellung wählen.</p>}
      <div className="charts">
        <Chart title="Konzentrationsverlauf des Bauteils" description="Hellgrau: weitere Bauteile. Schwarz mit Punkten: ausgewähltes Bauteil. Blau gestrichelt: kontinuierliche stationäre Referenz. Jeder Punkt ist die Filmkonzentration beim Austritt aus dieser Stufe."
          data={[
            ...profiles.filter(row => row.number !== part.number).map((row, i) => ({ x: row.concentrations.map((_, k) => k), y: row.concentrations, type: 'scatter' as const, mode: 'lines' as const, name: 'Weitere Bauteile', legendgroup: 'history', showlegend: i === 0, line: { color: '#b6b6b6', width: 1 }, hoverinfo: 'skip' as const })),
            { x: r.stationary.concentrations.map((_, k) => k), y: r.stationary.concentrations, type: 'scatter', mode: 'lines', name: 'Stationäre Referenz', line: { color: '#164a87', dash: 'dash' } },
            { x: part.concentrations.map((_, k) => k), y: part.concentrations, customdata: part.concentrations.map(fmt), hovertemplate: 'Stufe %{x}<br>%{customdata} g/L<extra>Ausgewähltes Bauteil</extra>', type: 'scatter', mode: 'lines+markers', name: `Bauteil ${part.number}`, line: { color: '#000', width: 3 }, marker: { color: '#000', size: 8 } },
          ]}
          layout={{ separators: ',.', xaxis: { title: { text: 'Spülstufe [−]' }, dtick: 1 }, yaxis: { title: { text: 'Filmkonzentration [g/L]' }, ...(log ? powerAxis([...part.concentrations, ...endValues, ...r.stationary.concentrations, ...profiles.flatMap(row => row.concentrations)]) : { type: 'linear' as const, tickformat: '.1f' }) }, legend: { orientation: 'h', y: -0.3 } }} />
        <Chart title="Endkonzentration über Bauteilnummer" description="Zeigt die Anlaufphase und die Annäherung an einen wiederkehrenden Zustand. Das ausgewählte Bauteil ist schwarz markiert."
          data={[
            { x: r.parts.map(row => row.number), y: endValues, customdata: endValues.map(fmt), hovertemplate: 'Bauteil %{x}<br>%{customdata} g/L<extra>Endkonzentration</extra>', type: 'scatter', mode: 'lines', name: 'Endkonzentration', line: { color: '#888' } },
            { x: [1, count], y: [r.stationary.finalConcentration, r.stationary.finalConcentration], type: 'scatter', mode: 'lines', name: 'Stationäre Referenz', line: { color: '#164a87', dash: 'dash' } },
            { x: [1, count], y: [limit, limit], type: 'scatter', mode: 'lines', name: 'Grenzwert', line: { color: '#a34c00', dash: 'dot' } },
            { x: [part.number], y: [part.concentrations[p.stages]], type: 'scatter', mode: 'markers', name: `Bauteil ${part.number}`, marker: { color: '#000', size: 11, symbol: 'diamond' } },
          ]}
          layout={{ separators: ',.', xaxis: { title: { text: 'Bauteilnummer [−]' }, tickformat: '.0f' }, yaxis: { title: { text: 'Endkonzentration [g/L]' }, ...(log ? powerAxis([...endValues, limit, r.stationary.finalConcentration]) : { type: 'linear' as const, tickformat: '.1f' }) }, legend: { orientation: 'h', y: -0.3 } }} />
      </div>
      {count > 60 && <p className="cascade-hint">Für die Übersicht werden höchstens 61 graue Profile gezeigt. Alle {count} Bauteile sind berechnet und einzeln auswählbar; die Endkonzentrationskurve enthält alle Bauteile.</p>}
      <h2>Beckenzustand beim Austritt von Bauteil {part.number}</h2>
      <p className="cascade-hint">Dieses Fließbild zeigt alle Becken zum selben Zeitpunkt unmittelbar vor dem Wechsel. Der Bauteilverlauf oben zeigt dagegen Austrittswerte aus unterschiedlichen Zeitpunkten. Die Wasserüberläufe im Fließbild sind die kontinuierlichen Ströme zwischen den Wechseln.</p>
      <FlowDiagram p={p} result={{ ...r.stationary, concentrations: [p.initialConcentration, ...part.bathsAtExit] }} labels="both" actionLabel="Stufe auswählen" selected={Math.min(stage, p.stages)} onSelect={setStage} />
      <p>Ausgewählte Stufe {Math.min(stage, p.stages)}: {fmt(part.bathsAtExit[Math.min(stage, p.stages) - 1])} g/L beim Endaustritt.</p><div className="cascade-table"><table><thead><tr><th>Stufe</th><th>Bauteilfilm beim Austritt [g/L]</th><th>Becken beim Endaustritt [g/L]</th></tr></thead><tbody>{part.concentrations.slice(1).map((v, i) => <tr key={i}><th scope="row">{i + 1}</th><td>{fmt(v)}</td><td>{fmt(part.bathsAtExit[i])}</td></tr>)}</tbody></table></div>
      <button onClick={exportCsv}>Alle Bauteilverläufe als CSV herunterladen</button>
    </>}
  </section>;
}
