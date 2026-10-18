import {electricAt} from './electrostatics';
import type {Parameters,Vec,Frame,Grid,Result,Request,EndReason} from './types';
import {bellPolygon,electrodes,domain,polygonHit,roundedPolygon,validatePolygon} from './geometry';
import {buildFields,sample} from './fields';
export const magnitude=(v:Vec)=>Math.hypot(v.x,v.y);
export const rayleighCharge=(diameter:number,surfaceTension:number)=>8*Math.PI*Math.sqrt(8.8541878128e-12*surfaceTension*(diameter/2)**3);
export const dropMass=(diameter:number,density:number)=>density*Math.PI*diameter**3/6;
/** Target charge. External charging reaches it only after sufficient travel in the effective zone. */
export function dropCharge(p:Parameters){return p.chargeMode==='manual'?p.chargePc*1e-12:Math.sign(p.voltage)*p.chargePercent/100*rayleighCharge(p.diameter*1e-6,p.surfaceTension/1000);}
export function chargingZone(p:Parameters){return {x0:p.electrodeX/1000-.02,x1:p.electrodeX/1000+.15,y0:-p.electrodeY/1000-.03,y1:p.electrodeY/1000+.03};}
export function insideChargingZone(p:Parameters,position:Vec){const b=chargingZone(p);return position.x>=b.x0&&position.x<=b.x1&&position.y>=b.y0&&position.y<=b.y1;}
/** Empirical monotone path-based charge ramp, no ion/corona calculation. */
export function chargeAtPath(p:Parameters,path:number,target=dropCharge(p)){
 if(p.charging==='off')return 0;
 if(p.charging==='contact')return target;
 const start=p.initialChargePercent/100,progress=Math.min(1,Math.max(0,path)/(p.chargeLength/1000));
 const fraction=start+(1-start)*progress;return fraction===0?0:target*fraction;
}
/** Schiller–Naumann, rigid sphere, continued by cD=0.44 for Re>=1000. */
export function dragForce(relative:Vec,diameter:number):Vec{
 const speed=magnitude(relative),re=1.204*speed*diameter/1.81e-5;
 const factor=re<1000?3*Math.PI*1.81e-5*diameter*(1+.15*re**.687):.5*1.204*.44*Math.PI*diameter**2/4*speed;
 return {x:factor*relative.x,y:factor*relative.y};
}
/** Planar teaching idealization: full inherited rim speed points outward in y.
 * State = x, y, vx, vy, accumulated distance within the effective charging zone. */
export function initialState(p:Parameters):number[]{
 const side=p.releaseSide==='top'?1:-1,r=p.bellDiameter/2000,u=2*Math.PI*p.rpm/60*r*p.speedFactor/100;
 return [.003,side*r,p.axialSpeed,side*u,0];
}
export function forces(p:Parameters,g:Grid,state:number[],target=dropCharge(p)):Omit<Frame,'t'>{
 const position={x:state[0],y:state[1]},velocity={x:state[2],y:state[3]};
 const exact=g.electric?electricAt(g.electric,position):{x:0,y:0},field={x:exact.x,y:exact.y},air={x:sample(g,g.ux,position),y:sample(g,g.uy,position)};
 const chargePath=Math.max(0,state[4]??0),charge=chargeAtPath(p,chargePath,target),electric=charge===0?{x:0,y:0}:{x:charge*field.x,y:charge*field.y};
 const drag=dragForce({x:air.x-velocity.x,y:air.y-velocity.y},p.diameter*1e-6);
 const mg=p.gravity?dropMass(p.diameter*1e-6,p.density)*9.81:0,a=p.gravityAngle*Math.PI/180,gravity={x:mg*Math.cos(a),y:mg*Math.sin(a)};
 return {position,velocity,field,air,charge,chargePath,electric,drag,gravity,total:{x:electric.x+drag.x+gravity.x,y:electric.y+drag.y+gravity.y}};
}
export function rk4(state:number[],dt:number,derivative:(s:number[])=>number[]):number[]{const a=derivative(state),b=derivative(state.map((v,i)=>v+dt*a[i]/2)),c=derivative(state.map((v,i)=>v+dt*b[i]/2)),d=derivative(state.map((v,i)=>v+dt*c[i]));return state.map((v,i)=>v+dt*(a[i]+2*b[i]+2*c[i]+d[i])/6);}
const bounds:Partial<Record<keyof Parameters,[number,number]>>={voltage:[-100,0],diameter:[5,150],density:[500,2500],surfaceTension:[10,80],chargePercent:[0,100],chargePc:[-10,0],bellDiameter:[40,80],rpm:[0,70000],speedFactor:[0,100],axialSpeed:[0,10],airSpeed:[0,30],gravityAngle:[-180,180],maxTime:[.01,.5],electrodeX:[-40,40],electrodeY:[60,130],tipRadius:[.1,.3],cornerRadius:[0,15],chargeLength:[1,300],initialChargePercent:[0,100]};
export function validateParameters(p:Parameters):string|null{
 for(const [key,range] of Object.entries(bounds)){const v=p[key as keyof Parameters];if(typeof v!=='number'||!Number.isFinite(v)||v<range![0]||v>range![1])return `Ungültiger Parameter: ${key}. Zulässig: ${range![0]} bis ${range![1]}.`;}
 if(!['contact','external','off'].includes(p.charging)||!['fraction','manual'].includes(p.chargeMode)||!['top','bottom'].includes(p.releaseSide))return 'Ungültiger Modus.';return null;
}
/** Pure flight integrator, separable from field generation for reference and convergence tests. */
export function integrateFlight(p:Parameters,grid:Grid,geometry:Result['geometry'],start=initialState(p)){
 const mass=dropMass(p.diameter*1e-6,p.density),charge=dropCharge(p);
 let state=[...start],t=0,reason:EndReason='timeout',exitBoundary:Result['exitBoundary'];
 const frames:Frame[]=[{t,...forces(p,grid,state,charge)}];
 const obstacles:[EndReason,typeof geometry][]=[['workpiece',geometry],['atomizer',bellPolygon(p)],...electrodes(p).map(e=>['electrode',e] as [EndReason,typeof geometry])];
 const derivative=(s:number[])=>{const f=forces(p,grid,s,charge),speed=magnitude(f.velocity);return [s[2],s[3],f.total.x/mass,f.total.y/mass,p.charging==='external'&&insideChargingZone(p,f.position)?speed:0];};
 let steps=0;
 while(t<p.maxTime&&steps++<100000){
  const f=forces(p,grid,state,charge),speed=magnitude(f.velocity),slip=magnitude({x:f.air.x-state[2],y:f.air.y-state[3]});
  const relaxation=slip>1e-12?mass*slip/Math.max(magnitude(f.drag),1e-30):mass/(3*Math.PI*1.81e-5*p.diameter*1e-6);
  const chargingStep=p.charging==='external'&&state[4]<p.chargeLength/1000&&insideChargingZone(p,f.position)?p.chargeLength/1000*.1/Math.max(speed,1):Infinity;
  const dt=Math.min(.00015,.15*relaxation,grid.h*.15/Math.max(speed,1),chargingStep,p.maxTime-t);
  const next=rk4(state,dt,derivative);if(!next.every(Number.isFinite))throw Error('Numerische Integration fehlgeschlagen.');
  let fraction=1,hit:EndReason|null=null;
  for(const [why,poly] of obstacles){const s=polygonHit({x:state[0],y:state[1]},{x:next[0],y:next[1]},poly);if(s!==null&&s<=fraction){fraction=s;hit=why;}}
  const limits=[[domain.x0,domain.x1],[domain.y0,domain.y1]];
  for(let k=0;k<2;k++){const [lo,hi]=limits[k];if(next[k]<lo||next[k]>hi){const s=((next[k]<lo?lo:hi)-state[k])/(next[k]-state[k]);if(s<=fraction){fraction=s;hit='escaped';exitBoundary=(k===0?(next[k]<lo?'xMin':'xMax'):(next[k]<lo?'yMin':'yMax'));}}}
  state=state.map((v,i)=>v+fraction*(next[i]-v));t+=dt*fraction;
  if(t-frames[frames.length-1].t>=.0002||hit||t>=p.maxTime)frames.push({t,...forces(p,grid,state,charge)});
  if(hit){reason=hit;break;}
 }
 if(steps>=100000)throw Error('Maximale Schrittzahl erreicht.');
 return {frames,reason,exitBoundary};
}
export function simulate(request:Request):Result{
 const {parameters:p,polygon}=request,error=validateParameters(p)||validatePolygon(polygon);if(error)throw Error(error);
 const geometry=roundedPolygon(polygon,p.cornerRadius/1000),grid=buildFields(p,geometry,request.resolution??1);
 if(grid.electricResidual>1e-6||grid.airResidual>1e-6)throw Error('Feldlöser nicht ausreichend konvergiert. Kontur vereinfachen oder breitere Spalte zeichnen.');
 return {...integrateFlight(p,grid,geometry),grid,geometry,charge:dropCharge(p),mass:dropMass(p.diameter*1e-6,p.density),rayleigh:rayleighCharge(p.diameter*1e-6,p.surfaceTension/1000),parameters:{...p},polygon:polygon.map(v=>({...v})),resolution:request.resolution??1};
}
