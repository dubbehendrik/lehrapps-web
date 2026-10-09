import { type Parameters, type View, type Plane, type AxisSolution, type Slice, type Axis } from './types';
export const MAX_TERMS = 2048;
export const TEMPERATURE_TOLERANCE = 0.01;
export const axes: Axis[] = ['x','y','z'];
export function planeAxes(plane: Plane): [number,number,number] {
  return plane === 'XY' ? [0,1,2] : plane === 'XZ' ? [0,2,1] : [1,2,0];
}
export function validate(p: Parameters) {
  if (p.size.length !== 3 || p.points.length !== 3 || p.alphas.length !== 6) throw new Error('Unvollständige Geometrie oder Randbedingungen.');
  if(p.size.some(v=>!Number.isFinite(v)||v<0.1||v>2000)) throw new Error('Abmessungen müssen zwischen 0,1 und 2000 mm liegen.');
  if(p.points.some(v=>!Number.isInteger(v)||v<11||v>201)) throw new Error('Je Richtung sind 11–201 ganzzahlige Auswertepunkte erlaubt.');
  if(p.alphas.some(v=>!Number.isFinite(v)||v<0||v>100000)) throw new Error('Wärmeübergangskoeffizienten müssen zwischen 0 und 100.000 W/(m² K) liegen.');
  for(const [name,v,min,max] of [['Wärmeleitfähigkeit',p.conductivity,0.001,10000],['Dichte',p.density,0.1,30000],['Wärmekapazität',p.cp,1,20000]] as const)
    if(!Number.isFinite(v)||v<min||v>max) throw new Error(`${name}: zulässiger Bereich ${min}–${max}.`);
  if(!Number.isFinite(p.initial)||!Number.isFinite(p.ambient)||Math.min(p.initial,p.ambient)<-273.15||Math.max(p.initial,p.ambient)>2000) throw new Error('Temperaturen müssen zwischen −273,15 und 2000 °C liegen.');
  if(!Number.isFinite(p.endTime)||p.endTime<=0||p.endTime>1e7) throw new Error('Endzeit muss größer als 0 und höchstens 10.000.000 s sein.');
}
// On s in [0,1], phi = cos(q*s-phase), phase=atan(Bi_left_full/q).
// Robin conditions phi'(0)=Bi_left_full*phi(0), phi'(1)=-Bi_right_full*phi(1).
// Phase equation is monotone, has one root in each [n*pi,(n+1)*pi],
// and avoids tangent poles and spurious q=0 roots of determinant equations.
const cache = new Map<string, { q:number[]; phase:number[]; coefficient:number[] }>();
export function axisSolution(b0:number,b1:number,fo:number,tolerance=1e-6): AxisSolution {
  if([b0,b1,fo].some(v=>!Number.isFinite(v)||v<0)||!(tolerance>0)) throw new Error('Ungültige Kennzahlen.');
  if(b0===0&&b1===0) return {q:[],phase:[],coefficient:[],fo,tailBound:0,adiabatic:true};
  let count=1;
  const c=Math.PI**2*fo;
  // For omitted modes n>=N>=1: q_n>=n*pi, |C_n|<=6/(n*pi).
  // Integral bound on a decreasing positive envelope supplies a conservative
  // uniform spatial tail bound, rather than checking just a few sample points.
  const tail=(n:number)=>c===0?Infinity:6/Math.PI*Math.exp(-c*n*n)*(1/n+1/(2*c*n*n));
  while(count<MAX_TERMS && tail(count)>tolerance) count++;
  const key=`${b0}:${b1}`;
  let modes=cache.get(key);
  if(!modes) {
    if(cache.size>=12) cache.delete(cache.keys().next().value!);
    modes={q:[],phase:[],coefficient:[]};cache.set(key,modes);
  }
  for(let n=modes.q.length;n<count;n++) {
    let lo=n*Math.PI,hi=(n+1)*Math.PI;
    for(let k=0;k<85;k++) {
      const q=(lo+hi)/2;
      const f=q-n*Math.PI-Math.atan(b0/q)-Math.atan(b1/q);
      if(f>0) hi=q;else lo=q;
    }
    const q=(lo+hi)/2,phase=Math.atan(b0/q);
    const integral=(Math.sin(q-phase)+Math.sin(phase))/q;
    const norm=0.5+(Math.sin(2*(q-phase))+Math.sin(2*phase))/(4*q);
    modes.q.push(q);modes.phase.push(phase);modes.coefficient.push(integral/norm);
  }
  return {q:modes.q.slice(0,count),phase:modes.phase.slice(0,count),coefficient:modes.coefficient.slice(0,count),fo,tailBound:tail(count),adiabatic:false};
}
export function factor(solution:AxisSolution,s:number):number {
  if(s<0||s>1||!Number.isFinite(s)) throw new Error('Ort außerhalb des Bauteils.');
  if(solution.adiabatic||solution.fo===0) return 1;
  let sum=0,correction=0;
  for(let n=0;n<solution.q.length;n++) {
    const q=solution.q[n];
    const value=solution.coefficient[n]*Math.cos(q*s-solution.phase[n])*Math.exp(-q*q*solution.fo)-correction;
    const next=sum+value;correction=(next-sum)-value;sum=next;
  }
  return sum; // do not hide nonconvergence by clamping
}
export function solutions(p:Parameters,time:number):AxisSolution[] {
  validate(p);
  if(!Number.isFinite(time)||time<0||time>p.endTime) throw new Error('Zeit außerhalb der Simulationsdauer.');
  const a=p.conductivity/(p.density*p.cp),delta=Math.abs(p.initial-p.ambient);
  return p.size.map((mm,i)=>{
    const d=mm/1000;
    return axisSolution(p.alphas[2*i]*d/p.conductivity,p.alphas[2*i+1]*d/p.conductivity,time===0||delta===0?1:a*time/(d*d),TEMPERATURE_TOLERANCE/(6*Math.max(delta,1)));
  });
}
export function pointTemperature(p:Parameters,time:number,position:number[],sol=solutions(p,time)) {
  if(position.length!==3||position.some((x,i)=>!Number.isFinite(x)||Math.abs(x)>p.size[i]/2+1e-10)) throw new Error('Ort außerhalb des Bauteils.');
  if(time===0||p.initial===p.ambient) return p.initial;
  return p.ambient+(p.initial-p.ambient)*sol.reduce((v,s,i)=>v*factor(s,Math.max(0,Math.min(1,position[i]/p.size[i]+0.5))),1);
}
export function sampleCoordinates(d:number,n:number) {return Array.from({length:n},(_,i)=>-d/2+d*i/(n-1));}
export function computeSlice(p:Parameters,view:View):Slice {
  const [h,v,n]=planeAxes(view.plane),sol=solutions(p,view.time);
  if(!Number.isFinite(view.position)||Math.abs(view.position)>p.size[n]/2+1e-10) throw new Error('Schnittposition außerhalb des Bauteils.');
  const u=sampleCoordinates(p.size[h],p.points[h]),vv=sampleCoordinates(p.size[v],p.points[v]);
  const f=(i:number,x:number)=>view.time===0||p.initial===p.ambient?1:factor(sol[i],Math.max(0,Math.min(1,x/p.size[i]+0.5)));
  const fu=u.map(x=>f(h,x)),fv=vv.map(x=>f(v,x)),fn=f(n,view.position),delta=p.initial-p.ambient;
  const a=p.conductivity/(p.density*p.cp);
  // Exact factors are bounded by 1 via maximum principle. Product error bound
  // follows by expanding products of (1+individual uniform tail errors).
  const errorBound=view.time===0||delta===0?0:Math.abs(delta)*(sol.reduce((acc,s)=>acc*(1+s.tailBound),1)-1);
  const profiles=[h,v].map(i=>{const x=sampleCoordinates(p.size[i],p.points[i]);return {x,temperature:x.map(value=>{const pos=[0,0,0];pos[n]=view.position;pos[i]=value;return pointTemperature(p,view.time,pos,sol);})};});
  return {horizontal:axes[h],vertical:axes[v],normal:axes[n],u,v:vv,temperature:fv.map(y=>fu.map(x=>p.ambient+delta*x*y*fn)),terms:sol.map(s=>view.time===0||delta===0?0:s.q.length),errorBound,converged:errorBound<=TEMPERATURE_TOLERANCE,bi:p.alphas.map((alpha,i)=>alpha*p.size[Math.floor(i/2)]/2000/p.conductivity),fo:p.size.map(d=>a*view.time/(d/2000)**2),center:pointTemperature(p,view.time,[0,0,0],sol),profiles};
}

/** Keep the two in-plane coordinates while the normal coordinate follows the slice. */
export function pointInPlane(p:Parameters,view:View,point:number[]|null):number[]|null {
  if(!point)return null;
  const normal=planeAxes(view.plane)[2],position=[...point];position[normal]=view.position;
  if(position.length!==3||position.some((x,i)=>!Number.isFinite(x)||Math.abs(x)>p.size[i]/2+1e-10)) throw new Error('Ort außerhalb des Bauteils.');
  return position;
}
export function analyzePoint(p:Parameters,view:View,point:number[]) {
  const position=pointInPlane(p,view,point)!,sol=solutions(p,view.time),[h,v]=planeAxes(view.plane);
  return {position,temperature:pointTemperature(p,view.time,position,sol),profiles:[h,v].map(i=>{
    const x=sampleCoordinates(p.size[i],p.points[i]);
    return {x,temperature:x.map(value=>{const pos=[...position];pos[i]=value;return pointTemperature(p,view.time,pos,sol);})};
  })};
}
