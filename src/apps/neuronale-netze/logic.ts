export type Row = { x: number[]; y: number };
export type Options = { layers: number[]; epochs: number; rate: number; seed: number; early: boolean; activation: 'tanh' | 'relu' };
export function random(seed: number) { let s=seed>>>0; return ()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;}; }
export function splitRows(rows: Row[], testPercent=20, validationPercent=20, seed=42) {
  if(!Number.isFinite(testPercent)||testPercent<10||testPercent>40||!Number.isFinite(validationPercent)||validationPercent<10||validationPercent>40) throw Error('Test- und Validierungsanteil müssen zwischen 10 und 40 % liegen.');
  if(rows.length<10) throw Error('Mindestens 10 vollständige Messpunkte erforderlich.');
  if(!rows.every(r=>r.x.length===rows[0].x.length && [...r.x,r.y].every(Number.isFinite))) throw Error('Ungültige Messwerte.');
  const a=rows.map((_,i)=>i), rng=random(seed); for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  const nt=Math.max(2,Math.round(a.length*testPercent/100)), nv=Math.max(2,Math.round((a.length-nt)*validationPercent/100));
  if(a.length-nt-nv<3) throw Error('Zu wenige Trainingspunkte für diese Aufteilung.');
  return {train:a.slice(nt+nv),validation:a.slice(nt,nt+nv),test:a.slice(0,nt)};
}
export function metrics(actual:number[], predicted:number[]) {const mean=actual.reduce((a,b)=>a+b,0)/actual.length;const ss=actual.reduce((a,b)=>a+(b-mean)**2,0);const mse=actual.reduce((a,b,i)=>a+(b-predicted[i])**2,0)/actual.length;return {mae:actual.reduce((a,b,i)=>a+Math.abs(b-predicted[i]),0)/actual.length,rmse:Math.sqrt(mse),r2:ss>1e-20?1-mse*actual.length/ss:null};}
export function truth(x:number[], kind:string) {return kind==='linear'?1+2*x[0]+(x[1]??0):kind==='saturation'?3*(1-Math.exp(-2*(x[0]+1))):Math.sin(3*x[0])+0.4*x[0]+(x.length===2?Math.cos(3*x[1])+x[0]*x[1]:0);}
export function simulate(n:number,dim:number,noise:number,kind:string,seed=12):Row[]{const rng=random(seed);return Array.from({length:n},()=>{const x=Array.from({length:dim},()=>2*rng()-1);const z=Math.sqrt(-2*Math.log(Math.max(rng(),1e-12)))*Math.cos(2*Math.PI*rng());return {x,y:truth(x,kind)+noise*z};});}
export function parseCsv(text:string) {
 const first=text.replace(/^\uFEFF/,'').split(/\r?\n/)[0];const delimiter=first.includes(';')?';':first.includes('\t')?'\t':',';
 const records:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===delimiter||c==='\n')){row.push(cell.trim());cell='';if(c==='\n'){if(row.some(Boolean))records.push(row);row=[];}}else if(c!=='\r')cell+=c;}
 if(quoted)throw Error('Nicht geschlossene Anführungszeichen im CSV.');row.push(cell.trim());if(row.some(Boolean))records.push(row);
 const headers=records.shift()?.map(h=>h.replace(/^\uFEFF/,''))??[];if(headers.length<2)throw Error('CSV benötigt Kopfzeile und mindestens zwei Spalten.');
 const values=records.map((r,i)=>{if(r.length!==headers.length)throw Error(`Zeile ${i+2}: falsche Spaltenzahl.`);return r.map(v=>v===''?NaN:Number(delimiter===','?v:v.replace(',','.')));});
 return {headers,values};
}
export function linearFit(rows:Row[]) {
 const d=rows[0].x.length+1, a=Array.from({length:d},()=>Array(d+1).fill(0) as number[]);
 for(const r of rows){const v=[1,...r.x];for(let i=0;i<d;i++){for(let j=0;j<d;j++)a[i][j]+=v[i]*v[j];a[i][d]+=v[i]*r.y;}}
 for(let i=0;i<d;i++){let p=i;for(let j=i+1;j<d;j++)if(Math.abs(a[j][i])>Math.abs(a[p][i]))p=j;[a[i],a[p]]=[a[p],a[i]];if(Math.abs(a[i][i])<1e-12)throw Error('Lineare Regression: Eingangsgrößen sind konstant oder linear abhängig.');const v=a[i][i];for(let k=i;k<=d;k++)a[i][k]/=v;for(let j=0;j<d;j++)if(j!==i){const f=a[j][i];for(let k=i;k<=d;k++)a[j][k]-=f*a[i][k];}}
 const beta=a.map(r=>r[d]);return (x:number[])=>beta[0]+x.reduce((s,v,i)=>s+v*beta[i+1],0);
}
export function parameterCount(dim:number,layers:number[]) {const sizes=[dim,...layers,1];return sizes.slice(1).reduce((s,n,i)=>s+n*(sizes[i]+1),0);}
export async function trainNetwork(rows:Row[],train:number[],validation:number[],o:Options,onProgress:(epoch:number,train:number,validation:number)=>void,cancel:()=>boolean=()=>false) {
 if(!o.layers.length||o.layers.length>4||o.layers.some(n=>!Number.isInteger(n)||n<1||n>64)||!Number.isInteger(o.epochs)||o.epochs<1||o.epochs>5000||!Number.isFinite(o.rate)||o.rate<=0||o.rate>0.1)throw Error('Netz: 1–4 Schichten, je 1–64 Neuronen; 1–5000 Epochen; Lernrate > 0 bis 0,1.');
 const dim=rows[0].x.length, training=train.map(i=>rows[i]);
 const means=Array.from({length:dim+1},(_,j)=>training.reduce((s,r)=>s+(j===dim?r.y:r.x[j]),0)/training.length);
 const scales=means.map((m,j)=>Math.sqrt(training.reduce((s,r)=>s+((j===dim?r.y:r.x[j])-m)**2,0)/training.length)||1);
 const norm=(x:number[])=>x.map((v,j)=>(v-means[j])/scales[j]);const sizes=[dim,...o.layers,1],rng=random(o.seed);
 let weights=sizes.slice(1).map((n,l)=>Array.from({length:n},()=>Array.from({length:sizes[l]+1},(_,k)=>k===sizes[l]?0:(rng()*2-1)*Math.sqrt(6/(sizes[l]+n)))));
 const m=weights.map(l=>l.map(r=>r.map(()=>0))),v=structuredClone(m);
 const forward=(x:number[])=>{const acts=[norm(x)];weights.forEach((layer,l)=>acts.push(layer.map(w=>{const z=w[w.length-1]+acts[l].reduce((s,a,j)=>s+a*w[j],0);return l===weights.length-1?z:o.activation==='tanh'?Math.tanh(z):Math.max(0,z);})));return acts;};
 const predict=(x:number[])=>forward(x).at(-1)![0]*scales[dim]+means[dim];
 const loss=(ids:number[])=>ids.reduce((s,i)=>s+((predict(rows[i].x)-rows[i].y)/scales[dim])**2,0)/ids.length;
 let best=Infinity,bestWeights=structuredClone(weights),bestEpoch=0,stale=0,completed=0;
 for(let epoch=1;epoch<=o.epochs;epoch++){
 if(cancel())throw Error('Training abgebrochen.');const grad=weights.map(l=>l.map(r=>r.map(()=>0)));
 for(const r of training){const acts=forward(r.x);let delta=[2*(acts.at(-1)![0]-(r.y-means[dim])/scales[dim])/training.length];for(let l=weights.length-1;l>=0;l--){for(let i=0;i<delta.length;i++){for(let j=0;j<sizes[l];j++)grad[l][i][j]+=delta[i]*acts[l][j];grad[l][i][sizes[l]]+=delta[i];}if(l>0)delta=Array.from({length:sizes[l]},(_,j)=>delta.reduce((s,d,i)=>s+d*weights[l][i][j],0)*(o.activation==='tanh'?1-acts[l][j]**2:acts[l][j]>0?1:0));}}
 weights.forEach((layer,l)=>layer.forEach((w,i)=>w.forEach((_,j)=>{const g=Math.max(-10,Math.min(10,grad[l][i][j]));m[l][i][j]=.9*m[l][i][j]+.1*g;v[l][i][j]=.999*v[l][i][j]+.001*g*g;w[j]-=o.rate*(m[l][i][j]/(1-.9**epoch))/(Math.sqrt(v[l][i][j]/(1-.999**epoch))+1e-8);})));const tl=loss(train),vl=loss(validation);if(!Number.isFinite(tl+vl))throw Error('Training numerisch instabil. Lernrate reduzieren.');completed=epoch;
 if(vl<best-1e-8){best=vl;bestWeights=structuredClone(weights);bestEpoch=epoch;stale=0;}else stale++;
 if(epoch===1||epoch%10===0||epoch===o.epochs){onProgress(epoch,Math.sqrt(tl)*scales[dim],Math.sqrt(vl)*scales[dim]);await new Promise(resolve=>setTimeout(resolve,0));}
 if(o.early&&stale>=100)break;
 }
 if(o.early)weights=bestWeights;return {predict,completed,selectedEpoch:o.early?bestEpoch:completed};
}
