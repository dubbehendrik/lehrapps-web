import type { Parameters } from './types';
import { materials } from '../../lib/thermalMaterials';
import { endAlpha, format as f, segmentAlpha, shoulderAlpha } from './logic';
const colors=['#d5e7f2','#e1eddf','#f7e7c9','#e9def0'];
export function RodDiagram({p,exaggeration}:{p:Parameters;exaggeration:number}) {
 const total=p.segments.reduce((a,s)=>a+s.length,0),scale=840/total;
 const maxD=Math.max(...p.segments.map(s=>s.diameter)),maxHeight=maxD*scale*exaggeration;
 const center=100+maxHeight/2,height=240+maxHeight;
 let start=100;
 const boundaryLabel=(side:0|1)=>{
  const b=side===0?p.left:p.right;
  return b.kind==='dirichlet'?`T = ${f(b.temperature)} °C`:b.kind==='neumann'?(b.flux===0?'Adiabatisch':`q″ = ${f(b.flux)} W/m²`):`αE = ${f(endAlpha(p,side))} W/(m² K)`;
 };
 return <figure className="rod-diagram"><figcaption><h2>Geometrie und Bedingungen</h2><p>Längen maßstäblich. Durchmesserfaktor: {f(exaggeration)}. Gemeinsam: T<sub>∞</sub> = {f(p.ambient)} °C. Kontaktbedingungen unterhalb der Skizze.</p></figcaption><svg role="img" aria-label="Seitenansicht des segmentierten Stabs mit maßstäblichen Längen und Durchmessern sowie Rand- und Kontaktbedingungen" viewBox={`0 0 1040 ${height}`}>
 <defs><marker id="rod-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#425d70"/></marker></defs>
 <line x1="80" x2="960" y1={center} y2={center} stroke="#70899a" strokeDasharray="5 5"/>
 {p.segments.map((s,i)=>{
  const x=start,w=s.length*scale,h=s.diameter*scale*exaggeration;start+=w;
  const compact=w<100;
  return <g key={s.id}><rect x={x} y={center-h/2} width={w} height={h} fill={colors[i%colors.length]} stroke="#164a87" strokeWidth="2"/><text x={x+w/2} y={center-h/2-14} textAnchor="middle" fontSize="17">S{i+1}</text>
  <line x1={x+3} x2={x+w-3} y1={center+maxHeight/2+38} y2={center+maxHeight/2+38} stroke="#425d70" markerStart="url(#rod-arrow)" markerEnd="url(#rod-arrow)"/>
  <text x={x+w/2} y={center+maxHeight/2+63} textAnchor="middle" fontSize="16">{compact?`${i+1}`:`L${i+1} = ${f(s.length)} mm`}</text>
  <line x1={x} x2={x} y1={center+h/2+4} y2={center+maxHeight/2+43} stroke="#70899a"/>
  <line x1={x+w} x2={x+w} y1={center+h/2+4} y2={center+maxHeight/2+43} stroke="#70899a"/>
  {h>40&&w>100&&<><line x1={x+w-20} x2={x+w-20} y1={center-h/2+4} y2={center+h/2-4} stroke="#425d70" markerStart="url(#rod-arrow)" markerEnd="url(#rod-arrow)"/><text x={x+w/2} y={center+6} textAnchor="middle" fontSize="16">d = {f(s.diameter)} mm</text></>}
  {i<p.contacts.length&&<g><line x1={x+w} x2={x+w} y1={center-maxHeight/2-6} y2={center+maxHeight/2+8} stroke={p.contacts[i].perfect?'#007053':'#a34c00'} strokeWidth="3" strokeDasharray={p.contacts[i].perfect?undefined:'6 4'}/><text x={x+w} y={center-maxHeight/2-40} textAnchor="middle" fontSize="16">K{i+1}</text></g>}
  </g>;
 })}
 <text x="100" y="26" fontSize="17" textAnchor="start">Links: {boundaryLabel(0)}</text><text x="940" y="53" fontSize="17" textAnchor="end">Rechts: {boundaryLabel(1)}</text>
 <line x1="100" x2="940" y1={height-45} y2={height-45} stroke="#425d70" markerEnd="url(#rod-arrow)"/><text x="100" y={height-18} fontSize="16">x = 0</text><text x="940" y={height-18} textAnchor="end" fontSize="16">x = {f(total)} mm</text>
 </svg><div className="rod-table"><table><thead><tr><th>Segment</th><th>Material</th><th>L [mm]</th><th>d [mm]</th><th>α<sub>M</sub> [W/(m² K)]</th></tr></thead><tbody>{p.segments.map((s,i)=><tr key={s.id}><th>{i+1}</th><td>{materials.find(m=>m.id===s.material)?.name??'Benutzerdefiniert'}</td><td>{f(s.length)}</td><td>{f(s.diameter)}</td><td>{f(segmentAlpha(p,i))}</td></tr>)}</tbody></table></div>
 {p.contacts.length>0&&<ul>{p.contacts.map((c,i)=><li key={`${p.segments[i].id}-${p.segments[i+1].id}`}>K{i+1}: {c.perfect?'Perfekter Kontakt':<>R<sub>K</sub> = {f(c.resistance)} m² K/W</>}; Schulter: {c.shoulder==='adiabatic'?'adiabatisch':<>Konvektion, α<sub>S</sub> = {f(shoulderAlpha(p,i))} W/(m² K)</>}.</li>)}</ul>}
 </figure>;
}
