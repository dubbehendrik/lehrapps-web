import {type Factor,candidates,example} from './logic';
import {buildModels,evaluateCandidate,feasible,score,type Target,type Measurement} from './multi';
export function policyKey(factors:Factor[],targets:Target[],length:number,strategy:string,beta:number){return JSON.stringify({factors,targets,length,strategy,beta})}
export function simulationValue(x:number[],factors:Factor[],i:number){return i===0?example(x,factors):i===1?example(x.map((v,j)=>factors[j].min+factors[j].max-v),factors):x.reduce((s,v,j)=>s+((v-factors[j].min)/(factors[j].max-factors[j].min))**2,0)}
export async function generateSimulation(initial:Measurement[],factors:Factor[],targets:Target[],length:number,strategy:string,beta:number,total:number,onProgress:(n:number)=>void){
 if(!Number.isInteger(total)||total<1||total>150||total<initial.length)throw Error('Versuchszahl muss ganzzahlig zwischen aktuellem Stand und 150 liegen.');
 const rows=[...initial],grid=candidates(factors),key=policyKey(factors,targets,length,strategy,beta);
 while(rows.length<total){const n=rows.length,bundle=buildModels(rows,factors,targets,length),eligible=rows.filter(r=>feasible(r.values,targets)),best=eligible.length?Math.max(...eligible.map(r=>score(r.values,targets))):null;
 // Start with distributed seed settings, then adaptive full-grid acquisition.
 const start=n<4?factors.map((f,j)=>f.min+(f.max-f.min)*((n*0.61803398875+j*0.38196601125+0.1)%1)):null;
 const evaluated=start?[]:grid.map(x=>evaluateCandidate(x,bundle,targets,best,strategy,beta));const next=start??evaluated.reduce((a,b)=>b.score>a.score?b:a,evaluated[0]).x;
 const predictions=n?bundle.models.map((m,i)=>{const p=m(next);return {mean:p.mean,sd:Math.sqrt(p.sd**2+targets[i].noise**2)}}):undefined;
 const values=targets.map((t,i)=>simulationValue(next,factors,i)+t.noise*Math.sqrt(-2*Math.log(Math.max(Math.random(),1e-12)))*Math.cos(2*Math.PI*Math.random()));
 rows.push({x:next,values,source:n<4?'Simulierter Startpunkt':'Simulierter Vorschlag',predictions,priorEi:best===null||!evaluated.length?undefined:Math.max(...evaluated.map(p=>p.ei)),policy:key});if(rows.length%5===0||rows.length===total)onProgress(rows.length);await new Promise<void>(r=>setTimeout(r,0));
 }return rows;
}
