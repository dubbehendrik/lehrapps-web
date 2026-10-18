import type {Parameters,Vec,Frame,Grid,Result,Request,EndReason} from './types';
import {bellPolygon,electrodes,domain,polygonHit,roundedPolygon,validatePolygon} from './geometry';
import {buildFields,sample} from './fields';
export const magnitude=(v:Vec)=>Math.hypot(v.x,v.y,v.z);
export const rayleighCharge=(diameter:number,surfaceTension:number)=>8*Math.PI*Math.sqrt(8.8541878128e-12*surfaceTension*(diameter/2)**3);
export const dropMass=(diameter:number,density:number)=>density*Math.PI*diameter**3/6;
export function dropCharge(p:Parameters){return p.chargeMode==='manual'?p.chargePc*1e-12:Math.sign(p.voltage)*p.chargePercent/100*rayleighCharge(p.diameter*1e-6,p.surfaceTension/1000);}
/** Schiller–Naumann, rigid spherical droplet; high-Re continuation cD=0.44. */
export function dragForce(relative:Vec,diameter:number):Vec{
 const speed=magnitude(relative),re=1.204*speed*diameter/1.81e-5;
 // Analytically finite Stokes limit, no division by zero at zero slip.
 const factor=re<1000?3*Math.PI*1.81e-5*diameter*(1+.15*re**.687):.5*1.204*.44*Math.PI*diameter**2/4*speed;
 return {x:factor*relative.x,y:factor*relative.y,z:factor*relative.z};
}
export function initialState(p:Parameters):number[]{const r=p.bellDiameter/2000,a=p.azimuth*Math.PI/180,u=2*Math.PI*p.rpm/60*r*p.speedFactor/100;
 // Meridional direction is a declared 45 degree direction at the rim, not a film-flow calculation.
 return [.003,r*Math.cos(a),r*Math.sin(a),p.meridionalSpeed/Math.sqrt(2),p.meridionalSpeed*Math.cos(a)/Math.sqrt(2)-u*Math.sin(a),p.meridionalSpeed*Math.sin(a)/Math.sqrt(2)+u*Math.cos(a)];
}
export function forces(p:Parameters,g:Grid,state:number[],charge=dropCharge(p)):Omit<Frame,'t'>{
 const position={x:state[0],y:state[1],z:state[2]},velocity={x:state[3],y:state[4],z:state[5]};
 const field={x:sample(g,g.ex,position),y:sample(g,g.ey,position),z:0},air={x:sample(g,g.ux,position),y:sample(g,g.uy,position),z:0};
 const electric={x:charge*field.x,y:charge*field.y,z:0},drag=dragForce({x:air.x-velocity.x,y:air.y-velocity.y,z:-velocity.z},p.diameter*1e-6);
 const mg=p.gravity?dropMass(p.diameter*1e-6,p.density)*9.81:0,a=p.gravityAngle*Math.PI/180,gravity={x:mg*Math.cos(a),y:mg*Math.sin(a),z:0};
 return {position,velocity,field,air,electric,drag,gravity,total:{x:electric.x+drag.x+gravity.x,y:electric.y+drag.y+gravity.y,z:drag.z}};
}
export function rk4(state:number[],dt:number,derivative:(s:number[])=>number[]):number[]{const a=derivative(state),b=derivative(state.map((v,i)=>v+dt*a[i]/2)),c=derivative(state.map((v,i)=>v+dt*b[i]/2)),d=derivative(state.map((v,i)=>v+dt*c[i]));return state.map((v,i)=>v+dt*(a[i]+2*b[i]+2*c[i]+d[i])/6);}
const bounds:Partial<Record<keyof Parameters,[number,number]>>={voltage:[-100,0],diameter:[5,150],density:[500,2500],surfaceTension:[10,80],chargePercent:[0,100],chargePc:[-10,0],bellDiameter:[40,80],rpm:[0,70000],speedFactor:[0,100],meridionalSpeed:[0,10],azimuth:[-180,180],airSpeed:[0,30],gravityAngle:[-180,180],maxTime:[.01,.5],electrodeX:[-40,40],electrodeY:[60,130],electrodeRadius:[6,15],cornerRadius:[0,15]};
export function validateParameters(p:Parameters):string|null{
 for(const [key,range] of Object.entries(bounds)){const v=p[key as keyof Parameters];if(typeof v!=='number'||!Number.isFinite(v)||v<range![0]||v>range![1])return `Ungültiger Parameter: ${key}. Zulässig: ${range![0]} bis ${range![1]}.`;}
 if(!['contact','external','off'].includes(p.charging)||!['fraction','manual'].includes(p.chargeMode))return 'Ungültiger Aufladungsmodus.';return null;
}
export function simulate(request:Request):Result{
 const {parameters:p,polygon}=request,error=validateParameters(p)||validatePolygon(polygon);if(error)throw Error(error);
 const geometry=roundedPolygon(polygon,p.cornerRadius/1000),grid=buildFields(p,geometry,request.resolution??1);
 if(grid.electricResidual>1e-6||grid.airResidual>1e-6)throw Error('Feldlöser nicht ausreichend konvergiert. Kontur vereinfachen oder breitere Spalte zeichnen.');
 const mass=dropMass(p.diameter*1e-6,p.density),charge=dropCharge(p),rayleigh=rayleighCharge(p.diameter*1e-6,p.surfaceTension/1000);
 let state=initialState(p),t=0,reason:EndReason='timeout';const frames:Frame[]=[{t,...forces(p,grid,state,charge)}];
 const obstacles:[EndReason,typeof geometry][]=[['workpiece',geometry],['atomizer',bellPolygon(p)],...electrodes(p).map(e=>['electrode',e] as [EndReason,typeof geometry])];
 const derivative=(s:number[])=>{const f=forces(p,grid,s,charge).total;return [s[3],s[4],s[5],f.x/mass,f.y/mass,f.z/mass];};
 let steps=0;
 while(t<p.maxTime&&steps++<100000){const f=forces(p,grid,state,charge),speed=magnitude(f.velocity),slip=magnitude({x:f.air.x-state[3],y:f.air.y-state[4],z:-state[5]});
 const relaxation=slip>1e-12?mass*slip/Math.max(magnitude(f.drag),1e-30):mass/(3*Math.PI*1.81e-5*p.diameter*1e-6);
 const dt=Math.min(.00015,.15*relaxation,grid.h*.15/Math.max(speed,1),p.maxTime-t);
 const next=rk4(state,dt,derivative);if(!next.every(Number.isFinite))throw Error('Numerische Integration fehlgeschlagen.');
 let fraction=1,hit:EndReason|null=null;
 for(const [why,poly] of obstacles){const s=polygonHit({x:state[0],y:state[1]},{x:next[0],y:next[1]},poly);if(s!==null&&s<=fraction){fraction=s;hit=why;}}
 const limits=[[domain.x0,domain.x1],[domain.y0,domain.y1],[-.25,.25]];
 for(let k=0;k<3;k++){const [lo,hi]=limits[k];if(next[k]<lo||next[k]>hi){const s=((next[k]<lo?lo:hi)-state[k])/(next[k]-state[k]);if(s<fraction){fraction=s;hit='escaped';}}}
 state=state.map((v,i)=>v+fraction*(next[i]-v));t+=dt*fraction;
 if(t-frames[frames.length-1].t>=.0002||hit||t>=p.maxTime)frames.push({t,...forces(p,grid,state,charge)});
 if(hit){reason=hit;break;}
 }
 if(steps>=100000)throw Error('Maximale Schrittzahl erreicht.');
 return {grid,geometry,frames,reason,charge,mass,rayleigh};
}
