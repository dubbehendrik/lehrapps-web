export const defaults = {median:40, spread:1.5, stock:5, flow:0.2, efficiency:80, preferred:45, width:0.65, cyclone:15, sharpness:4, recycle:100, sieve:100, minutes:120, selective:true, recover:true, wallFraction:25, residence:10, maxTurns:40};
export type Parameters = typeof defaults;
export const sum=(a:number[])=>a.reduce((s,v)=>s+v,0);
export function quantile(d:number[],m:number[],q:number){const total=sum(m);if(!total)return NaN;let c=0;for(let i=0;i<m.length;i++){c+=m[i];if(c>=q*total)return d[i];}return d[d.length-1];}
export type Streams=Record<'fresh'|'spray'|'part'|'over'|'direct'|'wallIn'|'wallOut'|'separatorIn'|'recovered'|'cycloneLoss'|'back'|'sieveLoss',number[]>;
export type Frame={time:number;turns:number;mass:number[];wall:number[];streams:Streams;deposited:number;lost:number;added:number;residual:number;median:number;efficiency:number};
/** Continuous stirred tank and first-order wall discharge; explicit positivity-preserving small steps. */
export function simulate(p:Parameters){
 if(Object.values(p).some(v=>typeof v==='number'&&!Number.isFinite(v)) || p.median<1||p.median>500||p.spread<=1.01||p.spread>3||p.stock<=0||p.flow<=0||p.width<=0||p.efficiency<0||p.efficiency>100||p.recycle<0||p.recycle>100||p.cyclone<=0||p.preferred<=0||p.sharpness<=0||p.sieve<=0||p.wallFraction<0||p.wallFraction>100||p.residence<=0||p.maxTurns<=0||p.maxTurns>100||p.residence*p.flow/p.stock>20) throw Error('Werte prüfen: Median 1–500 µm, Breite > 1,01 bis 3, positive Größen, Anteile 0–100 %, maximal 100 Umläufe. Kabinen-Austragszeit höchstens 20 Vorratsumlaufzeiten.');
 const n=120,d=Array.from({length:n},(_,i)=>Math.exp(Math.log(.1)+(i+.5)*Math.log(20000)/n)),edges=Array.from({length:n+1},(_,i)=>Math.exp(Math.log(.1)+i*Math.log(20000)/n));
 const raw=d.map(x=>Math.exp(-.5*(Math.log(x/p.median)/Math.log(p.spread))**2)),fresh=raw.map(v=>v/sum(raw));
 const a=d.map(x=>p.efficiency/100*(p.selective?Math.exp(-.5*(Math.log(x/p.preferred)/p.width)**2):1));
 const z=d.map(x=>p.recover?1/(1+(p.cyclone/x)**p.sharpness):1),s=d.map(x=>(x<=p.sieve?1:0)*p.recycle/100);
 let mass=fresh.map(v=>v*p.stock),wall=d.map(()=>0),deposited=0,lost=0,added=0;
 const rates=():Streams=>{const spray=mass.map(v=>v/p.stock*p.flow),part=spray.map((v,i)=>v*a[i]),over=spray.map((v,i)=>v-part[i]),wallIn=over.map(v=>v*p.wallFraction/100),direct=over.map((v,i)=>v-wallIn[i]),wallOut=wall.map(v=>v/p.residence),separatorIn=direct.map((v,i)=>v+wallOut[i]),recovered=separatorIn.map((v,i)=>v*z[i]),cycloneLoss=separatorIn.map((v,i)=>v-recovered[i]),back=recovered.map((v,i)=>v*s[i]),sieveLoss=recovered.map((v,i)=>v-back[i]);return {fresh:fresh.map(v=>v*(p.flow-sum(back))),spray,part,over,direct,wallIn,wallOut,separatorIn,recovered,cycloneLoss,back,sieveLoss};};
 let steadyTurns:number|null=null,hold=0;const history:Frame[]=[];const turnTime=p.stock/p.flow;const dt=Math.min(turnTime*.01,p.residence*.05);const duration=p.maxTurns*turnTime;
 if(duration/dt>200000)throw Error('Zeitmaßstäbe zu unterschiedlich: Austragszeit erhöhen oder Umlaufgrenze reduzieren.');
 const residual=(r:Streams)=>(sum(r.spray.map((v,i)=>Math.abs(-v+r.back[i]+r.fresh[i])))+sum(r.wallIn.map((v,i)=>Math.abs(v-r.wallOut[i]))))/p.flow;
 const save=(time:number,r:Streams)=>history.push({time,turns:time/turnTime,mass:[...mass],wall:[...wall],streams:r,deposited,lost,added,residual:residual(r),median:quantile(d,mass,.5),efficiency:sum(r.part)/p.flow*100});
 save(0,rates());let nextSave=.05*turnTime;
 for(let t=0;t<duration-1e-9;){const h=Math.min(dt,duration-t),r=rates();if(sum(r.back)>p.flow+1e-10)throw Error('Rückstrom übersteigt Förderstrom; konstante Vorratsregelung ist nicht möglich.');mass=mass.map((v,i)=>v+h*(-r.spray[i]+r.back[i]+r.fresh[i]));wall=wall.map((v,i)=>v+h*(r.wallIn[i]-r.wallOut[i]));deposited+=h*sum(r.part);lost+=h*(sum(r.cycloneLoss)+sum(r.sieveLoss));added+=h*sum(r.fresh);t+=h;const rr=rates();hold=residual(rr)<1e-5?hold+h:0;if(hold>=turnTime){steadyTurns=t/turnTime;save(t,rr);break;}if(t>=nextSave-1e-9||t>=duration-1e-9){save(t,rr);nextSave=t+.05*turnTime;}}
 const last=history[history.length-1];return {d,edges,fresh,history,...last,steadyTurns,balance:p.stock+added-sum(mass)-sum(wall)-deposited-lost};
}
/** Exact stationary class balance: spray_i = freshFeed_i / (1-returnFraction_i). */
export function stationary(p:Parameters){
 // Reuse validation without retaining a transient solution.
 const valid=simulate({...p,wallFraction:0,maxTurns:0.01,residence:p.stock/p.flow});
 const {d,edges,fresh}=valid;
 const a=d.map(x=>p.efficiency/100*(p.selective?Math.exp(-.5*(Math.log(x/p.preferred)/p.width)**2):1));
 const z=d.map(x=>p.recover?1/(1+(p.cyclone/x)**p.sharpness):1),s=d.map(x=>(x<=p.sieve?1:0)*p.recycle/100),ret=d.map((_,i)=>(1-a[i])*z[i]*s[i]);
 if(!Number.isFinite(p.wallFraction)||!Number.isFinite(p.residence)||p.wallFraction<0||p.wallFraction>100||p.residence<=0)throw Error('Kabinenanteil 0–100 %, Austragszeit positiv.');
 const closed=ret.every(v=>v===1);if(!closed&&ret.some((v,i)=>1-v<1e-12&&fresh[i]>1e-15))throw Error('Für diese verlustfreien Größenklassen ist kein eindeutiger stationärer Mischzustand mit Frischpulverzugabe bestimmbar.');
 const weights=fresh.map((v,i)=>closed?v:v/Math.max(1-ret[i],1e-12)),spray=weights.map(v=>p.flow*v/sum(weights));
 const part=spray.map((v,i)=>v*a[i]),over=spray.map((v,i)=>v-part[i]),wallIn=over.map(v=>v*p.wallFraction/100),direct=over.map((v,i)=>v-wallIn[i]),wallOut=[...wallIn],separatorIn=[...over],recovered=over.map((v,i)=>v*z[i]),cycloneLoss=over.map((v,i)=>v-recovered[i]),back=recovered.map((v,i)=>v*s[i]),sieveLoss=recovered.map((v,i)=>v-back[i]);
 const feed=p.flow-sum(back);const streams:Streams={fresh:fresh.map(v=>v*feed),spray,part,over,wallIn,direct,wallOut,separatorIn,recovered,cycloneLoss,back,sieveLoss};
 return {d,edges,fresh,streams,wall:wallIn.map(v=>v*p.residence),mass:spray.map(v=>v/p.flow*p.stock),balance:feed-sum(part)-sum(cycloneLoss)-sum(sieveLoss)};
}

