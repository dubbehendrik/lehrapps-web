import { descriptions } from './logic';
import type { GT } from './types';
// Deterministic original illustrations: fixed geometry, reproducible damage patterns.
export function Diagram({gt}:{gt:number}) {
 const damage=[0,.025,.1,.25,.5,.8][gt];
 return <svg viewBox="0 0 120 120" role="img" aria-label={`Schematisches Schadensbild GT${gt}`}>
 <rect width="120" height="120" fill="white"/>
 {Array.from({length:25},(_,i)=>{const x=10+i%5*20,y=10+Math.floor(i/5)*20;
 if(gt===0)return null;
 if(gt===1)return i%5<4&&Math.floor(i/5)<4?<circle key={i} cx={x+20} cy={y+20} r={Math.sqrt(250/(16*Math.PI))} fill="black"/>:null;
 if(gt===2)return <path key={i} d={`M${x} ${y}h20v1.026334h-18.973666v18.973666h-1.026334z`} fill="black"/>;
 const order=(i*11+3)%25,full=Math.floor(damage*25),fraction=damage*25-full;
 return order<full?<rect key={i} x={x} y={y} width="20" height="20" fill="black"/>:order===full?<path key={i} d={`M${x} ${y}h20v${20*fraction}h-20z`} fill="black"/>:null;
 })}
 {Array.from({length:6},(_,i)=><g key={i} stroke="black" strokeWidth=".6"><path d={`M${10+i*20} 4v112`}/><path d={`M4 ${10+i*20}h112`}/></g>)}
 </svg>;
}
export function Gallery({selected,onSelect,disabled}:{selected?:GT;onSelect:(g:GT)=>void;disabled?:boolean}) {
 return <><div className="gt-gallery">{descriptions.map((d,i)=><button key={i} disabled={disabled} aria-pressed={selected===i} onClick={()=>onSelect(i as GT)}><Diagram gt={i}/><strong>GT{i}</strong><span>{d}</span></button>)}</div><p className="gt-hint">Eigene schematische Darstellungen in Anlehnung an DIN EN ISO 2409:2020-12, Tabelle 1. Keine Originalabbildungen der Norm. Prozentbereiche dienen der Orientierung; digitale Flächenanteile ersetzen die visuelle Einstufung nicht.</p></>;
}
