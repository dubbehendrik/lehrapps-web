import type { Parameters } from './logic';
import { calculate } from './logic';
export type LabelMode = 'values' | 'symbols' | 'both';
export const fmt = (v: number, digits = 4) => Number.isFinite(v)
  ? v.toLocaleString('de-DE', { maximumSignificantDigits: digits }) : '∞';
export function FlowDiagram({ p, result, selected, onSelect, labels }: {
  p: Parameters; result: ReturnType<typeof calculate>; selected: number;
  onSelect: (stage: number) => void; labels: LabelMode;
}) {
  const width = 360 + 270 * p.stages;
  const x = (i: number) => 170 + (i - 1) * 270;
  const label = (symbol: string, value: number, unit: string) => labels === 'symbols' ? symbol
    : labels === 'values' ? `${fmt(value)} ${unit}` : `${symbol} = ${fmt(value)} ${unit}`;
  return <div className="cascade-flow-scroll" tabIndex={0} aria-label="Fließbild, bei vielen Stufen horizontal verschiebbar">
    <svg className="cascade-flow" viewBox={`0 0 ${width} 435`} style={{ minWidth: width }} role="img" aria-labelledby="cascade-svg-title cascade-svg-description">
      <title id="cascade-svg-title">Gegenstromkaskade mit {p.stages} Spülstufen</title>
      <desc id="cascade-svg-description">Bauteile und Verschleppung bewegen sich von links nach rechts. Frischwasser tritt in Stufe {p.stages} ein und strömt über die Überläufe nach links zum Abwasser. Becken auswählen, um die Bilanz zu betrachten. Alle Zahlen sind auch in der Ergebnistabelle verfügbar.</desc>
      <defs>
        <marker id="cascade-drag-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#a34c00" /></marker>
        <marker id="cascade-water-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#164a87" /></marker>
      </defs>
      <text x="20" y="28" fontWeight="700">Bauteile / Chargen →</text>
      <text x="20" y="55">{fmt(p.throughput)} pro Stunde · Verschleppung: {label('V̇A', result.dragFlow, 'L/min')}</text>
      {Array.from({ length: p.stages }, (_, j) => {
        const i = j + 1;
        return <g key={i} role="button" tabIndex={0} aria-label={`Bilanz für Stufe ${i} anzeigen`} aria-pressed={selected === i}
          onClick={() => onSelect(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i); } }} className="cascade-tank">
          <rect x={x(i)} y="115" width="170" height="200" rx="8" fill={selected === i ? '#e5f2ed' : '#eff5fa'} stroke={selected === i ? '#007053' : '#70899a'} strokeWidth={selected === i ? 3 : 1.5} />
          <path d={`M ${x(i) + 5} 200 H ${x(i) + 165} V 310 H ${x(i) + 5} Z`} fill="#d7e8f4" />
          <text x={x(i) + 85} y="145" textAnchor="middle" fontWeight="700">Stufe {i}</text>
          <text x={x(i) + 85} y="229" textAnchor="middle">{label(`c${i}`, result.concentrations[i], 'g/L')}</text>
          <text x={x(i) + 85} y="296" textAnchor="middle" fontSize="14">Bilanz anzeigen</text>
        </g>;
      })}
      {Array.from({ length: p.stages + 1 }, (_, i) => {
        const start = i === 0 ? 10 : x(i) + 170;
        const end = i === p.stages ? width - 10 : x(i + 1);
        return <g key={`drag-${i}`}><path d={`M ${start} 175 H ${end - 6}`} stroke="#a34c00" strokeWidth="3" fill="none" markerEnd="url(#cascade-drag-arrow)" />
          <text x={(start + end) / 2} y="164" textAnchor="middle" fontSize="14">{labels === 'symbols' ? `c${i}` : `${fmt(result.concentrations[i])} g/L`}</text></g>;
      })}
      {Array.from({ length: p.stages }, (_, j) => {
        const i = j + 1;
        const start = x(i);
        const end = i === 1 ? 10 : x(i - 1) + 170;
        return <g key={`water-${i}`}><path d={`M ${start} 264 H ${end + 6}`} stroke="#164a87" strokeWidth="3" fill="none" markerEnd="url(#cascade-water-arrow)" />
          <text x={(start + end) / 2} y="253" textAnchor="middle" fontSize="14">{labels === 'symbols' ? `c${i}` : `${fmt(result.concentrations[i])} g/L`}</text></g>;
      })}
      <path d={`M ${x(p.stages) + 85} 70 V 112`} stroke="#164a87" strokeWidth="3" markerEnd="url(#cascade-water-arrow)" />
      <text x={x(p.stages) + 85} y="29" textAnchor="middle" fontWeight="700">Frischwasser ↓</text>
      <text x={x(p.stages) + 85} y="53" textAnchor="middle">{label('cVE', p.freshConcentration, 'g/L')}</text>
      <text x="20" y="345" fill="#164a87">← Abwasser: {label('V̇VE', result.freshFlow, 'L/min')}</text>
      <text x={width - 20} y="345" textAnchor="end" fill="#a34c00">Ausgetragener Flüssigkeitsfilm →</text>
      <text x="20" y="385" fill="#a34c00">Orange Pfeile: mitgeführter Flüssigkeitsfilm, überall {fmt(result.dragFlow)} L/min</text>
      <text x="20" y="414" fill="#164a87">Blaue Pfeile: Wasser im Gegenstrom, Zulauf und alle Überläufe {fmt(result.freshFlow)} L/min</text>
    </svg>
  </div>;
}
