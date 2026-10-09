import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {Chart} from '../../components/Chart';
import {SupportFooter} from '../../components/SupportFooter';
import {MathExpression,math} from '../../components/MathNotation';
import {axes,planeAxes,validate,pointTemperature,pointInPlane,analyzePoint} from './logic';
import {defaults,type Parameters,type View,type Slice,type Plane} from './types';
import {materials} from './materials';
import {drawDiagram,diagramPoint,WIDTH,HEIGHT,fmt,plotTicks,displayNumber} from './diagram';
import {exportExcel,exportPng} from './exports';
import './style.css';
type Result={p:Parameters;view:View;slice:Slice;point:number[]|null;analysis:ReturnType<typeof analyzePoint>|null};
const initialView:View={plane:'XY',position:0,time:0,smooth:false};
function NumberInput({label,value,onChange,min,max,step='any'}:{label:ReactNode;value:number;onChange:(v:number)=>void;min?:number;max?:number;step?:number|'any'}) {
  const [focused,setFocused]=useState(false);
  return <label>{label}<input type="number" onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} value={Number.isNaN(value)?'':focused?value:displayNumber(value)} min={min} max={max} step={step} onChange={e=>onChange(e.target.value===''?NaN:Number(e.target.value))}/></label>;
}
function Description(){return <details className="heat-description"><summary>Programmbeschreibung</summary>
  <p>Die Anwendung zeigt, wie sich die Temperatur in einem <strong>quaderförmigen Bauteil</strong> während der Abkühlung verändert. Material, Abmessungen und Wärmeübergang zur Umgebung können eingestellt sowie verschiedene Schnitte und Zeitpunkte betrachtet werden. Gegenüberliegende Flächen dürfen unterschiedliche Wärmeübergangskoeffizienten besitzen.</p>
  <div className="formula-list">
    <MathExpression label="Biot-Zahl: alpha i plus oder minus mal L i geteilt durch lambda">{math.row(math.index('Bi','i,±'),math.operator('='),math.fraction(math.row(math.index('α','i,±'),math.index('L','i,char')),math.identifier('λ')))}</MathExpression>
    <MathExpression label="Fourier-Zahl: a mal t geteilt durch L i zum Quadrat">{math.row(math.index('Fo','i'),math.operator('='),math.fraction(math.row(math.identifier('a'),math.identifier('t')),math.row(math.index('L','i,char'),math.operator('²'))))}</MathExpression>
    <MathExpression label="Temperaturleitfähigkeit: lambda geteilt durch rho mal c p">{math.row(math.identifier('a'),math.operator('='),math.fraction(math.identifier('λ'),math.row(math.identifier('ρ'),math.index('c','p'))))}</MathExpression>
  </div>
  <p>Für jede Richtung i = x, y, z ist L<sub>i,char</sub> die <strong>halbe Bauteilabmessung</strong>, auch bei asymmetrischer Kühlung. α bezeichnet den Wärmeübergangskoeffizienten, λ die Wärmeleitfähigkeit, ρ die Dichte und cₚ die spezifische Wärmekapazität. − und + kennzeichnen die gegenüberliegenden Flächen. Bei α = 0 ist die betreffende Fläche adiabatisch: Über sie fließt keine Wärme.</p>
  <p>Die <strong>Biot-Zahl</strong> beschreibt, wie stark der Wärmeübergang an der Oberfläche im Verhältnis zur Wärmeleitung im Inneren wirkt.</p><ul><li>Kleine Werte: Wärme wird im Inneren vergleichsweise schnell verteilt; die Temperatur bleibt in der jeweiligen Richtung annähernd gleichmäßig.</li><li>Bei größeren Werten kann die Oberfläche Wärme schneller abgeben, als sie aus dem Inneren nachgeliefert wird. Deutliche Temperaturunterschiede können entstehen.</li></ul>
  <p>Die <strong>Fourier-Zahl</strong> setzt die vergangene Zeit ins Verhältnis zur charakteristischen Wärmeleitungszeit über die angegebene Strecke. Je größer sie ist, desto weiter ist der Temperaturausgleich durch Wärmeleitung fortgeschritten. Sie beschreibt nicht allein, wie weit das Bauteil bereits abgekühlt ist.</p>
  <p>Das Modell nimmt eine gleichmäßige Anfangstemperatur, konstante Stoffwerte und eine gemeinsame konstante Umgebungstemperatur an. Die Wärmeübergangskoeffizienten sind auf jeder Fläche gleichmäßig und zeitlich konstant. Wärmestrahlung, Wärmequellen und lokale Kontaktstellen werden nicht berücksichtigt. Die auswählbare Glättung verändert ausschließlich die Darstellung. Alle Temperaturen werden in °C ausgegeben.</p>
  <details><summary>Berechnungsmodell</summary><p>Die dreidimensionale Temperaturverteilung wird aus drei eindimensionalen Wärmeleitungslösungen zusammengesetzt. Gemeinsam liefern sie Temperaturen an beliebigen Punkten im Quader und berücksichtigen die Wärmeabgabe über alle sechs Außenflächen. Es wird kein numerisches 3D-Rechengitter zeitlich durchgerechnet.</p><p>Die Lösungen werden als Reihen ausgewertet. Die Termzahl wird automatisch so gewählt, dass die konservativ abgeschätzte Temperaturabweichung höchstens 0,01 K beträgt. Bei extrem frühen Zeitpunkten kann das Limit von 2048 Termen je Richtung erreicht werden; die App zeigt dies an. Bei t = 0 wird die vorgegebene Anfangstemperatur direkt ausgegeben. Die Auswertepunkte bestimmen die Bildauflösung, nicht die Genauigkeit der analytischen Lösung.</p></details>
</details>;}
export default function HeatApp(){
  const [p,setP]=useState<Parameters>(defaults),[material,setMaterial]=useState('steel'),[asymmetric,setAsymmetric]=useState(false),[view,setView]=useState<View>(initialView),[result,setResult]=useState<Result|null>(null),[history,setHistory]=useState<{time:number;temperature:number|null}[]>([]),[playing,setPlaying]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[exporting,setExporting]=useState(false),[selected,setSelected]=useState<number[]|null>(null),[pointValues,setPointValues]=useState([0,0,0]);
  const canvas=useRef<HTMLCanvasElement>(null),worker=useRef<Worker|null>(null),nextId=useRef(0),latest=useRef(0),requests=useRef(new Map<number,{p:Parameters;view:View;point:number[]|null;curveKey:string}>()),curveSignature=useRef('');
  const signature=JSON.stringify(p),[h,v,n]=planeAxes(view.plane);
  const problem=useMemo(()=>{try{validate(p);return '';}catch(e){return (e as Error).message;}},[signature]);
  useEffect(()=>{
    const w=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});worker.current=w;
    w.onmessage=e=>{
      const {id,slice,analysis,history:curve,error:issue}=e.data;const request=requests.current.get(id);requests.current.delete(id);
      if(id!==latest.current||!request)return;
      setBusy(false);if(issue){setError(issue);return;}setError('');setResult({...request,slice,analysis});if(curve){setHistory(curve);curveSignature.current=request.curveKey;}if(!request.point)setHistory([]);
    };
    w.onerror=()=>{setBusy(false);setError('Hintergrundberechnung fehlgeschlagen. Bitte Seite neu laden.');};
    return()=>{w.terminate();worker.current=null;};
  },[]);
  useEffect(()=>{
    latest.current=++nextId.current; // invalidate stale results immediately, even for invalid input
    if(problem){setBusy(false);setPlaying(false);return;}
    const id=latest.current,safeView={...view,time:Math.max(0,Math.min(p.endTime,view.time)),position:Math.max(-p.size[n]/2,Math.min(p.size[n]/2,view.position))};
    setBusy(true);
    const point=pointInPlane(p,safeView,selected),curveKey=JSON.stringify([p,point]);
    const timer=setTimeout(()=>{requests.current.set(id,{p,view:safeView,point,curveKey});worker.current?.postMessage({id,p,view:safeView,point,curve:!!point&&curveSignature.current!==curveKey});},80);
    return()=>clearTimeout(timer);
  },[signature,view.plane,view.position,view.time,problem,JSON.stringify(selected)]);
  useEffect(()=>{if(result&&canvas.current)drawDiagram(canvas.current,result.p,{...result.view,smooth:view.smooth},result.slice,selected?result.point:null);},[result,view.smooth,selected]);
  useEffect(()=>{
    if(!playing||busy||problem)return;
    const timer=setTimeout(()=>setView(current=>{const time=Math.min(p.endTime,current.time+p.endTime/120);if(time>=p.endTime)setPlaying(false);return {...current,time};}),100);
    return()=>clearTimeout(timer);
  },[playing,busy,view.time,p.endTime,problem]);
  const scalar=(key:keyof Parameters,value:number)=>{setPlaying(false);setP(current=>({...current,[key]:value}));};
  const setMaterialValue=(key:'conductivity'|'density'|'cp',value:number)=>{setMaterial('custom');scalar(key,value);};
  const setDimension=(i:number,value:number)=>{setPlaying(false);setP(current=>({...current,size:current.size.map((x,j)=>j===i?value:x) as Parameters['size']}));if(i===n)setView(current=>({...current,position:0}));setSelected(null);};
  const setAlpha=(i:number,value:number)=>{setPlaying(false);setP(current=>({...current,alphas:current.alphas.map((x,j)=>(asymmetric?j===i:Math.floor(j/2)===Math.floor(i/2))?value:x) as Parameters['alphas']}));};
  const changePlane=(plane:Plane)=>{setView(current=>({...current,plane,position:0}));setSelected(null);};
  const currentView=result?{...result.view,smooth:view.smooth}:view;
  const effectivePoint=selected?result?.point??null:null,pointT=effectivePoint?result?.analysis?.temperature??null:null;
  const choosePoint=(pos:number[])=>{setSelected(pos);setPointValues(pos);};
  const doExport=async(format:'png'|'excel')=>{if(!result)return;setExporting(true);try{if(format==='png')await exportPng(result.p,currentView,result.slice,effectivePoint);else await exportExcel(result.p,currentView,result.slice);}catch(e){setError((e as Error).message);}finally{setExporting(false);}};
  return <div className="heat-app"><h1>Temperaturverteilung</h1><Description/>
  <section className="controls"><h2>Material & Geometrie</h2><div className="input-grid heat-material-row">
    <label>Material<select value={material} onChange={e=>{const id=e.target.value;setMaterial(id);if(id==='custom')return;const m=materials.find(m=>m.id===id)!;setPlaying(false);setP(current=>({...current,material:m.name,conductivity:m.conductivity,density:m.density,cp:m.cp}));}}>{materials.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}<option value="custom">Benutzerdefiniert (Werte übernehmen)</option></select></label>
    <label>Materialname<input type="text" maxLength={80} value={p.material} disabled={material!=='custom'} onChange={e=>setP(current=>({...current,material:e.target.value}))}/></label>
  </div><div className="input-grid heat-material-properties">
    <NumberInput label="Dichte ρ [kg/m³]" value={p.density} min={.1} max={30000} onChange={value=>setMaterialValue('density',value)}/>
    <NumberInput label={<>Wärmekapazität c<sub>p</sub> [J/(kg K)]</>} value={p.cp} min={1} max={20000} onChange={value=>setMaterialValue('cp',value)}/>
    <NumberInput label="Wärmeleitfähigkeit λ [W/(m K)]" value={p.conductivity} min={.001} max={10000} onChange={value=>setMaterialValue('conductivity',value)}/>
  </div><div className="input-grid heat-material-dimensions">
    {axes.map((axis,i)=><NumberInput key={axis} label={`Abmessung ${axis} [mm]`} value={p.size[i]} min={.1} max={2000} onChange={value=>setDimension(i,value)}/>)}
  </div><div className="input-grid heat-material-resolution">
    {axes.map((axis,i)=><NumberInput key={axis} label={<>Auswertepunkte N<sub>{axis}</sub></>} value={p.points[i]} min={11} max={201} step={1} onChange={value=>{setPlaying(false);setP(current=>({...current,points:current.points.map((x,j)=>i===j?value:x) as Parameters['points']}));}}/>)}
  </div><p className="heat-hint">Punktzahlen beziehen sich auf die volle Abmessung einschließlich beider Oberflächen. 11–201 Punkte je Richtung; Standard: 101 × 101 × 41.</p>
  {material!=='custom'&&<p className="heat-hint">{materials.find(m=>m.id===material)?.note} <a href={materials.find(m=>m.id===material)?.source} target="_blank" rel="noreferrer">Materialreferenz</a></p>}
  <details><summary>Hinterlegte Materialtabelle</summary><p>Konstante Richtwerte für Lehrvergleiche. Sie ersetzen keine temperaturabhängigen Werkstoffdaten. Aerogel enthält ausdrücklich angenommene Werte.</p><div className="heat-table heat-material-table"><table><thead><tr><th>Material</th><th>λ [W/(m K)]</th><th>ρ [kg/m³]</th><th>cₚ [J/(kg K)]</th></tr></thead><tbody>{materials.map(m=><tr key={m.id}><td>{m.name}</td><td>{fmt(m.conductivity)}</td><td>{fmt(m.density)}</td><td>{fmt(m.cp)}</td></tr>)}</tbody></table></div></details></section>
  <section className="controls"><h2>Temperaturen & Randbedingungen</h2><div className="input-grid"><NumberInput label={<>Anfangstemperatur T<sub>0</sub> [°C]</>} value={p.initial} min={-273.15} max={2000} onChange={value=>scalar('initial',value)}/><NumberInput label={<>Umgebungstemperatur T<sub>∞</sub> [°C]</>} value={p.ambient} min={-273.15} max={2000} onChange={value=>scalar('ambient',value)}/><NumberInput label="Endzeit [s]" value={p.endTime} min={.001} max={1e7} onChange={value=>{scalar('endTime',value);setView(current=>({...current,time:0}));}}/></div>
  <fieldset className="heat-radios"><legend>Wärmeübergang</legend><label><input type="radio" name="boundary" checked={!asymmetric} onChange={()=>{setAsymmetric(false);setP(current=>({...current,alphas:current.alphas.map((_,i)=>current.alphas[2*Math.floor(i/2)]) as Parameters['alphas']}));}}/>Gegenüberliegende Flächen gleich</label><label><input type="radio" name="boundary" checked={asymmetric} onChange={()=>setAsymmetric(true)}/>Jede Fläche einzeln</label></fieldset>
  <div className="input-grid">{axes.flatMap((axis,i)=>(asymmetric?[0,1]:[0]).map(side=><div key={`${axis}${side}`}><NumberInput label={<>α<sub>{axis}{asymmetric?(side===0?'−':'+'):''}</sub> [W/(m² K)]</>} value={p.alphas[2*i+side]} min={0} max={100000} onChange={value=>setAlpha(2*i+side,value)}/>{p.alphas[2*i+side]===0&&<strong>Adiabatisch</strong>}</div>))}</div><p className="heat-hint">−: negative Koordinatenseite, +: positive Koordinatenseite. z− ist unten, z+ oben. α = 0 bedeutet isoliert.</p></section>
  <section className="controls"><h2>Schnitt & Zeitpunkt</h2><fieldset className="heat-radios"><legend>Schnittorientierung</legend>{(['XY','XZ','YZ'] as Plane[]).map(plane=><label key={plane}><input type="radio" name="plane" checked={view.plane===plane} onChange={()=>changePlane(plane)}/>{plane}</label>)}</fieldset>
  <div className="heat-toolbar"><div><NumberInput label={`Schnittposition ${axes[n]} [mm]`} value={view.position} min={-p.size[n]/2} max={p.size[n]/2} onChange={value=>{if(Number.isFinite(value))setView(current=>({...current,position:Math.max(-p.size[n]/2,Math.min(p.size[n]/2,value))}));}}/><input aria-label="Schnittebene verschieben" type="range" min={-p.size[n]/2} max={p.size[n]/2} step={p.size[n]/1000||.001} value={view.position} disabled={!!problem} onChange={e=>{setView(current=>({...current,position:Number(e.target.value)}));}}/></div><div><NumberInput label="Zeitpunkt [s]" value={view.time} min={0} max={p.endTime} onChange={value=>{if(Number.isFinite(value)){setPlaying(false);setView(current=>({...current,time:Math.max(0,Math.min(p.endTime,value))}));}}}/><input aria-label="Zeitpunkt wählen" type="range" min={0} max={p.endTime} step={p.endTime/1000||.001} value={view.time} disabled={!!problem} onChange={e=>{setPlaying(false);setView(current=>({...current,time:Number(e.target.value)}));}}/></div></div>
  <div className="button-row"><button disabled={!!problem} onClick={()=>{if(!playing&&view.time>=p.endTime)setView(current=>({...current,time:0}));setPlaying(!playing);}}>{playing?'Pause':'Animation starten'}</button><button onClick={()=>{setPlaying(false);setView(current=>({...current,time:0}));}}>Zeit auf 0 setzen</button><button onClick={()=>{setPlaying(false);setP({...defaults,size:[...defaults.size],points:[...defaults.points],alphas:[...defaults.alphas]});setView(initialView);setAsymmetric(false);setMaterial('steel');setSelected(null);}}>Standardwerte wiederherstellen</button></div>
  <fieldset className="heat-radios"><legend>Darstellung</legend><label><input type="radio" name="smoothing" checked={!view.smooth} onChange={()=>setView(current=>({...current,smooth:false}))}/>Farbfelder</label><label><input type="radio" name="smoothing" checked={view.smooth} onChange={()=>setView(current=>({...current,smooth:true}))}/>Bilinear geglättet</label></fieldset>
  <p className="heat-status" role="status">{problem?'Eingaben korrigieren.':busy?'Temperaturfeld wird berechnet …':result?'Temperaturfeld berechnet.':'Berechnung startet …'}</p>
  {(problem||error)&&<p className="error" role="alert">{problem||error}</p>}
  {result&&!result.slice.converged&&<p className="error" role="alert">Genauigkeitsziel 0,01 K nicht erreicht. Die dargestellten Werte sind eine begrenzte Reihenapproximation. Bitte einen späteren Zeitpunkt wählen.</p>}
  </section>
  {result&&<><figure><figcaption><h2>Temperaturkarte</h2><p>Maßstabsgerechter Schnitt mit Temperaturen in °C. Klicken oder tippen, um einen Punkt auszulesen. Der Quader zeigt die eingegebenen Bauteilproportionen.</p></figcaption>
  <canvas className="heat-canvas" ref={canvas} width={WIDTH} height={HEIGHT} role="img" aria-label={`Temperaturkarte ${result.view.plane}, Zeitpunkt ${fmt(result.view.time)} Sekunden; Mittelpunkt ${fmt(result.slice.center)} Grad Celsius. Punktwerte können unten mit Koordinaten abgefragt werden.`} onClick={e=>{const rect=e.currentTarget.getBoundingClientRect(),pos=diagramPoint(result.p,currentView,(e.clientX-rect.left)/rect.width*WIDTH,(e.clientY-rect.top)/rect.height*HEIGHT);if(pos)choosePoint(pos);}}/>
  <p className="heat-readout" aria-live="polite">{selected&&pointT!==null?`${axes.map((axis,i)=>`${axis} = ${fmt(effectivePoint![i])} mm`).join(' · ')} · T = ${fmt(pointT)} °C`:'Noch kein Punkt ausgewählt.'}</p>
  <div className="button-row"><button disabled={busy||!!problem} onClick={()=>{setView(current=>({...current,position:0}));choosePoint([0,0,0]);}}>Mittelpunkt</button><button disabled={!selected} onClick={()=>{setSelected(null);setHistory([]);curveSignature.current='';}}>Punktauswahl löschen</button></div>
  <details><summary>Punkt über Koordinaten auswählen (Tastatur)</summary><div className="heat-point-inputs">{axes.map((axis,i)=>i===planeAxes(result.view.plane)[2]?<p key={axis}>{axis} = {fmt(result.view.position)} mm (Schnittposition)</p>:<NumberInput key={axis} label={`${axis} [mm]`} value={pointValues[i]} min={-result.p.size[i]/2} max={result.p.size[i]/2} onChange={value=>setPointValues(current=>current.map((x,j)=>i===j?value:x))}/>)}</div><button onClick={()=>{const pos=[...pointValues],normal=planeAxes(result.view.plane)[2];pos[normal]=result.view.position;try{pointTemperature(result.p,result.view.time,pos);choosePoint(pos);setError('');}catch(e){setError((e as Error).message);}}}>Punkt auswerten</button></details>
  </figure>
  <details className="heat-terms"><summary>Verwendete Reihenglieder</summary><p>{axes.map((axis,i)=>`${axis.toUpperCase()}: ${result.slice.terms[i]}`).join(" · ")}</p><p>Diese Zahlen geben die Anzahl berücksichtigter Glieder der analytischen Reihe an, nicht die Anzahl der Auswertepunkte. Bei t = 0 wird die Anfangstemperatur direkt vorgegeben; dafür ist keine Reihe erforderlich.</p></details>
  <section className="controls"><h2>Kennzahlen</h2><p>Bezugsgröße: jeweils die halbe Abmessung. Hervorgehobene Zeilen gehören zur dargestellten Fläche.</p><div className="heat-table"><table><thead><tr><th>Richtung</th><th>L [mm]</th><th>Bi−</th><th>Bi+</th><th>Fo</th></tr></thead><tbody>{axes.map((axis,i)=><tr key={axis} className={i!==planeAxes(result.view.plane)[2]?'heat-visible':''}><th>{axis}{i!==planeAxes(result.view.plane)[2]?' (Schnitt)':''}</th><td>{fmt(result.p.size[i]/2)}</td><td>{fmt(result.slice.bi[2*i])}</td><td>{fmt(result.slice.bi[2*i+1])}</td><td>{fmt(result.slice.fo[i])}</td></tr>)}</tbody></table></div><div className="button-row"><button disabled={busy||!!problem||exporting} onClick={()=>doExport('excel')}>Aktuellen Schnitt als Excel</button><button disabled={busy||!!problem||exporting} onClick={()=>doExport('png')}>Vollständige Abbildung als PNG</button></div><p className="heat-hint">Export enthält den dargestellten Zeitpunkt, Schnitt, Kennzahlen und Parameter. Die Farbskala bleibt über Zeit und Schnittposition fest.</p></section>
  <div className="charts">{[0,1].map(i=>{
    const axis=i===0?result.slice.horizontal:result.slice.vertical,axisIndex=axes.indexOf(axis),profile=effectivePoint?result.analysis?.profiles[i]:null;
    return profile&&pointT!==null?<Chart key={i} title={`Temperaturprofil in ${axis}-Richtung`} description="Profil durch den ausgewählten Punkt. Rahmen links und rechts: Bauteiloberflächen; Markierung: ausgewählter Ort." data={[
      {x:profile.x,y:profile.temperature,type:'scatter',mode:'lines',name:'Temperaturprofil',line:{color:'#164a87'},text:profile.x.map((x,j)=>`${fmt(x)} mm · ${fmt(profile.temperature[j])} °C`),hovertemplate:'%{text}<extra></extra>'},
      {x:[effectivePoint![axisIndex]],y:[pointT],type:'scatter',mode:'markers',name:'Ausgewählter Punkt',marker:{color:'#a34800',size:11},text:[`${fmt(effectivePoint![axisIndex])} mm · ${fmt(pointT)} °C`],hovertemplate:'%{text}<extra></extra>'}
    ]} layout={{showlegend:false,xaxis:{title:{text:`${axis} [mm]`},range:[-result.p.size[axisIndex]/2,result.p.size[axisIndex]/2],showline:true,mirror:true,linecolor:'#162c3c',linewidth:2,...plotTicks(-result.p.size[axisIndex]/2,result.p.size[axisIndex]/2)},yaxis:{title:{text:'Temperatur [°C]'},range:[Math.min(result.p.initial,result.p.ambient)-1,Math.max(result.p.initial,result.p.ambient)+1],showline:true,mirror:true,linecolor:'#162c3c',...plotTicks(Math.min(result.p.initial,result.p.ambient)-1,Math.max(result.p.initial,result.p.ambient)+1)}}}/>:<figure key={i} className="heat-placeholder"><h2>Temperaturprofil in {axis}-Richtung</h2><p>Bitte einen Punkt auswählen.</p></figure>;
  })}</div>
  {effectivePoint&&pointT!==null&&history.length>0?<Chart title="Abkühlkurve des ausgewählten Punkts" description={`Fester räumlicher Ort: ${axes.map((axis,i)=>`${axis} = ${fmt(effectivePoint[i])} mm`).join(' · ')}. Zeitpunkte ohne erreichte Reihengenauigkeit werden ausgelassen.`} data={[
    {x:history.map(r=>r.time),y:history.map(r=>r.temperature),text:history.map(r=>r.temperature===null?'':`${fmt(r.time)} s · ${fmt(r.temperature)} °C`),hovertemplate:'%{text}<extra></extra>',connectgaps:false,type:'scatter',mode:'lines',name:'Ausgewählter Ort',line:{color:'#164a87'}},
    {x:[result.view.time],y:[pointT],text:[`${fmt(result.view.time)} s · ${fmt(pointT)} °C`],hovertemplate:'%{text}<extra></extra>',type:'scatter',mode:'markers',name:'Aktueller Zeitpunkt',marker:{color:'#a34800',size:12}}
  ]} layout={{xaxis:{title:{text:'Zeit [s]'},range:[0,result.p.endTime],...plotTicks(0,result.p.endTime)},yaxis:{title:{text:'Temperatur [°C]'},range:[Math.min(result.p.initial,result.p.ambient)-1,Math.max(result.p.initial,result.p.ambient)+1],...plotTicks(Math.min(result.p.initial,result.p.ambient)-1,Math.max(result.p.initial,result.p.ambient)+1)},legend:{orientation:'h'}}}/>:<figure className="heat-placeholder"><h2>Abkühlkurve</h2><p>Bitte einen Punkt auswählen.</p></figure>}

  </>}
  <SupportFooter appName="Temperaturverteilung" reviewed={false}/></div>;
}
