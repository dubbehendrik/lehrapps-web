import { createElement as el, useState } from 'react';
import { MathExpression, IndexedSymbol, math as m } from '../../components/MathNotation';
import { SupportFooter } from '../../components/SupportFooter';
import { download } from '../../lib/download';
import { calculate, defaults, type Parameters } from './logic';
import './style.css';
const fields: {key:keyof Parameters; name:string; symbol:string; index?:string; unit:string; step:number}[] = [
  {key:'flow',name:'Lackvolumenstrom',symbol:'V̇',index:'LK',unit:'ml/min',step:10},
  {key:'speed',name:'Drehzahl',symbol:'n',unit:'min⁻¹',step:1000},
  {key:'diameter',name:'Glockendurchmesser',symbol:'D',unit:'mm',step:1},
  {key:'angle',name:'Konturwinkel',symbol:'β',unit:'°',step:1},
  {key:'density',name:'Lackdichte',symbol:'ρ',index:'LK',unit:'kg/m³',step:1},
  {key:'viscosity',name:'Viskosität',symbol:'η',index:'LK',unit:'mPa·s',step:1},
  {key:'surfaceTension',name:'Oberflächenspannung',symbol:'σ',unit:'mN/m',step:1},
];
const power = (base:ReturnType<typeof m.identifier>, exponent:string) => el('msup',null,base,exponent.includes('/')?m.fraction(m.number(exponent.split('/')[0]),m.number(exponent.split('/')[1])):m.number(exponent));
const product = (...items: ReturnType<typeof m.identifier>[]) => m.row(...items.flatMap((item,i)=>i?[m.operator('·'),item]:[item]));
const sqrt = (v:ReturnType<typeof m.identifier>) => el('msqrt',null,v);
const sci = (n:number) => n.toExponential(3).replace('.',',');
export default function ZerfallsartenApp() {
  const [values,setValues] = useState(Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,String(v)])) as Record<keyof Parameters,string>);
  const parameters = Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v.trim()===''?NaN:Number(v)])) as unknown as Parameters;
  let result:ReturnType<typeof calculate>|undefined, error='';
  try { result=calculate(parameters); } catch(e) { error=e instanceof Error?e.message:'Berechnung fehlgeschlagen.'; }
  const eta=m.index('η','LK'), rho=m.index('ρ','LK'), flow=m.index('V̇','LK'), sigma=m.identifier('σ'), diameter=m.identifier('D'), omega=m.identifier('ω');
  const formulas = [
    ['Oh',m.fraction(eta,sqrt(product(rho,sigma,diameter)))],
    ['Kᵦ',m.fraction(product(power(flow,'2'),rho),product(sigma,power(diameter,'3')))],
    ['We',m.fraction(product(power(omega,'2'),power(diameter,'3'),rho),sigma)],
    ['B',product(power(m.identifier('We'),'1/2'),power(m.index('K','b'),'5/6'),power(m.identifier('Oh'),'10/36'))],
    ['δ',el('mroot',null,m.fraction(product(m.number('3'),flow,eta),product(rho,m.number('2'),m.identifier('π'),power(omega,'2'),power(m.identifier('r'),'2'),m.row(m.identifier('sin'),m.operator('('),m.identifier('β'),m.operator(')')))),m.number('3'))],
    ['ω',m.fraction(product(m.number('2'),m.identifier('π'),m.identifier('n')),m.number('60'))],
  ];
  function exportCsv() {
    if(!result)return;
    const rows=[['Größe','Wert','Einheit'],...fields.map(f=>[f.name,String(parameters[f.key]),f.unit]),['Oh',String(result.oh),'−'],['Kb',String(result.kb),'−'],['We',String(result.we),'−'],['B',String(result.b),'−'],['Filmdicke',String(result.thickness),'µm']];
    download(new Blob(['\uFEFF'+rows.map(row=>row.join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}),'zerfallsarten.csv');
  }
  return <div className="zerfallsarten-app">
    <h1>Zerfallsarten an einer Rotationsglocke</h1>
    <details><summary>Hinweise zur Verwendung und Berechnung</summary>
      <p>Die App berechnet dimensionslose Kennzahlen für die Lackzerstäubung und die Filmdicke am Glockenrand unter Annahme konstanter Viskosität. Änderungen der Eingaben aktualisieren den Betriebspunkt unmittelbar.</p>
      <div className="zerfall-formulas">{formulas.map(([name,formula])=><MathExpression key={String(name)} label={`Formel für ${name}`}>{m.row(name==='Kᵦ'?m.index('K','b'):m.identifier(String(name)),m.operator('='),formula)}</MathExpression>)}</div>
      <p>In den Formeln werden SI-Einheiten verwendet; n wird in min⁻¹ eingesetzt. Der Radius ist r = D/2. Der Konturwinkel muss strikt zwischen 0° und 180° liegen. Nahe diesen Grenzen wird das Filmdickenmodell singulär.</p>
      <p>Das historische Diagramm zeigt Tropfen-, Faden- und Lamellenzerstäubung. Die Bereichsgrenzen werden aus der Abbildung abgelesen; eine automatische Klassifikation wird daraus nicht abgeleitet. Die graue Fläche ist der eingezeichnete Arbeitsbereich, keine allgemeingültige Betriebsfreigabe.</p>
      <p>Abbildung in Anlehnung an: Weckerle, G.: Beschichtung hochwertiger Karosserieoberflächen mit Pulver Slurry, Dissertation, Universität Stuttgart, 2003.</p>
    </details>
    <div className="zerfall-layout"><section className="controls"><h2>Parameter</h2><div className="input-grid">{fields.map(f=><label key={f.key}>{f.name} {f.index?<IndexedSymbol base={f.symbol} index={f.index}/>:f.symbol} [{f.unit}]<input type="number" min="0" max={f.key==='angle'?180:undefined} step={f.step} value={values[f.key]} aria-invalid={!Number.isFinite(parameters[f.key])||parameters[f.key]<=0||(f.key==='angle'&&parameters.angle>=180)} onChange={e=>setValues({...values,[f.key]:e.target.value})}/></label>)}</div><div className="button-row"><button onClick={()=>setValues(Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,String(v)])) as Record<keyof Parameters,string>)}>Standardwerte</button><button disabled={!result} onClick={exportCsv}>Ergebnisse als CSV</button></div>{error&&<p className="error" role="alert">{error}</p>}</section>
    <section><h2>Zerfallsdiagramm</h2><figure><svg className="zerfall-diagram" viewBox="0 0 1096 720" role="img" aria-label={result?`Betriebspunkt: Oh ${sci(result.oh)}, B ${sci(result.b)}. ${result.point.inside?'Im Diagrammbereich.':'Außerhalb des Diagrammbereichs.'}`:'Zerfallsdiagramm ohne gültigen Betriebspunkt'}><image href="/zerfallsarten/Diagramm.jpg" width="1096" height="720"/>{result?.point.inside&&<g><title>Betriebspunkt: Oh = {sci(result.oh)}, B = {sci(result.b)}</title><circle cx={result.point.x} cy={result.point.y} r="12" fill="white" stroke="#9d160b" strokeWidth="3"/><path d={`M ${result.point.x-20} ${result.point.y} h 40 M ${result.point.x} ${result.point.y-20} v 40`} stroke="#9d160b" strokeWidth="3"/></g>}</svg><figcaption><p>Betriebspunkt: roter Kreis mit Fadenkreuz. Logarithmische Achsen: Oh = 10⁻⁴ bis 1; B = 10⁻² bis 3.</p></figcaption></figure>
      {result&&<div className="result" aria-live="polite"><h2>Berechnete Kennzahlen</h2><dl className="zerfall-results"><div><dt>Ohnesorge-Zahl Oh</dt><dd>{sci(result.oh)}</dd></div><div><dt>Kantenbelastung <IndexedSymbol base="K" index="b"/></dt><dd>{sci(result.kb)}</dd></div><div><dt>Weber-Zahl We</dt><dd>{sci(result.we)}</dd></div><div><dt>Betriebskennzahl B</dt><dd>{sci(result.b)}</dd></div></dl><strong>Filmdicke δ = {result.thickness.toLocaleString('de-DE',{maximumFractionDigits:2,minimumFractionDigits:2})} µm</strong>{!result.point.inside&&<p role="status">Der Betriebspunkt liegt außerhalb des dargestellten Diagrammbereichs. Die Kennzahlen bleiben berechnet; eine Zerfallsart lässt sich in dieser Abbildung nicht ablesen.</p>}</div>}
    </section></div><SupportFooter appName="Zerfallsarten"/>
  </div>;
}
