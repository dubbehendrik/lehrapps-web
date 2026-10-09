import {computeSlice,pointTemperature,solutions,TEMPERATURE_TOLERANCE} from './logic';
import type {Parameters,View} from './types';
self.onmessage=(event:MessageEvent<{id:number;p:Parameters;view:View;curve:boolean}>)=>{
  const {id,p,view,curve}=event.data;
  try {
    const slice=computeSlice(p,view);
    const history=curve?Array.from({length:121},(_,i)=>{const time=p.endTime*i/120,sol=solutions(p,time);const bound=time===0?0:Math.abs(p.initial-p.ambient)*(sol.reduce((acc,s)=>acc*(1+s.tailBound),1)-1);return {time,temperature:bound<=TEMPERATURE_TOLERANCE?pointTemperature(p,time,[0,0,0],sol):null};}):undefined;
    self.postMessage({id,slice,history});
  } catch(error) {self.postMessage({id,error:error instanceof Error?error.message:'Berechnung fehlgeschlagen.'});}
};
