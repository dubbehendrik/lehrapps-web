import { IndexedSymbol } from '../../components/MathNotation';
import { bathColor, fmt } from './logic';
import type { Parameters } from './types';
export function StageOverview({ parameters: p, concentrations, step }: { parameters: Parameters; concentrations: number[]; step: number }) {
  return <section className="controls"><h2>Stufenübersicht · t = {step}</h2>
    <p>Verschleppung <IndexedSymbol base="V" index="A" /> = {fmt(p.dragVolume)} L je Übergang;
      Eingang <IndexedSymbol base="c" index="0" /> = {fmt(p.sourceConcentration)} g/L. Kein laufender Frischwasserstrom.</p>
    <div className="rinse-flow" role="list" aria-label="Spülbecken in Durchlaufrichtung">
      {p.stages.map((b, i) => <div className="rinse-stage" role="listitem" key={i}>
        <div className="rinse-transfer">→ {i === 0 ? 'Eintrag aus Prozessbad' : `aus Stufe ${i}`}<br />{fmt(p.dragVolume)} L je Durchlauf</div>
        <svg viewBox="0 0 240 145" role="img" aria-label={`Becken ${i + 1}, Konzentration nach Schritt ${step}: ${fmt(concentrations[i])} Gramm pro Liter`}>
          <path d="M20 20 V125 H220 V20" fill="#e9f4fa" stroke="#193f53" strokeWidth="4" />
          <path d="M23 62 H217 V122 H23 Z" fill={bathColor(concentrations[i], p.sourceConcentration)} />
          <path d="M23 62 H217" stroke="#41738d" strokeWidth="2" />
          <text x="120" y="45" textAnchor="middle" fontSize="19" fill="#162c3c">Stufe {i + 1}</text>
          <text x="120" y="94" textAnchor="middle" fontSize="19" fill="#162c3c">{fmt(concentrations[i])} g/L</text>
        </svg>
        <p><IndexedSymbol base="V" index={`B,${i + 1}`} /> = {fmt(b.volume)} L<br />
          <IndexedSymbol base="c" index={`${i + 1},0`} /> = {fmt(b.initialConcentration)} g/L</p>
      </div>)}
    </div><p>→ Ausschleppung aus der letzten Stufe: <strong>{fmt(p.dragVolume)} L mit {fmt(concentrations.at(-1)!)} g/L</strong>.</p>
  </section>;
}
