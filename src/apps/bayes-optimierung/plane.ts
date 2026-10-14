import type {Factor} from './logic';
import {goalOf,intervalProbability,type Target,type Measurement} from './multi';
export const responseColors:[number,string][]=[[0,'#1846a3'],[.25,'#00bbdc'],[.5,'#ffe568'],[.75,'#f58220'],[1,'#c92529']];
export const uncertaintyColors:[number,string][]=[[0,'#f4f7fb'],[.35,'#b7cde6'],[.7,'#547aa7'],[1,'#193e68']];
export function axisLabel(name:string,unit:string){return `${name} [${unit.trim()||'-'}]`}
export function pointInSlice(x:number[],factors:Factor[],slice:number){return factors.length===2||Math.abs(x[2]-slice)<=Math.max(1e-9,(factors[2].max-factors[2].min)*1e-6)}
export function fieldGrid(factors:Factor[],slice:number,models:((x:number[])=>{mean:number;sd:number})[],targets:Target[],selected:number,n=41){
 const a=Array.from({length:n},(_,i)=>factors[0].min+(factors[0].max-factors[0].min)*i/(n-1)),b=Array.from({length:n},(_,i)=>factors[1].min+(factors[1].max-factors[1].min)*i/(n-1));
 const z=b.map(v=>a.map(u=>{const x=factors.length===3?[u,v,slice]:[u,v];const predictions=models.map(m=>m(x)),p=predictions[selected];const probability=targets.reduce((product,t,i)=>goalOf(t)==='range'?product*intervalProbability(predictions[i].mean,Math.sqrt(predictions[i].sd**2+t.noise**2),t.lower!,t.upper!):product,1);return {mean:p.mean,sd:p.sd,probability}}));
 return {a,b,mean:z.map(row=>row.map(p=>p.mean)),sd:z.map(row=>row.map(p=>p.sd)),probability:z.map(row=>row.map(p=>p.probability))};
}
export function pointGroups(rows:Measurement[],factors:Factor[],slice:number){return ['own','system'].flatMap(source=>[false,true].map(projected=>({source,projected,indices:rows.flatMap((r,i)=>r.source.includes('Vorschlag')===(source==='system')&&!pointInSlice(r.x,factors,slice)===projected?[i]:[])}))).filter(g=>g.indices.length)}
