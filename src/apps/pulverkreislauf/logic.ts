export const defaults = {median:40, spread:1.5, stock:5, flow:0.2, efficiency:80, preferred:45, width:0.65, cyclone:15, sharpness:4, recycle:100, sieve:100, minutes:120, selective:true, recover:true};
export type Parameters = typeof defaults;
export const sum=(a:number[])=>a.reduce((s,v)=>s+v,0);
export function simulate(p:Parameters){
 if(Object.values(p).some(v=>typeof v==='number'&&!Number.isFinite(v)) || p.median<=0||p.spread<=1||p.stock<=0||p.flow<=0||p.width<=0||p.minutes<=0||p.minutes>600||p.efficiency<0||p.efficiency>100||p.recycle<0||p.recycle>100||p.cyclone<=0||p.preferred<=0||p.sharpness<=0||p.sieve<=0) throw Error('Bitte positive Werte, Verteilungsbreite > 1 und Prozentwerte zwischen 0 und 100 eingeben.');
 const d=Array.from({length:240},(_,i)=>Math.exp(Math.log(0.1)+(i+0.5)*Math.log(20000)/240));
 const edges=Array.from({length:241},(_,i)=>Math.exp(Math.log(0.1)+i*Math.log(20000)/240));
 const raw=d.map(x=>Math.exp(-0.5*(Math.log(x/p.median)/Math.log(p.spread))**2)); const fresh=raw.map(v=>v/sum(raw));
 let mass=fresh.map(v=>v*p.stock), deposited=0,lost=0,added=0;
 const history=[];
 const dt=Math.min(0.2,p.stock/p.flow*0.02); let streams={spray:fresh.map(()=>0),part:fresh.map(()=>0),over:fresh.map(()=>0),back:fresh.map(()=>0),loss:fresh.map(()=>0)};
 for(let t=0;t<p.minutes-1e-10;){const step=Math.min(dt,p.minutes-t); const spray=mass.map(v=>v/p.stock*p.flow*step); const part=spray.map((v,i)=>v*p.efficiency/100*(p.selective?Math.exp(-0.5*(Math.log(d[i]/p.preferred)/p.width)**2):1)); const over=spray.map((v,i)=>v-part[i]);const back=over.map((v,i)=>v*(p.recover?1/(1+(p.cyclone/d[i])**p.sharpness):1)*(d[i]<=p.sieve?1:0)*p.recycle/100);const loss=over.map((v,i)=>v-back[i]);const feed=sum(part)+sum(loss);mass=mass.map((v,i)=>v-spray[i]+back[i]+feed*fresh[i]); deposited+=sum(part);lost+=sum(loss);added+=feed;t+=step; streams={spray: spray.map(v=>v/step),part:part.map(v=>v/step),over:over.map(v=>v/step),back:back.map(v=>v/step),loss:loss.map(v=>v/step)}; history.push({time:t,median:quantile(d,mass,.5),efficiency:sum(part)/sum(spray)*100});}
 return {d,edges,fresh,mass,streams,history,deposited,lost,added,balance:p.stock+added-sum(mass)-deposited-lost};
}
export function quantile(d:number[],m:number[],q:number){const total=sum(m);if(!total)return NaN;let c=0;for(let i=0;i<m.length;i++){c+=m[i];if(c>=q*total)return d[i];}return d[d.length-1];}
