import { describe, expect, it } from 'vitest';
import { buildMesh, endAlpha, format, modelWarnings, profile, segmentAlpha, shoulderAlpha, simulate, validate } from '../src/apps/waermeleitung-stab/logic';
import { defaults, defaultContact, defaultSegment } from '../src/apps/waermeleitung-stab/types';
import { materials } from '../src/lib/thermalMaterials';

function isolated() {
 const p=defaults();p.alpha=0;p.left.kind='neumann';p.right.kind='neumann';return p;
}
describe('Wärmeleitung im Stab: analytische und energetische Referenzfälle',()=>{
 it('reproduziert die analytische stationäre Rippenlösung aus dem Aufschrieb',()=>{
  const p=defaults(),r=simulate(p),s=p.segments[0],L=s.length/1000;
  const m=Math.sqrt(4*p.alpha/(s.conductivity*s.diameter/1000));
  const exact=(x:number)=>p.ambient+(p.left.temperature-p.ambient)*Math.cosh(m*(L-x))/Math.cosh(m*L);
  expect(r.stationaryKind).toBe('unique');
  expect(Math.max(...r.stationary!.map((t,i)=>Math.abs(t-exact(r.mesh.x[i]))))).toBeLessThan(.004);
 });
 it('reproduziert das instationäre Fourierprofil bei Dirichlet links, adiabatisch rechts',()=>{
  const p=isolated();p.left.kind='dirichlet';p.left.temperature=100;p.endTime=100;
  const r=simulate(p,{cells:180,steps:4000,frames:101}),s=p.segments[0],L=s.length/1000,a=s.conductivity/(s.density*s.cp);
  const exact=(x:number)=>100+(p.initial-100)*Array.from({length:80},(_,n)=>{
   const mu=(n+.5)*Math.PI;return 2/mu*Math.sin(mu*x/L)*Math.exp(-a*mu*mu*p.endTime/(L*L));
  }).reduce((sum,v)=>sum+v,0);
  expect(Math.max(...r.temperatures.at(-1)!.map((t,i)=>Math.abs(t-exact(r.mesh.x[i]))))).toBeLessThan(.012);
 });
 it('liefert einen gleichmäßig linearen stationären Stab zwischen zwei Festtemperaturen',()=>{
  const p=isolated();p.left.kind='dirichlet';p.right.kind='dirichlet';p.left.temperature=100;p.right.temperature=20;
  const r=simulate(p);
  r.stationary!.forEach((t,i)=>expect(t).toBeCloseTo(100-80*r.mesh.x[i]/r.mesh.length,8));
 });
 it('liefert den Serienwiderstand verschiedener Materialien, Durchmesser und Kontaktwiderstand',()=>{
  const p=isolated();p.segments=[{...defaultSegment(1),length:80,diameter:10},{...defaultSegment(2),length:120,diameter:15,conductivity:400}];
  p.contacts=[{...defaultContact(),perfect:false,resistance:.002}];p.left.kind='dirichlet';p.left.temperature=100;p.right.kind='dirichlet';p.right.temperature=20;
  const areas=p.segments.map(s=>Math.PI*(s.diameter/1000)**2/4);
  const resistance=p.segments.reduce((sum,s,i)=>sum+s.length/1000/(s.conductivity*areas[i]),0)+p.contacts[0].resistance/Math.min(...areas);
  const q=80/resistance,r=simulate(p),face=r.mesh.interfaces[0];
  const computed=r.mesh.conductance[face.left]*(r.stationary![face.left]-r.stationary![face.right]);
  expect(computed).toBeCloseTo(q,10);
  const line=profile(r.mesh,p,r.stationary!),indices=line.x.map((x,i)=>Math.abs(x-80)<1e-8?i:-1).filter(i=>i>=0);
  expect(line.temperature[indices[0]]-line.temperature[indices[1]]).toBeCloseTo(q*.002/Math.min(...areas),9);
 });
 it('behält die Temperaturstetigkeit bei perfektem Kontakt und unterschiedlichen Durchmessern',()=>{
  const p=isolated();p.segments=[defaultSegment(1),{...defaultSegment(2),diameter:20,conductivity:200}];p.contacts=[defaultContact()];p.left.kind='dirichlet';p.left.temperature=100;p.right.kind='dirichlet';
  const r=simulate(p),line=profile(r.mesh,p,r.stationary!),indices=line.x.map((x,i)=>Math.abs(x-200)<1e-8?i:-1).filter(i=>i>=0);
  expect(line.temperature[indices[0]]).toBeCloseTo(line.temperature[indices[1]],10);
 });
 it('berechnet den Widerstand aus Wärmeleitung und Endkonvektion',()=>{
  const p=isolated();p.left.kind='dirichlet';p.left.temperature=100;p.right.kind='robin';p.right.inheritAlpha=false;p.right.alpha=25;p.ambient=20;
  const r=simulate(p),s=p.segments[0],A=Math.PI*(s.diameter/1000)**2/4;
  const q=80/(s.length/1000/(s.conductivity*A)+1/(25*A));
  const expectedTip=20+q/(25*A),line=profile(r.mesh,p,r.stationary!);
  expect(line.temperature.at(-1)).toBeCloseTo(expectedTip,9);
 });
 it('erhält die Energie eines isolierten Stabs mit verschiedenen Anfangstemperaturen',()=>{
  const p=isolated();p.segments=[defaultSegment(1),{...defaultSegment(2),density:2700,cp:888,initial:100,conductivity:200}];p.initialPerSegment=true;p.contacts=[{...defaultContact(),perfect:false}];
  const r=simulate(p);const energy=(t:number[])=>t.reduce((sum,T,i)=>sum+T*r.mesh.capacity[i],0),E=energy(r.mesh.initial),C=r.mesh.capacity.reduce((a,b)=>a+b,0);
  for(const t of r.temperatures)expect(Math.abs(energy(t)-E)/Math.abs(E)).toBeLessThan(2e-10);
  expect(r.stationaryKind).toBe('energy');r.stationary!.forEach(T=>expect(T).toBeCloseTo(E/C,10));
 });
 it('bewertet adiabatischen Mantel mit Festtemperatur und isolierter Spitze als stationär',()=>{
  const p=isolated();p.left.kind='dirichlet';p.left.temperature=60;
  const r=simulate(p);expect(r.stationaryKind).toBe('unique');r.stationary!.forEach(T=>expect(T).toBeCloseTo(60,8));
 });
 it('erkennt fehlenden stationären Zustand und korrekte mittlere Temperaturzunahme',()=>{
  const p=isolated();p.left.flux=-1000;p.endTime=10;
  const r=simulate(p),C=r.mesh.capacity.reduce((a,b)=>a+b,0),last=r.temperatures.at(-1)!;
  expect(r.stationaryKind).toBe('none');expect(r.stationary).toBeNull();
  const average=last.reduce((sum,T,i)=>sum+T*r.mesh.capacity[i],0)/C;
  expect(average).toBeCloseTo(p.initial+1000*r.mesh.area[0]*p.endTime/C,8);
 });
 it('legt bei ausgeglichenen Neumann-Wärmeströmen das Niveau über die Energie fest',()=>{
  const p=isolated();p.left.flux=-100;p.right.flux=100;const r=simulate(p);
  expect(r.stationaryKind).toBe('energy');
  const expected=(x:number)=>p.initial+100/p.segments[0].conductivity*(r.mesh.length/2-x);
  r.stationary!.forEach((T,i)=>expect(T).toBeCloseTo(expected(r.mesh.x[i]),10));
 });
 it('verwendet gleiche OUTWARD Vorzeichenkonvention an beiden Stirnflächen',()=>{
  const p=isolated();p.right.flux=-1000;const r=simulate(p,{steps:200,frames:21});
  expect(r.temperatures.at(-1)!.at(-1)).toBeGreaterThan(r.temperatures.at(-1)![0]);
  const line=profile(r.mesh,p,r.temperatures.at(-1)!);
  expect(line.temperature.at(-1)).toBeGreaterThan(r.temperatures.at(-1)!.at(-1)!);
 });
 it('nutzt Schulterkonvektion als zusätzlichen bilanzierten Verlust und ermöglicht Gleichgewicht',()=>{
  const p=isolated();p.segments=[defaultSegment(1),{...defaultSegment(2),diameter:20}];p.contacts=[{...defaultContact(),shoulder:'convection',inheritAlpha:false,alpha:10}];p.left.flux=-1000;
  const r=simulate(p),ring=Math.PI*(.02**2-.01**2)/4;
  expect(r.stationaryKind).toBe('unique');
  expect(r.mesh.sink.reduce((a,b)=>a+b,0)).toBeCloseTo(10*ring,12);
  const sum=r.stationary!.reduce((a,T,i)=>a+r.mesh.source[i]-r.mesh.sink[i]*T,0);
  expect(Math.abs(sum)).toBeLessThan(1e-9);
 });
 it('berechnet bei gleichen Durchmessern keinen Schulterverlust',()=>{
  const p=isolated();p.segments=[defaultSegment(1),defaultSegment(2)];p.contacts=[{...defaultContact(),shoulder:'convection',inheritAlpha:false,alpha:100}];
  expect(buildMesh(p).sink.reduce((a,b)=>a+b,0)).toBe(0);
 });
 it('hat das richtige Anfangsprofil auch bei inkompatiblen Festtemperaturen',()=>{
  const p=defaults();p.left.temperature=100;const mesh=buildMesh(p),q=profile(mesh,p,mesh.initial,true);
  expect(q.temperature.every(T=>T===p.initial)).toBe(true);
  expect(profile(mesh,p,mesh.initial,false).temperature[0]).toBe(100);
 });
 it('ist bei Gitter- und Zeitschrittverfeinerung für die Rippenlösung konvergent',()=>{
  const p=defaults();p.endTime=100;
  const coarse=simulate(p,{cells:80,steps:1000,frames:101}),fine=simulate(p,{cells:160,steps:2000,frames:101});
  const coarseMean=coarse.temperatures.at(-1)!.reduce((a,b)=>a+b,0)/coarse.cells;
  const fineMean=fine.temperatures.at(-1)!.reduce((a,b)=>a+b,0)/fine.cells;
  expect(Math.abs(coarseMean-fineMean)).toBeLessThan(.02);
 });
});
describe('Modellhinweise, Vererbung und Eingabegrenzen',()=>{
 it('warnt bei großer Querschnitts-Biot-Zahl und starken Durchmessersprüngen',()=>{
  const p=defaults();p.segments=[{...defaultSegment(1),conductivity:.02,material:'aerogel'},{...defaultSegment(2),diameter:100,length:10}];p.contacts=[defaultContact()];
  const warnings=modelWarnings(p).join(' ');
  expect(warnings).toContain('Bi⊥');expect(warnings).toContain('Deutlich eingeschränkte');expect(warnings).toContain('Kurzes, breites');expect(warnings).toContain('idealisierter');
 });
 it('leitet End- und Schulterkoeffizienten dynamisch vom richtigen Segment ab',()=>{
  const p=defaults();p.segments=[{...defaultSegment(1),alpha:12},{...defaultSegment(2),diameter:20,alpha:30}];p.contacts=[defaultContact()];p.alphaPerSegment=true;
  expect(segmentAlpha(p,0)).toBe(12);expect(endAlpha(p,0)).toBe(12);expect(endAlpha(p,1)).toBe(30);expect(shoulderAlpha(p,0)).toBe(30);
  p.alphaPerSegment=false;p.alpha=7;expect(endAlpha(p,1)).toBe(7);expect(shoulderAlpha(p,0)).toBe(7);
  p.right.inheritAlpha=false;p.right.alpha=9;expect(endAlpha(p,1)).toBe(9);
 });
 it.each([['length',0],['diameter',NaN],['conductivity',0],['density',-1],['cp',Infinity]] as const)('weist unzulässigen Segmentwert %s zurück',(key,value)=>{
  const p=defaults();p.segments[0][key]=value;expect(()=>validate(p)).toThrow();
 });
 it('weist Nullwiderstand im endlichen Kontaktmodus zurück, erlaubt perfekten Kontakt',()=>{
  const p=defaults();p.segments.push(defaultSegment(2));p.contacts=[{...defaultContact(),perfect:false,resistance:0}];expect(()=>validate(p)).toThrow();p.contacts[0].perfect=true;expect(()=>validate(p)).not.toThrow();
 });
 it('liefert auch für den maximalen Segmentumfang eine endliche Rechnung',()=>{
  const p=defaults();p.segments=Array.from({length:12},(_,i)=>({...defaultSegment(i+1),conductivity:i%2?400:50}));p.contacts=Array.from({length:11},defaultContact);
  const r=simulate(p,{steps:200,frames:21});expect(r.stationary!.every(Number.isFinite)).toBe(true);expect(r.temperatures.at(-1)!.every(Number.isFinite)).toBe(true);
 });
 it('bewahrt die bestehenden Stoffwerte und macht kleine Größen sichtbar',()=>{
  expect(materials.find(m=>m.id==='steel')?.cp).toBe(477);expect(materials.find(m=>m.id==='aluminum')?.cp).toBe(888);
  expect(format(.19)).toBe('1,9 · 10⁻¹');expect(format(1e-4)).toBe('1,0 · 10⁻⁴');expect(format(10)).toBe('10,0');
 });
});

describe('Segmententfernung und Wechsel gemeinsamer/segmentweiser Vorgaben',()=>{
 it('erhält die Werte des verbleibenden Segments beim Wechsel auf einen Stab',async()=>{
  const {removeSegment}=await import('../src/apps/waermeleitung-stab/logic');
  const p=defaults();p.segments=[defaultSegment(1),{...defaultSegment(2),initial:80,alpha:50}];p.contacts=[defaultContact()];p.initialPerSegment=true;p.alphaPerSegment=true;
  const changed=removeSegment(p,0);
  expect(changed.initial).toBe(80);expect(changed.alpha).toBe(50);expect(changed.contacts).toHaveLength(0);expect(changed.initialPerSegment).toBe(false);expect(changed.alphaPerSegment).toBe(false);
 });
 it('ersetzt nach Entfernung eines mittleren Segments nur den neu entstandenen Kontakt',async()=>{
  const {removeSegment}=await import('../src/apps/waermeleitung-stab/logic');
  const p=defaults();p.segments=[1,2,3,4].map(defaultSegment);p.contacts=[{...defaultContact(),perfect:false,resistance:.01},{...defaultContact(),perfect:false,resistance:.02},{...defaultContact(),perfect:false,resistance:.03}];
  const changed=removeSegment(p,1);expect(changed.segments.map(s=>s.id)).toEqual([1,3,4]);expect(changed.contacts[0]).toEqual(defaultContact());expect(changed.contacts[1].resistance).toBe(.03);
 });
 it('übernimmt beim Umschalten gemeinsame Werte und bei Zusammenfassung die Werte des ersten Segments',async()=>{
  const {setPerSegment}=await import('../src/apps/waermeleitung-stab/logic');
  const p=defaults();p.segments.push(defaultSegment(2));p.contacts=[defaultContact()];p.initial=70;p.alpha=30;
  const segmented=setPerSegment(setPerSegment(p,'initialPerSegment',true),'alphaPerSegment',true);
  expect(segmented.segments.map(s=>s.initial)).toEqual([70,70]);expect(segmented.segments.map(s=>s.alpha)).toEqual([30,30]);
  segmented.segments[0].initial=50;
  expect(setPerSegment(segmented,'initialPerSegment',false).initial).toBe(50);
 });
});
