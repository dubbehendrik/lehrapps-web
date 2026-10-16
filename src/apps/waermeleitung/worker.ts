import {computeSlice,pointTemperature,solutions,analyzePoint,TEMPERATURE_TOLERANCE} from './logic';
import type {Parameters,View} from './types';
import {simulateNumerical,numericalSlice,numericalAnalysis,numericalTemperature,type NumericalRun} from './radiation';
const runs=new Map<string,NumericalRun>();
self.onmessage=(event:MessageEvent<{id:number;p:Parameters;view:View;curve:boolean;point:number[]|null;compare?:boolean}>)=>{
  const {id,p,view,curve,point,compare}=event.data;
  try {
    if(p.radiation?.enabled||compare) {
      const evaluate=(radiation:boolean)=>{
        const key=JSON.stringify([p.size,p.alphas,p.conductivity,p.density,p.cp,p.initial,p.ambient,p.endTime,p.radiation?.emissivities,p.radiation?.ambient,p.radiation?.resolution,p.radiation?.refinedTime,radiation]);
        let run=runs.get(key);
        if(!run){if(runs.size>=2)runs.delete(runs.keys().next().value!);run=simulateNumerical(p,radiation);runs.set(key,run);}
        // Sampling resolution and point selection do not require re-integration.
        run.p=p;
        return {slice:numericalSlice(run,view),analysis:point?numericalAnalysis(run,view,point):null,history:point?run.snapshots.map(s=>({time:s.time,temperature:numericalTemperature(run!,s,point)})):[]};
      };
      const primary=evaluate(!!p.radiation?.enabled),comparison=compare?evaluate(!p.radiation?.enabled):null;
      self.postMessage({id,...primary,comparison});return;
    }
    const slice=computeSlice(p,view),analysis=point?analyzePoint(p,view,point):null;
    const history=curve&&analysis?Array.from({length:121},(_,i)=>{
      const time=p.endTime*i/120,sol=solutions(p,time);
      const bound=time===0?0:Math.abs(p.initial-p.ambient)*(sol.reduce((acc,s)=>acc*(1+s.tailBound),1)-1);
      return {time,temperature:bound<=TEMPERATURE_TOLERANCE?pointTemperature(p,time,analysis.position,sol):null};
    }):undefined;
    self.postMessage({id,slice,analysis,history,comparison:null});
  } catch(error) {self.postMessage({id,error:error instanceof Error?error.message:'Berechnung fehlgeschlagen.'});}
};
