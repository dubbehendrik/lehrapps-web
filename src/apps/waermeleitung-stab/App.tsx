import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Data } from 'plotly.js';
import { Chart } from '../../components/Chart';
import { SupportFooter } from '../../components/SupportFooter';
import { materials } from '../../lib/thermalMaterials';
import { defaults, defaultContact, defaultSegment, type Boundary, type Contact, type Parameters, type Segment, type Simulation } from './types';
import { endAlpha, format as f, profile, segmentAlpha, segmentInitial, shoulderAlpha, transverseBi, validate, removeSegment as removeSegmentFromModel, setPerSegment } from './logic';
import { BoundaryEquation, ContactEquation, BiEquation } from './Notation';
import { ProgramDescription } from './ProgramDescription';
import { RodDiagram } from './Diagram';
import './style.css';

function NumberField({value,label,min,max,onChange}:{value:number;label:ReactNode;min?:number;max?:number;onChange:(v:number)=>void}) {
 const [draft,setDraft]=useState<string|null>(null);
 const formatted=!Number.isFinite(value)?'':value!==0&&(Math.abs(value)<1||Math.abs(value)>=1e6)?value.toExponential(1):value.toFixed(1);
 return <label>{label}<input type="number" step="any" min={min} max={max} aria-invalid={!Number.isFinite(value)||(min!==undefined&&value<min)||(max!==undefined&&value>max)} value={draft??formatted} onFocus={()=>setDraft(Number.isFinite(value)?String(value):'')} onBlur={()=>setDraft(null)} onChange={e=>{setDraft(e.target.value);onChange(e.target.value===''?NaN:Number(e.target.value));}}/></label>;
}
function Info({title,children}:{title:string;children:ReactNode}) {return <details className="rod-info"><summary><span aria-hidden="true">ⓘ </span>{title}</summary>{children}</details>;}
function BoundaryPanel({side,p,onChange}:{side:'left'|'right';p:Parameters;onChange:(b:Boundary)=>void}) {
 const b=p[side],index=side==='left'?0:1;
 return <fieldset><legend>{side==='left'?'Linkes Ende (x = 0)':'Rechtes Ende (x = L)'}</legend>
 <label>Randbedingung<select value={b.kind} onChange={e=>onChange({...b,kind:e.target.value as Boundary['kind']})}><option value="dirichlet">1. Art: Feste Temperatur (Dirichlet)</option><option value="neumann">2. Art: Wärmestromdichte (Neumann)</option><option value="robin">3. Art: Wärmeübergang (Robin)</option></select></label>
 {b.kind==='dirichlet'&&<NumberField label={<>Endtemperatur T<sub>R</sub> [°C]</>} value={b.temperature} min={-273.15} max={2000} onChange={v=>onChange({...b,temperature:v})}/>}
 {b.kind==='neumann'&&<><NumberField label={<>Wärmestromdichte q″<sub>R</sub> [W/m²]</>} value={b.flux} min={-1e7} max={1e7} onChange={v=>onChange({...b,flux:v})}/><p className="rod-hint">{b.flux===0?'Adiabatisches Ende: kein Wärmestrom.':'Positiv: Wärmeabfuhr. Negativ: Wärmezufuhr.'}</p><button onClick={()=>onChange({...b,flux:0})}>Adiabatisch setzen</button></>}
 {b.kind==='robin'&&<><label className="rod-check"><input type="checkbox" checked={b.inheritAlpha} onChange={e=>onChange({...b,inheritAlpha:e.target.checked,alpha:endAlpha(p,index)})}/> Mantelwert des Endsegments übernehmen</label>{b.inheritAlpha?<p>α<sub>E</sub> = {f(endAlpha(p,index))} W/(m² K)</p>:<NumberField label={<>α<sub>E</sub> [W/(m² K)]</>} value={b.alpha} min={0} max={1e5} onChange={v=>onChange({...b,alpha:v})}/>}<p>T<sub>∞</sub> = {f(p.ambient)} °C (gemeinsame Umgebung)</p></>}
 <Info title="Formel und Bedeutung der Randbedingung"><BoundaryEquation kind={b.kind} side={side}/>{b.kind==='dirichlet'?<p>Eine ideale Temperaturquelle hält die Stirnfläche auf der vorgegebenen Temperatur. Der dafür nötige Wärmestrom ergibt sich aus der Rechnung.</p>:<><p>n zeigt aus dem Stab heraus: links entgegen der x-Richtung, rechts in x-Richtung. Deshalb ist ∂T/∂n links gleich −∂T/∂x und rechts gleich +∂T/∂x.</p><p>{b.kind==='neumann'?'Die Wärmestromdichte ist zeitlich konstant. Positive Werte führen Wärme aus dem Stab ab, negative Werte führen Wärme zu. Null entspricht einer adiabatischen Stirnfläche.':'Wärmeleitung zur Stirnfläche geht in Konvektion zur gemeinsamen Umgebung über. Bei αE = 0 ist das Ende adiabatisch. Der Mantelwert folgt Änderungen automatisch, solange die Übernahme aktiv ist.'}</p></>}</Info>
 </fieldset>;
}
function ContactPanel({p,index,onChange}:{p:Parameters;index:number;onChange:(c:Contact)=>void}) {
 const c=p.contacts[index],a=p.segments[index],b=p.segments[index+1],contactArea=Math.PI*(Math.min(a.diameter,b.diameter)/1000)**2/4;
 return <fieldset className="rod-contact"><legend>Kontakt {index+1}: Segment {index+1} / {index+2}</legend><label className="rod-check"><input type="checkbox" checked={c.perfect} onChange={e=>onChange({...c,perfect:e.target.checked})}/> Perfekter Kontakt</label>
 {!c.perfect&&<NumberField label={<>Flächenbezogener Kontaktwiderstand R<sub>K</sub> [m² K/W]</>} value={c.resistance} min={1e-10} max={1e3} onChange={v=>onChange({...c,resistance:v})}/>}
 <Info title="Kontaktwiderstand: Formel und Orientierungswerte"><ContactEquation/><p>R<sub>K</sub> ist flächenbezogen. Der Widerstand der gesamten Verbindung beträgt R<sub>K</sub>/A<sub>K</sub> [K/W]. Die Kontaktfläche ist die kleinere Querschnittsfläche: {f(contactArea)} m². Positiver Wärmestrom fließt hier von links nach rechts.</p>
 <div className="rod-table"><table><thead><tr><th>Didaktisches Beispiel</th><th>R<sub>K</sub> [m² K/W]</th></tr></thead><tbody><tr><td>Perfekter Kontakt (ideal)</td><td>{f(0)}</td></tr><tr><td>Geringer Widerstand</td><td>{f(1e-4)}</td></tr><tr><td>Mittlerer Widerstand</td><td>{f(1e-3)}</td></tr><tr><td>Hoher Widerstand</td><td>{f(1e-2)}</td></tr></tbody></table></div>
 <p>Orientierung: Der NASA-Leitfaden nennt Kontaktbedingungen, die flächenbezogenen Widerständen zwischen 2,0 · 10⁻⁴ und 1,0 · 10⁻¹ m² K/W entsprechen. Andere Bedingungen können außerhalb dieses Bereichs liegen. Die Beispiele sind keine garantierten Werte für bestimmte Verbindungen.</p><p>Anpressdruck, Rauheit, Materialpaarung, Oxidschichten und Zwischenmedium verändern den Widerstand. Ein kleinerer Wert bedeutet besseren Wärmekontakt. <a href="https://ntrs.nasa.gov/citations/20230013900" target="_blank" rel="noreferrer">NASA: Passive Thermal Control Engineering Guidebook</a></p></Info>
 <label>Freiliegender Kreisring (Schulter)<select value={c.shoulder} onChange={e=>onChange({...c,shoulder:e.target.value as Contact['shoulder']})}><option value="adiabatic">Adiabatisch</option><option value="convection">Konvektion zur Umgebung</option></select></label>
 {c.shoulder==='convection'&&<><label className="rod-check"><input type="checkbox" checked={c.inheritAlpha} onChange={e=>onChange({...c,inheritAlpha:e.target.checked,alpha:shoulderAlpha(p,index)})}/> Mantelwert des größeren Segments übernehmen</label>{c.inheritAlpha?<p>α<sub>S</sub> = {f(shoulderAlpha(p,index))} W/(m² K)</p>:<NumberField label={<>Schulterwärmeübergang α<sub>S</sub> [W/(m² K)]</>} value={c.alpha} min={0} max={1e5} onChange={v=>onChange({...c,alpha:v})}/>}<p className="rod-hint">Gleiche Durchmesser: keine Schulterfläche. Räumliche Verengung des Wärmeflusses bleibt unberücksichtigt.</p></>}
 </fieldset>;
}
function makeTraces(p:Parameters,r:Simulation,frame:number):Data[] {
 const curves=[{name:'Anfangsbedingung',t:r.mesh.initial,color:'#70899a',dash:'dash',initial:true},{name:`Zeitpunkt t = ${f(r.times[frame])} s`,t:r.temperatures[frame],color:'#164a87',dash:'solid',initial:frame===0},...(r.stationary?[{name:'Stationärer Zustand',t:r.stationary,color:'#a34c00',dash:'dot',initial:false}]:[])];
 return curves.flatMap(curve=>{
  const q=profile(r.mesh,p,curve.t,curve.initial);
  return p.segments.map((s,i)=>{
   const indices=q.segment.map((seg,j)=>seg===i?j:-1).filter(j=>j>=0);
   return {type:'scatter',mode:'lines',name:curve.name,legendgroup:curve.name,showlegend:i===0,x:indices.map(j=>q.x[j]),y:indices.map(j=>q.temperature[j]),customdata:indices.map(j=>[f(q.x[j]),f(q.temperature[j]),i+1]),line:{color:curve.color,width:curve.dash==='solid'?3:2,dash:curve.dash},hovertemplate:'x = %{customdata[0]} mm<br>T = %{customdata[1]} °C<br>Segment %{customdata[2]}<extra>%{fullData.name}</extra>'} as Data;
  });
 });
}
export default function App() {
 const [p,setP]=useState<Parameters>(defaults),[frame,setFrame]=useState(0),[playing,setPlaying]=useState(false),[diameterScale,setDiameterScale]=useState(1);
 const [out,setOut]=useState<{p:Parameters;result?:Simulation;error?:string}|null>(null);
 const nextId=useRef(2);
 const problem=useMemo(()=>{try{validate(p);return '';}catch(e){return e instanceof Error?e.message:'Eingaben prüfen.';}},[p]);
 const r=out?.p===p?out.result:undefined,error=problem||(out?.p===p?out.error:'');
 useEffect(()=>{
  setFrame(0);setPlaying(false);
  if(problem)return;
  let worker:Worker|undefined;
  const timer=setTimeout(()=>{
   worker=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});
   worker.onmessage=(e:MessageEvent<{result?:Simulation;error?:string}>)=>setOut({p,...e.data});
   worker.onerror=()=>setOut({p,error:'Berechnung konnte nicht gestartet werden. Seite neu laden oder Eingaben prüfen.'});
   worker.postMessage(p);
  },160);
  return()=>{clearTimeout(timer);worker?.terminate();};
 },[p,problem]);
 useEffect(()=>{
  if(!playing||!r)return;
  const timer=setInterval(()=>setFrame(x=>{if(x>=r.times.length-1){return x;}return x+1;}),60);
  return()=>clearInterval(timer);
 },[playing,r]);
 useEffect(()=>{if(r&&frame>=r.times.length-1)setPlaying(false);},[frame,r]);
 const scalar=<K extends keyof Parameters>(key:K,value:Parameters[K])=>setP(old=>({...old,[key]:value}));
 const changeSegment=(i:number,s:Segment)=>setP(old=>({...old,segments:old.segments.map((x,j)=>j===i?s:x)}));
 const changeContact=(i:number,c:Contact)=>setP(old=>({...old,contacts:old.contacts.map((x,j)=>j===i?c:x)}));
 const addSegment=()=>setP(old=>{
  const last=old.segments[old.segments.length-1];
  return {...old,segments:[...old.segments,{...last,id:nextId.current++,initial:segmentInitial(old,old.segments.length-1),alpha:segmentAlpha(old,old.segments.length-1)}],contacts:[...old.contacts,defaultContact()]};
 });
 const removeSegment=(index:number)=>setP(old=>removeSegmentFromModel(old,index));
 const switchMode=(key:'initialPerSegment'|'alphaPerSegment',enabled:boolean)=>setP(old=>setPerSegment(old,key,enabled));
 const reset=()=>{nextId.current=2;setP(defaults());setDiameterScale(1);};
 const selectedFrame=r?Math.min(frame,r.times.length-1):0;
 const selected=r?.temperatures[selectedFrame];
 const capacity=r?.mesh.capacity.reduce((a,b)=>a+b,0)??0;
 const average=selected&&r?selected.reduce((a,t,i)=>a+t*r.mesh.capacity[i],0)/capacity:0;
 const difference=r?.stationary&&selected?Math.max(...selected.map((t,i)=>Math.abs(t-r.stationary![i]))):null;
 const exportCsv=()=>{
  if(!r||!selected)return;
  const rows=[['x [mm]','Segment','T0 [°C]',`T (${r.times[selectedFrame]} s) [°C]`,'T stationär [°C]'],...r.mesh.x.map((x,i)=>[x*1000,r.mesh.segment[i]+1,r.mesh.initial[i],selected[i],r.stationary?.[i]??''])];
  const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='waermeleitung-stab.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 const totalLength=p.segments.reduce((a,s)=>a+s.length,0),maxDiameter=Math.max(...p.segments.map(s=>s.diameter));
 const suggestedScale=Math.min(50,Math.max(1,totalLength/maxDiameter*.12));
 const currentProfile=r&&selected?profile(r.mesh,p,selected,selectedFrame===0):null;
 return <article className="rod-app"><h1>Wärmeleitung im Stab</h1><ProgramDescription/>
 <section className="controls"><h2>Rahmenparameter</h2><div className="input-grid">
 <NumberField label={<>Umgebungstemperatur T<sub>∞</sub> [°C]</>} value={p.ambient} min={-273.15} max={2000} onChange={v=>scalar('ambient',v)}/>
 <NumberField label="Endzeit [s]" value={p.endTime} min={.01} max={1e7} onChange={v=>scalar('endTime',v)}/>
 </div><div className="input-grid"><div>{p.segments.length>1&&<label className="rod-check"><input type="checkbox" checked={p.initialPerSegment} onChange={e=>switchMode('initialPerSegment',e.target.checked)}/> Anfangstemperatur je Segment</label>}{!p.initialPerSegment&&<NumberField label={<>Anfangstemperatur T<sub>0</sub> [°C]</>} value={p.initial} min={-273.15} max={2000} onChange={v=>scalar('initial',v)}/>}</div>
 <div>{p.segments.length>1&&<label className="rod-check"><input type="checkbox" checked={p.alphaPerSegment} onChange={e=>switchMode('alphaPerSegment',e.target.checked)}/> Mantelwärmeübergang je Segment</label>}{!p.alphaPerSegment&&<NumberField label={<>Mantelwärmeübergang α<sub>M</sub> [W/(m² K)]</>} value={p.alpha} min={0} max={1e5} onChange={v=>scalar('alpha',v)}/>}</div></div>
 <p className="rod-hint">α<sub>M</sub> = 0: isolierter Mantel. T<sub>∞</sub> gilt für alle konvektiven Flächen. Positive Endwärmestromdichte bedeutet Wärmeabfuhr.</p>
 <div className="button-row"><button onClick={reset}>Standardwerte wiederherstellen</button><button onClick={()=>{
  const base=defaults();const first={...defaultSegment(1),length:100},second={...defaultSegment(2),length:100,material:'copper',conductivity:400,density:8960,cp:385};
  nextId.current=3;setP({...base,segments:[first,second],contacts:[{...defaultContact(),perfect:false}],ambient:20,left:{...base.left,temperature:100},right:{...base.right,kind:'robin'}});
 }}>Beispiel: Stahl / Kupfer mit Kontaktwiderstand</button></div></section>
 <section className="controls"><div className="rod-heading"><h2>Stabsegmente ({p.segments.length})</h2><div className="button-row"><button disabled={p.segments.length>=12} onClick={addSegment}>+ Segment</button><button disabled={p.segments.length===1} onClick={()=>removeSegment(p.segments.length-1)}>− Letztes Segment</button></div></div>
 <p className="rod-hint">1–12 Segmente. Neue Segmente übernehmen die Werte des letzten Segments. Beim Entfernen eines mittleren Segments wird der neue Kontakt auf perfekten Kontakt und eine adiabatische Schulter gesetzt.</p>
 {p.segments.map((s,i)=><div key={s.id}><fieldset><legend>Segment {i+1}</legend><div className="input-grid"><NumberField label="Länge L [mm]" value={s.length} min={.1} max={10000} onChange={v=>changeSegment(i,{...s,length:v})}/><NumberField label="Durchmesser d [mm]" value={s.diameter} min={.1} max={2000} onChange={v=>changeSegment(i,{...s,diameter:v})}/></div>
 <label>Material<select value={s.material} onChange={e=>{
  const material=materials.find(x=>x.id===e.target.value);
  changeSegment(i,material?{...s,material:material.id,conductivity:material.conductivity,density:material.density,cp:material.cp}:{...s,material:'custom'});
 }}>{materials.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}<option value="custom">Benutzerdefiniert</option></select></label>
 <div className="rod-three"><NumberField label="Wärmeleitfähigkeit λ [W/(m K)]" value={s.conductivity} min={.001} max={10000} onChange={v=>changeSegment(i,{...s,material:'custom',conductivity:v})}/><NumberField label="Dichte ρ [kg/m³]" value={s.density} min={1} max={30000} onChange={v=>changeSegment(i,{...s,material:'custom',density:v})}/><NumberField label={<>Spezifische Wärmekapazität c<sub>p</sub> [J/(kg K)]</>} value={s.cp} min={1} max={20000} onChange={v=>changeSegment(i,{...s,material:'custom',cp:v})}/></div>
 {s.material!=='custom'&&<p className="rod-hint">{materials.find(m=>m.id===s.material)?.note} <a href={materials.find(m=>m.id===s.material)?.source} target="_blank" rel="noreferrer">Materialreferenz</a></p>}
 <div className="input-grid">{p.initialPerSegment&&p.segments.length>1&&<NumberField label={<>Anfangstemperatur T<sub>0,{i+1}</sub> [°C]</>} value={s.initial} min={-273.15} max={2000} onChange={v=>changeSegment(i,{...s,initial:v})}/>}{p.alphaPerSegment&&p.segments.length>1&&<NumberField label={<>Mantelwärmeübergang α<sub>M,{i+1}</sub> [W/(m² K)]</>} value={s.alpha} min={0} max={1e5} onChange={v=>changeSegment(i,{...s,alpha:v})}/>}</div>
 <p>Temperaturleitfähigkeit a = {f(s.conductivity/(s.density*s.cp))} m²/s; ρc<sub>p</sub> = {f(s.density*s.cp)} J/(m³ K); Bi<sub>⊥</sub> = {f(transverseBi(p,i))}.</p>
 {p.segments.length>1&&<button onClick={()=>removeSegment(i)}>− Segment {i+1} entfernen</button>}
 </fieldset>{i<p.contacts.length&&<ContactPanel p={p} index={i} onChange={c=>changeContact(i,c)}/>}</div>)}
 <Info title="Querschnitts-Biot-Zahl"><BiEquation/><p>Die Kennzahl setzt Mantelwärmeübergang und radiale Wärmeleitung ins Verhältnis. Bi<sub>⊥</sub> &gt; 0,1 löst einen Hinweis aus. Das ist eine Orientierung, keine zugesicherte Fehlergrenze.</p></Info>
 <details><summary>Hinterlegte Materialtabelle</summary><div className="rod-table"><table><thead><tr><th>Material</th><th>λ [W/(m K)]</th><th>ρ [kg/m³]</th><th>c<sub>p</sub> [J/(kg K)]</th></tr></thead><tbody>{materials.map(m=><tr key={m.id}><th>{m.name}</th><td>{f(m.conductivity)}</td><td>{f(m.density)}</td><td>{f(m.cp)}</td></tr>)}</tbody></table></div><p>Konstante Lehr- und Richtwerte. Aerogel enthält Modellannahmen. Quellen stehen bei der Materialauswahl.</p></details>
 </section>
 <section className="controls"><h2>Randbedingungen an den Stirnflächen</h2><div className="input-grid"><BoundaryPanel side="left" p={p} onChange={b=>scalar('left',b)}/><BoundaryPanel side="right" p={p} onChange={b=>scalar('right',b)}/></div></section>
 {error?<p role="alert" className="error">{error}</p>:<>
 <section className="controls"><h2>Geometriedarstellung</h2><label className="rod-check"><input type="checkbox" checked={diameterScale!==1} onChange={e=>setDiameterScale(e.target.checked?suggestedScale:1)}/> Durchmesser überhöhen (nur Darstellung)</label>{diameterScale!==1&&<NumberField label="Durchmesserfaktor [–]" value={diameterScale} min={1} max={50} onChange={v=>setDiameterScale(Number.isFinite(v)?Math.min(50,Math.max(1,v)):1)}/>}<RodDiagram p={p} exaggeration={diameterScale}/></section>
 {!r?<p role="status">Temperaturverläufe werden berechnet …</p>:<>
 {r.warnings.length>0&&<aside className="rod-warning" aria-label="Modellhinweise"><h2>Hinweise zur Modellgültigkeit</h2><ul>{r.warnings.map(w=><li key={w}>{w}</li>)}</ul></aside>}
 <section className="controls"><h2>Zeitpunkt und Temperaturverlauf</h2><label>Berechneter Zeitpunkt t = {f(r.times[selectedFrame])} s<input type="range" min={0} max={r.times.length-1} step={1} value={selectedFrame} onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/></label><div className="button-row"><button onClick={()=>{if(selectedFrame===r.times.length-1)setFrame(0);setPlaying(x=>!x);}}>{playing?'Pause':'Animation starten'}</button><button onClick={()=>{setPlaying(false);setFrame(0);}}>Anfangsbedingung</button><button onClick={()=>{setPlaying(false);setFrame(r.times.length-1);}}>Endzeit</button><button onClick={exportCsv}>Aktuelles Profil als CSV (ungerundet)</button></div>
 <Chart title="Temperatur über dem Ort" description={<>Anfangsbedingung, ausgewählter Zeitpunkt und separat berechneter stationärer Zustand. Gestrichelte senkrechte Linien markieren Segmentgrenzen. Unterbrechungen zeigen Temperatursprünge an Kontaktwiderständen.</>} data={makeTraces(p,r,selectedFrame)} layout={{xaxis:{title:{text:'Ort x [mm]'},range:[0,r.mesh.length*1000]},yaxis:{title:{text:'Temperatur T [°C]'}},legend:{orientation:'h',y:-.24},margin:{l:75,r:20,t:20,b:100},separators:',.',uirevision:'rod-profile',shapes:r.mesh.interfaces.map(face=>({type:'line',x0:face.x*1000,x1:face.x*1000,y0:0,y1:1,yref:'paper',line:{color:'#70899a',width:1,dash:'dash'}}))}}/>
 <div className="result"><p><strong>Wärmekapazitätsgewichtete Mitteltemperatur: {f(average)} °C</strong></p><p>Aktueller Temperaturbereich: {f(Math.min(...currentProfile!.temperature))} bis {f(Math.max(...currentProfile!.temperature))} °C.</p><p>{r.stationaryMessage}</p>{difference!==null&&<p>Maximale Abweichung der Zelltemperaturen vom stationären Zustand: {f(difference)} K.</p>}<p className="rod-hint">{r.cells} Rechenzellen, {r.steps} Zeitschritte. Der Zeitregler zeigt berechnete Zeitpunkte. Anzeigen gerundet, Berechnung und CSV ungerundet.</p></div>
 {r.mesh.interfaces.length>0&&<div className="rod-table"><table><caption>Kontaktstellen am ausgewählten Zeitpunkt (Wärmestrom positiv von links nach rechts)</caption><thead><tr><th>Kontakt</th><th>x [mm]</th><th>Q̇ [W]</th><th>T⁻ [°C]</th><th>T⁺ [°C]</th><th>Temperatursprung [K]</th></tr></thead><tbody>{r.mesh.interfaces.map(face=>{
  const q=selectedFrame===0?null:r.mesh.conductance[face.left]*(selected![face.left]-selected![face.right]);
  const left=selected![face.left]-(q??0)*r.mesh.dx[face.left]/(2*r.mesh.conductivity[face.left]*r.mesh.area[face.left]);
  const right=selected![face.right]+(q??0)*r.mesh.dx[face.right]/(2*r.mesh.conductivity[face.right]*r.mesh.area[face.right]);
  return <tr key={face.contact}><th>{face.contact+1}</th><td>{f(face.x*1000)}</td><td>{q===null?'Anfangsbedingung':f(q)}</td><td>{f(left)}</td><td>{f(right)}</td><td>{f(left-right)}</td></tr>;
 })}</tbody></table></div>}
 </section></>}
 </>}
 <SupportFooter appName="Wärmeleitung im Stab" reviewed={false}/></article>;
}
