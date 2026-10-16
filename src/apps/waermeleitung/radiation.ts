import {axes,planeAxes,sampleCoordinates,validate,pointInPlane} from './logic';
import type {Parameters,View,Slice} from './types';

export const SIGMA=5.670374419e-8;
/** Positive outward flux. Absolute temperatures occur only in the radiation term. */
export function radiationFlux(temperature:number,ambient:number,emissivity:number) {
  const t=temperature+273.15,u=ambient+273.15;
  return emissivity*SIGMA*(t-u)*(t+u)*(t*t+u*u);
}
export const numericalGrids={coarse:[13,13,7],standard:[21,21,9],fine:[33,33,13]} as const;
type Snapshot={time:number;field:Float64Array;boundaryEnergy:number;steps:number};
export interface NumericalRun {p:Parameters;withRadiation:boolean;grid:number[];snapshots:Snapshot[];initialEnergy:number;maxStep:number}
export interface NumericalOptions {grid?:number[];maxStep?:number;outputs?:number}

function volumeWeights(p:Parameters,n:number[]) {
  const dx=p.size.map((d,i)=>d/1000/(n[i]-1));
  const w=(i:number,j:number)=>dx[i]*(j===0||j===n[i]-1?.5:1);
  return {dx,w};
}
export function fieldEnergy(run:NumericalRun,field:Float64Array) {
  const {grid:n,p}=run,{w}=volumeWeights(p,n);let energy=0;
  for(let z=0;z<n[2];z++)for(let y=0;y<n[1];y++)for(let x=0;x<n[0];x++)
    energy+=field[x+n[0]*(y+n[1]*z)]*w(0,x)*w(1,y)*w(2,z)*p.density*p.cp;
  return energy;
}

/** Node-centred finite volumes, half control volumes on each boundary.
 * Directionally split backward Euler. Each nonlinear line is solved by Newton
 * with a tridiagonal Jacobian (no frozen radiation coefficient). First order in
 * time; conservative per sweep. All three physical directions are resolved.
 */
function advance(run:NumericalRun,start:Snapshot,target:number,maxStep:number):Snapshot {
  const {p,grid:n}=run,{dx,w}=volumeWeights(p,n),rhoCp=p.density*p.cp;
  const field=start.field.slice(),strides=[1,n[0],n[0]*n[1]],a=p.conductivity/rhoCp;
  let time=start.time,steps=start.steps,boundaryEnergy=start.boundaryEnergy;
  const maxT=Math.max(p.initial,p.ambient,run.withRadiation?p.radiation!.ambient:p.ambient)+273.15;
  const rate=n.reduce((sum,_,axis)=>sum+2*(Math.max(p.alphas[2*axis],p.alphas[2*axis+1])+ (run.withRadiation?4*SIGMA*maxT**3*Math.max(p.radiation!.emissivities[2*axis],p.radiation!.emissivities[2*axis+1]):0))/(rhoCp*dx[axis]),0);
  // Limits boundary-cell relaxation in addition to the chosen global timestep.
  const limit=Math.min(maxStep,rate>0?.5/rate:Infinity);
  const lowerBound=Math.min(p.initial,p.ambient,run.withRadiation?p.radiation!.ambient:p.ambient),upperBound=Math.max(p.initial,p.ambient,run.withRadiation?p.radiation!.ambient:p.ambient);
  const started=Date.now();
  while(time<target-1e-12*Math.max(1,target)) {
    if(steps%16===0&&Date.now()-started>20000)throw new Error('Numerische Laufzeitgrenze erreicht. Gröberes Gitter oder weniger extreme Randbedingungen wählen.');
    if(++steps>18000)throw new Error('Numerisches Schrittlimit erreicht. Endzeit oder Wärmeübergang reduzieren bzw. gröberes Rechengitter wählen.');
    const dt=Math.min(limit,target-time);
    for(let axis=0;axis<3;axis++) {
      const count=n[axis],stride=strides[axis],other=[0,1,2].filter(i=>i!==axis);
      const old=new Float64Array(count),t=new Float64Array(count),lo=new Float64Array(count),di=new Float64Array(count),up=new Float64Array(count),rhs=new Float64Array(count);
      const diffusion=dt*a/(dx[axis]*dx[axis]);
      for(let b=0;b<n[other[1]];b++)for(let c=0;c<n[other[0]];c++) {
        const base=b*strides[other[1]]+c*strides[other[0]];
        for(let j=0;j<count;j++)old[j]=t[j]=field[base+j*stride];
        let converged=false;
        for(let iteration=0;iteration<30;iteration++) {
          for(let j=0;j<count;j++) {
            const left=j>0?diffusion*(j===count-1?2:1):0,right=j<count-1?diffusion*(j===0?2:1):0;
            let residual=t[j]-old[j]+left*(t[j]-t[Math.max(0,j-1)])+right*(t[j]-t[Math.min(count-1,j+1)]);
            lo[j]=-left;up[j]=-right;di[j]=1+left+right;
            if(j===0||j===count-1) {
              const face=2*axis+(j===0?0:1),eps=run.withRadiation?p.radiation!.emissivities[face]:0,env=p.radiation?.ambient??p.ambient;
              const scale=2*dt/(rhoCp*dx[axis]);
              residual+=scale*(p.alphas[face]*(t[j]-p.ambient)+radiationFlux(t[j],env,eps));
              di[j]+=scale*(p.alphas[face]+4*eps*SIGMA*(t[j]+273.15)**3);
            }
            rhs[j]=-residual;
          }
          for(let j=1;j<count;j++){const m=lo[j]/di[j-1];di[j]-=m*up[j-1];rhs[j]-=m*rhs[j-1];}
          rhs[count-1]/=di[count-1];for(let j=count-2;j>=0;j--)rhs[j]=(rhs[j]-up[j]*rhs[j+1])/di[j];
          let change=0;for(let j=0;j<count;j++){t[j]+=rhs[j];change=Math.max(change,Math.abs(rhs[j]));}
          if(change<1e-8){converged=true;break;}
        }
        if(!converged)throw new Error('Nichtlinearer Strahlungssolver konvergiert nicht. Eingaben oder Gitterauflösung ändern.');
        const area=w(other[0],c)*w(other[1],b);
        for(const j of [0,count-1]) {
          const face=2*axis+(j===0?0:1),eps=run.withRadiation?p.radiation!.emissivities[face]:0;
          boundaryEnergy+=dt*area*(p.alphas[face]*(t[j]-p.ambient)+radiationFlux(t[j],p.radiation?.ambient??p.ambient,eps));
        }
        for(let j=0;j<count;j++) {
          if(!Number.isFinite(t[j])||t[j]<lowerBound-1e-5||t[j]>upperBound+1e-5)throw new Error('Numerische Temperatur außerhalb der physikalischen Grenzen.');
          field[base+j*stride]=t[j];
        }
      }
    }
    time+=dt;
  }
  return {time:target,field,boundaryEnergy,steps};
}

export function simulateNumerical(p:Parameters,withRadiation:boolean,options:NumericalOptions={}):NumericalRun {
  validate(p);if(withRadiation&&!p.radiation)throw new Error('Strahlungsparameter fehlen.');
  const grid=[...(options.grid??numericalGrids[p.radiation?.resolution??'standard'])];
  if(grid.length!==3||grid.some(n=>!Number.isInteger(n)||n<3||n>65)||grid.reduce((a,b)=>a*b,1)>150000)throw new Error('Ungültiges numerisches Gitter.');
  const outputs=options.outputs??120,maxStep=options.maxStep??p.endTime/(p.radiation?.refinedTime?1200:600);
  if(!(maxStep>0)||!Number.isFinite(maxStep)||!Number.isInteger(outputs)||outputs<1||outputs>240)throw new Error('Ungültige numerische Zeitschritte.');
  const first:Snapshot={time:0,field:new Float64Array(grid.reduce((a,b)=>a*b,1)).fill(p.initial),boundaryEnergy:0,steps:0};
  const run:NumericalRun={p,withRadiation,grid,snapshots:[first],initialEnergy:0,maxStep};run.initialEnergy=fieldEnergy(run,first.field);
  const started=Date.now();
  for(let i=1;i<=outputs;i++) {
    if(Date.now()-started>20000)throw new Error('Numerische Laufzeitgrenze erreicht. Gröberes Gitter oder weniger extreme Randbedingungen wählen.');
    run.snapshots.push(advance(run,run.snapshots.at(-1)!,p.endTime*i/outputs,maxStep));
  }
  return run;
}
export function numericalSnapshot(run:NumericalRun,time:number):Snapshot {
  if(!Number.isFinite(time)||time<0||time>run.p.endTime)throw new Error('Zeit außerhalb der Simulationsdauer.');
  const index=Math.min(run.snapshots.length-1,Math.floor(time/run.p.endTime*(run.snapshots.length-1)+1e-10)),start=run.snapshots[index];
  return Math.abs(start.time-time)<1e-10?start:advance(run,start,time,run.maxStep);
}
export function numericalTemperature(run:NumericalRun,snapshot:Snapshot,position:number[]) {
  if(position.length!==3||position.some((v,i)=>!Number.isFinite(v)||Math.abs(v)>run.p.size[i]/2+1e-10))throw new Error('Ort außerhalb des Bauteils.');
  const q=position.map((v,i)=>Math.max(0,Math.min(run.grid[i]-1,(v/run.p.size[i]+.5)*(run.grid[i]-1))));
  const low=q.map((v,i)=>Math.min(run.grid[i]-2,Math.floor(v))),f=q.map((v,i)=>v-low[i]);let value=0;
  for(let k=0;k<8;k++){const b=[k&1,(k>>1)&1,(k>>2)&1],idx=low.map((v,i)=>v+b[i]);value+=snapshot.field[idx[0]+run.grid[0]*(idx[1]+run.grid[1]*idx[2])]*b.reduce((w,v,i)=>w*(v?f[i]:1-f[i]),1);}
  return value;
}
export function numericalAnalysis(run:NumericalRun,view:View,point:number[]) {
  const position=pointInPlane(run.p,view,point)!,snapshot=numericalSnapshot(run,view.time),[h,v]=planeAxes(view.plane);
  return {position,temperature:numericalTemperature(run,snapshot,position),profiles:[h,v].map(i=>{
    const x=sampleCoordinates(run.p.size[i],run.p.points[i]);return {x,temperature:x.map(value=>{const pos=[...position];pos[i]=value;return numericalTemperature(run,snapshot,pos);})};
  })};
}
export function numericalSlice(run:NumericalRun,view:View):Slice {
  const p=run.p,[h,v,n]=planeAxes(view.plane),snapshot=numericalSnapshot(run,view.time);
  if(!Number.isFinite(view.position)||Math.abs(view.position)>p.size[n]/2+1e-10)throw new Error('Schnittposition außerhalb des Bauteils.');
  const u=sampleCoordinates(p.size[h],p.points[h]),vv=sampleCoordinates(p.size[v],p.points[v]);
  const at=(x:number,y:number)=>{const pos=[0,0,0];pos[h]=x;pos[v]=y;pos[n]=view.position;return numericalTemperature(run,snapshot,pos);};
  return {horizontal:axes[h],vertical:axes[v],normal:axes[n],u,v:vv,temperature:vv.map(y=>u.map(x=>at(x,y))),terms:[0,0,0],errorBound:NaN,converged:true,
    bi:p.alphas.map((alpha,i)=>alpha*p.size[Math.floor(i/2)]/2000/p.conductivity),fo:p.size.map(d=>p.conductivity/(p.density*p.cp)*view.time/(d/2000)**2),
    center:numericalTemperature(run,snapshot,[0,0,0]),profiles:numericalAnalysis(run,view,[0,0,view.position].map((_,i)=>i===n?view.position:0)).profiles,
    numerical:{grid:run.grid,steps:snapshot.steps,radiation:run.withRadiation,energyChange:fieldEnergy(run,snapshot.field)-run.initialEnergy,boundaryEnergy:snapshot.boundaryEnergy}};
}
