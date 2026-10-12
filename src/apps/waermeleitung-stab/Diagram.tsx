import type { ReactNode } from 'react';
import type { Parameters } from './types';
import { materials } from '../../lib/thermalMaterials';
import { endAlpha, format as f, segmentAlpha, segmentInitial, shoulderAlpha } from './logic';
const colors=['#d5e7f2','#e1eddf','#f7e7c9','#e9def0'];
function Sub({children}:{children:ReactNode}) {return <tspan baselineShift="sub" fontSize="0.75em">{children}</tspan>;}
function Temperature({index,value}:{index:string;value:number}) {return <>T<Sub>{index}</Sub>{` = ${f(value)} °C`}</>;}
function Alpha({index,value}:{index:string;value:number}) {return <>α<Sub>{index}</Sub>{` = ${f(value)} W/(m² K)`}</>;}
export function RodDiagram({p,exaggeration}:{p:Parameters;exaggeration:number}) {
 const width=Math.max(1040,p.segments.length*300+160);
 const total=p.segments.reduce((a,s)=>a+s.length,0),maxD=Math.max(...p.segments.map(s=>s.diameter));
 // A single geometric scale preserves the ratio of lengths and diameters.
 // Only the explicitly selected diameter exaggeration changes that ratio.
 const scale=Math.min((width-200)/total,240/(maxD*exaggeration));
 const maxHeight=maxD*scale*exaggeration,center=190+maxHeight/2;
 const dimensionY=center+maxHeight/2+35,cardY=dimensionY+105;
 const contactY=cardY+215,height=contactY+(p.contacts.length?125:0)+60;
 const start=(width-total*scale)/2,cardWidth=(width-80)/p.segments.length;
 let position=start;
 const geometry=p.segments.map((s,i)=>{
  const x=position,w=s.length*scale,h=s.diameter*scale*exaggeration;position+=w;
  return {s,i,x,w,h,mid:x+w/2,cardX:40+i*cardWidth};
 });
 const boundaryLabel=(side:0|1)=>{
  const b=side===0?p.left:p.right;
  return b.kind==='dirichlet'?<Temperature index="R" value={b.temperature}/>:b.kind==='neumann'?(b.flux===0?'Adiabatisch (q″ = 0,0 W/m²)':<>q″<Sub>R</Sub>{` = ${f(b.flux)} W/m²`}</>):<><Alpha index="E" value={endAlpha(p,side)}/>{'; '}<Temperature index="∞" value={p.ambient}/></>;
 };
 return <figure className="rod-diagram"><figcaption><h2>Geometrie, Stoffwerte und Bedingungen</h2><p>Längen und Durchmesser maßstäblich mit Durchmesserfaktor {f(exaggeration)}. Beschriftungen mit Verbindungslinien gehören zum jeweiligen Segment bzw. Kontakt. Bei vielen Segmenten kann die Skizze horizontal verschoben werden.</p></figcaption>
 <div className="rod-sketch-scroll"><svg role="img" aria-label="Segmentierter Stab mit Stoffeigenschaften, Mantelwärmeübergang, Umgebungstemperatur sowie Stirn-, Kontakt- und Schulterbedingungen" viewBox={`0 0 ${width} ${height}`} style={{minWidth:width,width:'100%',height:'auto'}}>
 <defs><marker id="rod-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#425d70"/></marker></defs>
 <text x={width/2} y="30" textAnchor="middle" fontSize="19">Umgebung: <Temperature index="∞" value={p.ambient}/></text>
 <text x="45" y="65" fontSize="17">Links: {boundaryLabel(0)}</text>
 <text x={width-45} y="96" textAnchor="end" fontSize="17">Rechts: {boundaryLabel(1)}</text>
 <path d={`M 75 75 V ${center} H ${start}`} fill="none" stroke="#425d70" strokeWidth="1.5" markerEnd="url(#rod-arrow)"/>
 <path d={`M ${width-75} 106 V ${center} H ${start+total*scale}`} fill="none" stroke="#425d70" strokeWidth="1.5" markerEnd="url(#rod-arrow)"/>
 <line x1={start-20} x2={start+total*scale+20} y1={center} y2={center} stroke="#70899a" strokeDasharray="5 5"/>
 {geometry.map(({s,i,x,w,h,mid,cardX})=>{
  const inside=w>=250&&h>=105;
  return <g key={s.id}>
   <rect x={x} y={center-h/2} width={w} height={h} fill={colors[i%colors.length]} stroke="#164a87" strokeWidth="2"/>
   <text x={mid} y={center-h/2-14} textAnchor="middle" fontSize="17">S<Sub>{i+1}</Sub></text>
   {inside&&<g fontSize="17" textAnchor="middle"><text x={mid} y={center-23}>{`λ = ${f(s.conductivity)} W/(m K)`}</text><text x={mid} y={center+3}>{`ρ = ${f(s.density)} kg/m³`}</text><text x={mid} y={center+29}>c<Sub>p</Sub>{` = ${f(s.cp)} J/(kg K)`}</text></g>}
   {w>=260&&<><text x={mid} y="146" textAnchor="middle" fontSize="17"><Alpha index={`M,${i+1}`} value={segmentAlpha(p,i)}/></text><line x1={mid} x2={mid} y1="155" y2={center-h/2-32} stroke="#007053" markerEnd="url(#rod-arrow)"/></>}
   <line x1={x+Math.min(3,w/4)} x2={x+w-Math.min(3,w/4)} y1={dimensionY} y2={dimensionY} stroke="#425d70" markerStart="url(#rod-arrow)" markerEnd="url(#rod-arrow)"/>
   <line x1={x} x2={x} y1={center+h/2+4} y2={dimensionY+5} stroke="#70899a"/>
   <line x1={x+w} x2={x+w} y1={center+h/2+4} y2={dimensionY+5} stroke="#70899a"/>
   <text x={mid} y={dimensionY+26} textAnchor="middle" fontSize="16">L<Sub>{i+1}</Sub>{w>=140?` = ${f(s.length)} mm`:''}</text>
   <path d={`M ${mid} ${dimensionY+36} L ${cardX+cardWidth/2} ${cardY-10}`} fill="none" stroke="#70899a"/>
   <g fontSize="17"><text x={cardX+12} y={cardY}>Segment {i+1}: {s.material==='custom'?'Benutzerdefiniert':materials.find(m=>m.id===s.material)?.name.split(' (')[0].replace('Kunststoff: ','')??s.material}</text>
   <text x={cardX+12} y={cardY+28}>L<Sub>{i+1}</Sub>{` = ${f(s.length)} mm; `}d<Sub>{i+1}</Sub>{` = ${f(s.diameter)} mm`}</text>
   <text x={cardX+12} y={cardY+56}><Alpha index={`M,${i+1}`} value={segmentAlpha(p,i)}/></text>
   <text x={cardX+12} y={cardY+84}><Temperature index={`0,${i+1}`} value={segmentInitial(p,i)}/></text>
   {!inside&&<><text x={cardX+12} y={cardY+112}>{`λ = ${f(s.conductivity)} W/(m K)`}</text><text x={cardX+12} y={cardY+140}>{`ρ = ${f(s.density)} kg/m³`}</text><text x={cardX+12} y={cardY+168}>c<Sub>p</Sub>{` = ${f(s.cp)} J/(kg K)`}</text></>}
   </g>
   {i<p.contacts.length&&<><line x1={x+w} x2={x+w} y1={center-Math.max(h,geometry[i+1].h)/2-5} y2={center+Math.max(h,geometry[i+1].h)/2+8} stroke={p.contacts[i].perfect?'#007053':'#a34c00'} strokeWidth="3" strokeDasharray={p.contacts[i].perfect?undefined:'6 4'}/><text x={x+w} y={center+Math.max(h,geometry[i+1].h)/2+25} textAnchor="middle" fontSize="16">K<Sub>{i+1}</Sub></text></>}
  </g>;
 })}
 {p.contacts.map((c,i)=>{
  const x=40+i*(width-80)/p.contacts.length,w=(width-80)/p.contacts.length;
  return <g key={`${p.segments[i].id}-${p.segments[i+1].id}`} fontSize="17">
   <rect x={x} y={contactY-8} width={w-15} height="108" rx="4" fill="white" stroke="#cad5dd"/>
   <text x={x+12} y={contactY+15}>Kontakt K<Sub>{i+1}</Sub>{`: Segment ${i+1} / ${i+2}`}</text>
   <text x={x+12} y={contactY+42}>{c.perfect?'Perfekter Kontakt':<>R<Sub>K</Sub>{` = ${f(c.resistance)} m² K/W`}</>}</text>
   <text x={x+12} y={contactY+69}>{c.shoulder==='adiabatic'?'Schulter: adiabatisch':<>Schulter: <Alpha index="S" value={shoulderAlpha(p,i)}/></>}</text>
   {c.shoulder==='convection'&&<text x={x+12} y={contactY+94}><Temperature index="∞" value={p.ambient}/></text>}
  </g>;
 })}
 <line x1={start} x2={start+total*scale} y1={height-38} y2={height-38} stroke="#425d70" markerEnd="url(#rod-arrow)"/><text x={start} y={height-12} fontSize="16">x = 0</text><text x={start+total*scale} y={height-12} textAnchor="end" fontSize="16">x = {f(total)} mm</text>
 </svg></div>
 <div className="rod-table"><table><caption>Geometrie, Stoffwerte und Mantelbedingungen je Segment</caption><thead><tr><th>Segment</th><th>Material</th><th>L [mm]</th><th>d [mm]</th><th>λ [W/(m K)]</th><th>ρ [kg/m³]</th><th>c<sub>p</sub> [J/(kg K)]</th><th>α<sub>M</sub> [W/(m² K)]</th></tr></thead><tbody>{p.segments.map((s,i)=><tr key={s.id}><th>{i+1}</th><td>{materials.find(m=>m.id===s.material)?.name??'Benutzerdefiniert'}</td><td>{f(s.length)}</td><td>{f(s.diameter)}</td><td>{f(s.conductivity)}</td><td>{f(s.density)}</td><td>{f(s.cp)}</td><td>{f(segmentAlpha(p,i))}</td></tr>)}</tbody></table></div>
 </figure>;
}
