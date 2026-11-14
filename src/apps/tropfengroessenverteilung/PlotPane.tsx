import { useMemo, useState } from 'react';
import type { Data, Layout } from 'plotly.js';
import { cumulativeCurve, curveAt } from './curves';
import { Chart } from '../../components/Chart';
import { classEdges, cumulativeAt, formatNumber as fmt, histogram, momentMean, orderNames, quantile, weightedPopulation } from './logic';
import type { Dataset, Order, PlotSettings } from './types';
const palettes = [['#087b98', '#138cad', '#37a7bf', '#317e99', '#07556e', '#238294', '#408fb4', '#4b7c91'], ['#8c3505', '#bd5108', '#d77515', '#9f642f', '#5e2507', '#ad4429', '#c18734', '#835b43']];
const shade = (hex: string) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},0.16)`;
const subs = ['₀', '₁', '₂', '₃'];
const quantileNames = ['n', 'L', 'A', 'v'];
function toggle<T>(values: T[], value: T): T[] { return values.includes(value) ? values.filter(x => x !== value) : [...values, value]; }
export function PlotPane({ number, datasets, settings: s, onChange }: { number: number; datasets: Dataset[]; settings: PlotSettings; onChange: (s: PlotSettings) => void }) {
  const colors = palettes[number === 1 ? 0 : 1];
  const [cursor, setCursor] = useState(50), [customPercentile, setCustomPercentile] = useState('25'), [percentileError, setPercentileError] = useState('');
  const update = (patch: Partial<PlotSettings>) => onChange({ ...s, ...patch });
  const selected = datasets.filter(d => s.datasetIds.includes(d.id));
  const populations = useMemo(() => datasets.map(dataset => ({ dataset, populations: ([0, 1, 2, 3] as Order[]).map(r => weightedPopulation(dataset.diameters, r)) })), [datasets]);
  const active = populations.filter(p => s.datasetIds.includes(p.dataset.id));
  const chart = useMemo(() => {
    const traces: Data[] = [], shapes: NonNullable<Partial<Layout>['shapes']> = [];
    const markers: { dataset: string; label: string; value: number; color: string; meaning: string; key: string; symbol: string; targetOrder?: Order }[] = [];
    try {
      if (!selected.length) throw new Error('Bitte mindestens einen Datensatz auswählen.');
      const min = selected.reduce((m, d) => d.diameters.reduce((a, x) => Math.min(a, x), m), Infinity);
      const max = selected.reduce((m, d) => d.diameters.reduce((a, x) => Math.max(a, x), m), 0);
      const edges = classEdges([min, max], s);
      if (s.ordinate === 'logDensity' && edges[0] <= 0 && s.distribution) throw new Error('Eine Dichte pro logarithmischem Intervall benötigt positive Klassengrenzen. Bitte logarithmische Klassierung wählen.');
      const displayLow = s.logarithmicAxis && edges[0] === 0 ? Math.min(min / 1.15, edges[1] / 2) : edges[0];
      const xEdges = [displayLow, ...edges.slice(1)];
      const fills: Data[] = [], outlines: Data[] = [], sums: Data[] = [], guides: Data[] = [];
      const symbols = ['circle', 'square', 'diamond', 'triangle-up', 'triangle-down', 'pentagon', 'hexagon', 'star', 'hexagram', 'star-triangle-up', 'star-triangle-down', 'star-square', 'star-diamond', 'diamond-tall', 'diamond-wide', 'octagon', 'cross', 'x', 'triangle-left', 'triangle-right', 'hourglass', 'bowtie', 'circle-cross', 'circle-x', 'square-cross', 'square-x', 'diamond-cross', 'diamond-x'] as const;
      for (const [datasetIndex, entry] of active.entries()) {
        const datasetLabel = entry.dataset.name;
        const code = entry.dataset.id === 'a' ? 'A' : entry.dataset.id === 'b' ? 'B' : `Import ${datasets.findIndex(d => d.id === entry.dataset.id) - 1}`;
        const bins = entry.populations.map(pop => histogram(pop, edges));
        const curves = entry.populations.map((pop, r) => cumulativeCurve(pop, bins[r], s.cumulativeMode, s.logarithmicAxis, displayLow));
        const visibleOrders = s.cumulative ? s.cumulativeOrders : [];
        const primaryOrder = visibleOrders.includes(3) ? 3 : visibleOrders[0];
        const addMarker = (key: string, label: string, value: number, color: string, meaning: string, symbolIndex: number, preferred?: Order) => {
          const targetOrder = preferred !== undefined && visibleOrders.includes(preferred) ? preferred : primaryOrder;
          const height = targetOrder === undefined ? 0 : curveAt(curves[targetOrder], value);
          const symbol = symbols[symbolIndex % symbols.length];
          const markerKey = `${entry.dataset.id}:${key}`;
          const visible = !s.hiddenMarkers.includes(markerKey);
          markers.push({ dataset: datasetLabel, label, value, color, meaning, key: markerKey, symbol, targetOrder });
          const group = `marker:${markerKey}`;
          // Controlled visibility applies to the entire marker group, including both guides.
          if (targetOrder !== undefined) guides.push({ type: 'scatter', mode: 'lines', meta: { markerKey }, legendgroup: group,
            visible: visible ? true : 'legendonly', showlegend: false, hoverinfo: 'skip',
            x: [value, value, null, s.distribution ? edges[edges.length - 1] : displayLow, value],
            y: [0, height, null, height, height], yaxis: 'y2', line: { color, width: 1.4, dash: 'dash' } });
          guides.push({ type: 'scatter', mode: 'markers', name: `${code} · D<sub>${label.slice(1)}</sub> = ${fmt(value)} µm${targetOrder === undefined ? '' : ` · Q${subs[targetOrder]}`}`,
            meta: { markerKey }, legendgroup: group, visible: visible ? true : 'legendonly', showlegend: true,
            x: [value], y: [height], yaxis: 'y2', marker: { color, size: 11, symbol, line: { color: '#ffffff', width: 0.8 } },
            hovertemplate: `${code} · D<sub>${label.slice(1)}</sub> = ${fmt(value)} µm<br>Summenanteil auf dargestellter Kurve: %{y:.1f} %<extra></extra>` });
        };
        for (const r of [...new Set([...s.orders, ...s.cumulativeOrders])]) {
          const color = colors[(r + datasetIndex * 4) % colors.length], label = `${code} · ${orderNames[r]}`;
          if (s.distribution && s.orders.includes(r)) {
            const values = bins[r][s.ordinate === 'share' ? 'shares' : s.ordinate].map(x => x * 100);
            const group = `hist:${entry.dataset.id}:${r}`;
            const x = [displayLow, ...xEdges], y = [0, ...values, 0];
            fills.push({ type: 'scatter', mode: 'lines', legendgroup: group, x, y, showlegend: false, hoverinfo: 'skip',
              fill: 'tozeroy', fillcolor: shade(color), line: { color, width: 0, shape: 'hv' } });
            const boundaryX: (number | null)[] = [], boundaryY: (number | null)[] = [];
            for (let k = 1; k < xEdges.length - 1; k++) {
              const top = Math.max(values[k - 1], values[k]);
              if (top > 0) { boundaryX.push(xEdges[k], xEdges[k], null); boundaryY.push(0, top, null); }
            }
            outlines.push({ type: 'scatter', mode: 'lines', legendgroup: group, x: boundaryX, y: boundaryY, showlegend: false, hoverinfo: 'skip', line: { color, width: 1.6 }, opacity: 0.8 });
            outlines.push({ type: 'scatter', mode: 'lines', legendgroup: group, name: `${label} · ${s.ordinate === 'share' ? 'ΔQ' : 'q'}${subs[r]}`, x, y,
              line: { color, width: 2.5, shape: 'hv' }, hovertemplate: `${label}<br>D = %{x:.1f} µm<br>Höhe = %{y:.1f}<extra></extra>` });
          }
          if (s.cumulative && s.cumulativeOrders.includes(r)) sums.push({ type: 'scatter', mode: 'lines', name: `${label} · Q${subs[r]}`,
            x: curves[r].x, y: curves[r].y, yaxis: 'y2',
            line: { color, width: 3.8, shape: s.cumulativeMode === 'empirical' ? 'hv' : 'linear', dash: 'solid' },
            hovertemplate: `${label}<br>D = %{x:.1f} µm<br>Q${subs[r]} = %{y:.1f} %<extra></extra>` });
        }
        if (!s.distribution && !s.cumulative) continue;
        for (const r of s.quantileOrders) for (const p of s.percentiles) {
          const value = quantile(entry.populations[r], p / 100), label = `D${quantileNames[r]},${fmt(p)}`;
          const slot = p === 10 ? 0 : p === 50 ? 1 : p === 90 ? 2 : 3 + s.percentiles.filter(v => ![10, 50, 90].includes(v)).sort((a, b) => a - b).indexOf(p);
          addMarker(`q:${r}:${p}`, label, value, colors[(r + datasetIndex * 4) % colors.length], `${fmt(p)}-%-Quantil · ${orderNames[r]}`, r === 3 ? slot : 11 + r * 8 + slot, r);
        }
        for (const mean of s.means) {
          const [p, q] = mean.split(',').map(Number), value = momentMean(entry.dataset.diameters, p, q);
          addMarker(`m:${mean}`, `D${mean}`, value, colors[mean === '3,2' ? 4 : mean === '4,3' ? 1 : 3],
            mean === '3,2' ? 'Sauter-Durchmesser' : mean === '4,3' ? 'Volumengewichtetes Mittel' : 'Arithmetisches Mittel',
            mean === '3,2' ? 5 : mean === '4,3' ? 7 : 6);
        }
      }
      traces.push(...fills, ...outlines, ...sums, ...guides);
      const ordinateLabel = s.ordinate === 'share' ? 'Klassenanteil ΔQ [%]' : s.ordinate === 'density' ? 'Verteilungsdichte q [%/µm]' : 'Logarithmische Dichte [%/Dekade]';
      const legendCount = traces.filter(t => !('showlegend' in t) || t.showlegend !== false).length;
      const height = 480 + 32 * legendCount;
      const layout: Partial<Layout> = { height, margin: { l: 85, r: s.cumulative ? 75 : 25, t: 20, b: 90 + 32 * legendCount },
        xaxis: { title: { text: 'Tropfendurchmesser D [µm]' }, type: s.logarithmicAxis ? 'log' : 'linear', ...(s.logarithmicAxis ? { dtick: 'D2' } : {}), range: s.logarithmicAxis ? [Math.log10(displayLow), Math.log10(edges[edges.length - 1])] : [edges[0], edges[edges.length - 1]], tickformat: max < 0.1 || max >= 1e5 ? '.1e' : '.1~f', automargin: true },
        yaxis: { title: { text: ordinateLabel }, rangemode: 'tozero', visible: s.distribution, tickformat: s.ordinate === 'density' && max > 10000 ? '.1e' : '.1~f', automargin: true },
        yaxis2: { title: { text: 'Summenanteil Q [%]' }, overlaying: 'y', side: s.distribution ? 'right' : 'left', range: [0, 100], tickvals: [0, 20, 40, 60, 80, 100], visible: s.cumulative, showgrid: !s.distribution, tickformat: '.0f', automargin: true },
        legend: { orientation: 'v', x: 0, y: -0.24, yanchor: 'top', font: { size: 14 }, groupclick: 'togglegroup' }, shapes, hovermode: 'closest' };
      return { traces, layout, height, markers, edges, min, max, error: '', clipped: s.logarithmicAxis && edges[0] === 0 };
    } catch (e) { return { traces, layout: {}, height: 480, markers, edges: [], min: 0, max: 0, error: (e as Error).message, clipped: false }; }
  }, [s, datasets, populations, number]);
  const checkbox = (label: React.ReactNode, checked: boolean, onToggle: () => void) => <label className="drop-check"><input type="checkbox" checked={checked} onChange={onToggle} /><span>{label}</span></label>;
  const numeric = (label: string, value: number, key: 'width' | 'ratio' | 'count', min: number, max: number, step: number | 'any') => <label>{label}<input type="number" value={Number.isNaN(value) ? '' : value} min={min} max={max} step={step} onChange={e => update({ [key]: e.target.value === '' ? NaN : Number(e.target.value) })} /></label>;
  return <section className="drop-pane" aria-label={`Plot ${number}`}><h2>Plot {number}</h2>
    <details className="drop-settings" open><summary>Einstellungen für Plot {number}</summary><div className="drop-setting-grid">
      <fieldset><legend>Datensätze</legend>{datasets.map(d => <div key={d.id}>{checkbox(d.name, s.datasetIds.includes(d.id), () => update({ datasetIds: toggle(s.datasetIds, d.id) }))}</div>)}</fieldset>
      <fieldset><legend>Gewichtungen</legend><h3>Verteilungen</h3>{([0, 1, 2, 3] as Order[]).map(r => <div key={r}>{checkbox(<>{orderNames[r]} (r = {r})</>, s.orders.includes(r), () => update({ orders: toggle(s.orders, r) }))}</div>)}<h3>Summenkurven</h3>{([0, 1, 2, 3] as Order[]).map(r => <div key={r}>{checkbox(<>Q<sub>{r}</sub> – {orderNames[r]}</>, s.cumulativeOrders.includes(r), () => update({ cumulativeOrders: toggle(s.cumulativeOrders, r) }))}</div>)}</fieldset>
      <fieldset><legend>Darstellung</legend>{checkbox('Verteilung anzeigen', s.distribution, () => update({ distribution: !s.distribution }))}{checkbox('Summenkurven anzeigen', s.cumulative, () => update({ cumulative: !s.cumulative }))}<label>Summenkurvenform<select value={s.cumulativeMode} onChange={e => update({ cumulativeMode: e.target.value as PlotSettings['cumulativeMode'] })}><option value="classified">Klassiert · abschnittsweise linear</option><option value="empirical">Empirisch · exakte Treppenfunktion</option></select></label><label>Histogrammhöhe<select value={s.ordinate} onChange={e => update({ ordinate: e.target.value as PlotSettings['ordinate'] })}><option value="share">Klassenanteil [%]</option><option value="density">Dichte [%/µm]</option><option value="logDensity">Logarithmische Dichte [%/Dekade]</option></select></label>{checkbox('x-Achse logarithmisch', s.logarithmicAxis, () => update({ logarithmicAxis: !s.logarithmicAxis }))}</fieldset>
      <fieldset><legend>Klassierung</legend><label>Klassenabstände<select value={s.spacing} onChange={e => update({ spacing: e.target.value as PlotSettings['spacing'] })}><option value="linear">Linear</option><option value="log">Logarithmisch</option></select></label><label>Vorgabe<select value={s.binMode} onChange={e => update({ binMode: e.target.value as PlotSettings['binMode'] })}><option value="width">Klassenbreite / Klassenfaktor</option><option value="count">Klassenanzahl</option></select></label>{s.binMode === 'count' ? numeric('Klassenanzahl [–]', s.count, 'count', 1, 200, 1) : s.spacing === 'linear' ? numeric('Klassenbreite ΔD [µm]', s.width, 'width', 0.001, 100000, 'any') : numeric('Klassenfaktor [–]', s.ratio, 'ratio', 1.001, 100, 'any')}</fieldset>
    </div></details>
    <details className="drop-settings"><summary>Kennwerte und Markierungen für Plot {number}</summary><div className="drop-setting-grid">
      <fieldset><legend>Quantilgewichtungen</legend>{([0, 1, 2, 3] as Order[]).map(r => <div key={r}>{checkbox(orderNames[r], s.quantileOrders.includes(r), () => update({ quantileOrders: toggle(s.quantileOrders, r) }))}</div>)}</fieldset>
      <fieldset><legend>Quantile [%]</legend>{[...new Set([10, 50, 90, ...s.percentiles])].sort((a, b) => a - b).map(p => <div key={p}>{checkbox(`${p} %`, s.percentiles.includes(p), () => update({ percentiles: toggle(s.percentiles, p) }))}</div>)}<label>Weiteres Quantil [%]<input type="number" min={0} max={100} step="any" value={customPercentile} onChange={e => setCustomPercentile(e.target.value)} /></label><button onClick={() => { const p = Number(customPercentile); if (!customPercentile.trim() || !Number.isFinite(p) || p < 0 || p > 100) { setPercentileError('Bitte einen Wert zwischen 0 und 100 % eingeben.'); return; } if (s.percentiles.length >= 8 && !s.percentiles.includes(p)) { setPercentileError('Höchstens acht Quantile gleichzeitig.'); return; } update({ percentiles: [...new Set([...s.percentiles, p])].sort((a, b) => a - b) }); setPercentileError(''); }}>Quantil ergänzen</button>{percentileError && <p role="alert" className="error">{percentileError}</p>}</fieldset>
      <fieldset><legend>Momentenmittelwerte</legend>{['1,0', '3,2', '4,3'].map(m => <div key={m}>{checkbox(<>D<sub>{m}</sub>{m === '3,2' ? ' – Sauter' : m === '4,3' ? ' – volumengewichtet' : ' – arithmetisch'}</>, s.means.includes(m), () => update({ means: toggle(s.means, m) }))}</div>)}</fieldset>
    </div><p>Markierungen sind unabhängig von den dargestellten Kurven auswählbar. Die Legende nennt die Kennwerte samt Wert und Marker. Die Tabelle unten bietet zusätzlich einzelne Sichtbarkeitsschalter. Viele gleichzeitig eingeblendete Kennwerte können sich überlagern.</p></details>
    {chart.error ? <p className="error" role="alert">{chart.error}</p> : <>
      <p className="drop-summary">{chart.edges.length - 1} Klassen · {s.spacing === 'linear' ? `Breite ${fmt(chart.edges[1] - chart.edges[0])} µm` : `Faktor ${fmt(chart.edges[1] / chart.edges[0])} · variable Breite in µm`} · Bereich {fmt(chart.edges[0])}–{fmt(chart.edges[chart.edges.length - 1])} µm</p>
      {s.distribution && !s.orders.length && <p role="status">Keine Verteilungsgewichtung ausgewählt. Bitte mindestens eine Gewichtung aktivieren.</p>}
      {s.cumulative && !s.cumulativeOrders.length && <p role="status">Keine Summengewichtung ausgewählt. Bitte mindestens eine Summenkurve aktivieren.</p>}
      {!s.distribution && !s.cumulative && <p role="status">Verteilung und Summenkurven sind ausgeblendet.</p>}
      <div className="drop-plot-info"><Chart title={`Tropfengrößenverteilung · Plot ${number}`} description={`${s.orders.map(r => orderNames[r]).join(', ')} · ${selected.map(d => `${d.id === 'a' || d.id === 'b' ? d.id.toUpperCase() : `Import ${datasets.indexOf(d) - 1}`}: ${d.name}`).join(' / ')}`} data={chart.traces} layout={chart.layout} height={chart.height}
        onLegendClick={event => {
          const trace = event.data[event.curveNumber];
          const meta = trace && 'meta' in trace ? trace.meta as { markerKey?: string } : undefined;
          if (!meta?.markerKey) return true;
          update({ hiddenMarkers: toggle(s.hiddenMarkers, meta.markerKey) }); return false;
        }} onLegendDoubleClick={() => false}
        onHover={event => { const x = Number(event.points[0]?.x); if (Number.isFinite(x)) setCursor(x); }} />
        <aside className="drop-info" aria-label={`Erklärung zu Plot ${number}`}><h3>Was zeigt dieser Plot?</h3>
          {s.distribution && <p>{s.ordinate === 'share' ? 'Die Höhe gibt den gewichteten Anteil einer Klasse an. Alle Klassenanteile einer Kurve ergeben 100 %. Eine größere Klassenbreite verändert die Balken- beziehungsweise Treppenhöhe.' : s.ordinate === 'density' ? 'Die Höhe gibt den Anteil pro µm an. Dichte × Klassenbreite ergibt den Klassenanteil. Das ist die geeignete Größe zum Vergleich unterschiedlich breiter Klassen.' : 'Die Höhe gibt den Anteil pro Dekade an. Eine Dekade ist beispielsweise 10–100 µm. Auf der logarithmischen x-Achse entspricht die Fläche dem Anteil.'}</p>}
          {s.cumulative && <p>Die Summenkurve zeigt den gewichteten Summenanteil. Ihre Skala ist {s.distribution ? 'rechts' : 'links'} in %. {s.cumulativeMode === 'empirical' ? 'Die exakten Treppen entstehen aus den Einzelbeobachtungen und bleiben beim Umklassieren gleich.' : 'Die Klassenränder werden in der gewählten Achsenskalierung linear verbunden. Das ist eine klassierte Näherung; ihre Zwischenwerte ändern sich mit der Klassierung.'}</p>}
          <p>Plot 1 verwendet Cyan-/Blautöne, Plot 2 Orangetöne. Summenkurven sind kräftig und durchgezogen. Transparente Histogrammflächen werden zuerst gezeichnet, alle Randkurven anschließend darüber. So bleiben wechselweise höhere Histogramme sichtbar; exakt deckungsgleiche Linien können sich weiterhin überlagern.</p>
          <p>Gefüllte Marker kennzeichnen Quantile und Mittelwerte. Ihre gestrichelten Hilfslinien führen zur x-Achse und zur Summenanteil-Achse. Die Legende nennt Durchmesser, Wert und zugehörige Q-Gewichtung. Ein Klick auf den Kennwert in der Legende oder seine Checkbox unten schaltet Marker und beide Linien gemeinsam.</p>
          {s.cumulative && s.cumulativeMode === 'classified' && <p className="drop-note">Kennwerte stammen weiterhin aus den Rohdaten. Marker liegen beim berechneten Durchmesser auf der dargestellten Näherungskurve. Ihr Summenanteil kann daher von der nominalen Quantilschwelle abweichen.</p>}
          {!s.cumulative && <p>Ohne sichtbare Summenkurve werden die Kennwerte auf der x-Achse markiert. Hilfslinien zur Summenachse entfallen.</p>}
          {s.logarithmicAxis && s.ordinate !== 'logDensity' && s.distribution && <p className="drop-note">Bei dieser logarithmischen x-Achse ist die sichtbare Fläche unter dem Histogramm kein direktes Maß für den Anteil.</p>}
          {chart.clipped && <p className="drop-note">Die erste Klasse beginnt bei 0 µm. Null ist logarithmisch nicht darstellbar; ihr linker Rand wird im Bild abgeschnitten. Berechnete Anteile bleiben vollständig.</p>}
          <label>Durchmesser zum Erkunden [µm]<input type="number" min={0.001} max={100000} step="any" value={Number.isFinite(cursor) ? Number(cursor.toPrecision(8)) : ''} onChange={e => setCursor(e.target.value === '' ? NaN : Number(e.target.value))} /></label><p>Mit der Maus im Plot oder per Eingabe erkunden.</p>
          {Number.isFinite(cursor) && cursor > 0 && active.map(entry => <div className="drop-readout" key={entry.dataset.id}><strong>{entry.dataset.name}</strong><p>Bis einschließlich {fmt(cursor)} µm liegen:</p><ul>{([0, 1, 2, 3] as Order[]).map(r => <li key={r}><strong>{fmt(100 * cumulativeAt(entry.populations[r], cursor))} %</strong> {r === 0 ? 'der Tropfenanzahl' : r === 1 ? 'der Durchmessersumme' : r === 2 ? 'der Oberfläche' : 'des Volumens'}.</li>)}</ul></div>)}
          <p><strong>D<sub>3,2</sub>:</strong> gleicher Quotient aus Gesamtvolumen und Gesamtoberfläche wie bei gleich großen Kugeltropfen. <strong>D<sub>v,50</sub>:</strong> Volumenmedian; 50 % des Volumens liegen bis zu dieser Schwelle. Das sind unterschiedliche Aussagen.</p>
        </aside></div>
      {chart.markers.length > 0 && <details className="drop-markers" open><summary>Eingeblendete Kennwerte · Plot {number}</summary><div className="drop-table"><table><thead><tr><th>Anzeigen</th><th>Datensatz</th><th>Markierung</th><th>Durchmesser [µm]</th><th>Bedeutung</th></tr></thead><tbody>{chart.markers.map((m, i) => <tr key={m.key}><td>{checkbox(`D${m.label.slice(1)} anzeigen`, !s.hiddenMarkers.includes(m.key), () => update({ hiddenMarkers: toggle(s.hiddenMarkers, m.key) }))}</td><td>{m.dataset}</td><td><span className="drop-line-key" style={{ borderColor: m.color }} />D<sub>{m.label.slice(1)}</sub></td><td>{fmt(m.value)}</td><td>{m.meaning}</td></tr>)}</tbody></table></div></details>}
    </>}
  </section>;
}
