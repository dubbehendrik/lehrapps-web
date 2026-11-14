import { useState } from 'react';
import { SupportFooter } from '../../components/SupportFooter';
import { defaultSettings, formatNumber as fmt, momentMean, quantile, syntheticDatasets, weightedPopulation } from './logic';
import { ProgramDescription } from './ProgramDescription';
import { PlotPane } from './PlotPane';
import { exportDataset, importDataset } from './workbook';
import type { Dataset, PlotSettings } from './types';
import './style.css';
export default function App() {
  const [datasets, setDatasets] = useState<Dataset[]>(syntheticDatasets);
  const [plots, setPlots] = useState<[PlotSettings, PlotSettings]>(() => [defaultSettings(0), defaultSettings(3)]);
  const [linked, setLinked] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const act = async (action: () => Promise<void>) => { setBusy(true); setError(''); setMessage(''); try { await action(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  const updatePlot = (i: number, next: PlotSettings) => setPlots(old => linked ? [structuredClone(next), structuredClone(next)] : i === 0 ? [next, old[1]] : [old[0], next]);
  return <article className="drop-app"><h1>Tropfengrößenverteilung</h1><ProgramDescription />
    <section className="controls"><h2>Datenmaterial und Excel-Vorlage</h2><p>Beide Beispiele sind <strong>synthetische Einzeltropfen</strong> für die Lehre zur Spritzlackapplikation. A ist feiner und enger, B gröber und breiter. Sie repräsentieren keine bestimmten Zerstäuber oder Betriebspunkte.</p>
      <p>Die Excel-Dateien enthalten auf dem ersten Blatt nur <strong>„Durchmesser [µm]“</strong> und einen Tropfen pro Zeile. Für eigene Messungen die Werte ersetzen und wieder hochladen. Die leere Vorlage enthält keine Beispieltropfen.</p>
      <div className="button-row"><button disabled={busy} onClick={() => act(() => exportDataset())}>Leere Excel-Vorlage herunterladen</button>{datasets.slice(0, 2).map(d => <button key={d.id} disabled={busy} onClick={() => act(() => exportDataset(d))}>Datensatz {d.id.toUpperCase()} herunterladen (.xlsx)</button>)}</div>
      <label className="drop-import">Eigene Einzeltropfen importieren (.xlsx)<input type="file" accept=".xlsx" disabled={busy || datasets.length >= 4} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void act(async () => { if (datasets.length >= 4) throw new Error('Höchstens vier Datensätze. Bitte einen importierten Datensatz entfernen.'); const d = await importDataset(file); setDatasets(old => [...old, d]); setMessage(`${d.name}: ${d.diameters.length} Tropfen geladen. In den Ploteinstellungen auswählbar.`); }); }} /></label>
      {busy && <p role="status">Datei wird verarbeitet …</p>}{error && <p role="alert" className="error">{error}</p>}{message && <p role="status" className="drop-note">{message}</p>}
      <div className="drop-table"><table><thead><tr><th>Datensatz</th><th>Tropfenanzahl</th><th>D<sub>v,50</sub> [µm]</th><th>D<sub>3,2</sub> [µm]</th><th>Span [–]</th><th>Aktionen</th></tr></thead><tbody>{datasets.map(d => { const v = weightedPopulation(d.diameters, 3), median = quantile(v, 0.5); return <tr key={d.id}><td>{d.name}<br /><small>{d.synthetic ? 'Synthetische Lehrdaten' : 'Eigener Import · Herkunft nicht geprüft'}</small></td><td>{d.diameters.length.toLocaleString('de-DE')}</td><td>{fmt(median)}</td><td>{fmt(momentMean(d.diameters, 3, 2))}</td><td>{fmt((quantile(v, 0.9) - quantile(v, 0.1)) / median)}</td><td>{!d.synthetic && <><button disabled={busy} onClick={() => act(() => exportDataset(d))}>Herunterladen</button><button onClick={() => { setDatasets(old => old.filter(x => x.id !== d.id)); setPlots(old => old.map(p => ({ ...p, datasetIds: p.datasetIds.filter(id => id !== d.id) })) as [PlotSettings, PlotSettings]); }}>Entfernen</button></>}</td></tr>; })}</tbody></table></div>
    </section>
    <section className="controls"><h2>Vergleich vorbereiten</h2><div className="button-row"><button onClick={() => { setLinked(false); setPlots([defaultSettings(0), defaultSettings(3)]); }}>A: Anzahl gegenüber Volumen</button><button onClick={() => { setLinked(false); setPlots([{ ...defaultSettings(3), datasetIds: ['a'] }, { ...defaultSettings(3), datasetIds: ['b'] }]); }}>A und B: Volumen vergleichen</button><button onClick={() => { setLinked(false); setPlots([{ ...defaultSettings(0), width: 5 }, { ...defaultSettings(0), width: 10 }]); }}>A: 5 gegenüber 10 µm</button><button onClick={() => { setLinked(false); setPlots([{ ...defaultSettings(0), datasetIds: ['a', 'b'], means: [], quantileOrders: [] }, { ...defaultSettings(3), datasetIds: ['a', 'b'] }]); }}>A und B überlagern</button></div>
      <label className="drop-check"><input type="checkbox" checked={linked} onChange={e => { setLinked(e.target.checked); if (e.target.checked) setPlots(old => [old[0], structuredClone(old[0])]); }} />Einstellungen beider Plots koppeln (beim Aktivieren wird Plot 1 übernommen)</label>
    </section>
    {plots.map((settings, i) => <PlotPane key={i} number={i + 1} datasets={datasets} settings={settings} onChange={next => updatePlot(i, next)} />)}
    <SupportFooter appName="Tropfengrößenverteilung" reviewed={false} />
  </article>;
}
