import { descriptions } from './logic';
import type { GT } from './types';
// Deterministic original illustrations: fixed geometry, reproducible damage patterns.
export function Diagram({gt}:{gt:number}) {
 const damage=[0,.025,.1,.25,.5,.8][gt];
 return <svg viewBox="0 0 120 120" role="img" aria-label={`Schematisches Schadensbild GT${gt}`}>
 <rect width="120" height="120" fill="#28759b"/>
 {Array.from({length:25},(_,i)=>{const x=10+i%5*20,y=10+Math.floor(i/5)*20;
 if(gt===0)return null;
 if(gt===1)return <circle key={i} cx={x} cy={y} r={1.8} fill="#ddd"/>;
 if(gt===2)return <path key={i} d={`M${x} ${y}h20v2h-17v18h-3z`} fill="#ddd"/>;
 const order=(i*7)%25,full=Math.floor(damage*25),fraction=damage*25-full;
 return order<full?<rect key={i} x={x} y={y} width="20" height="20" fill="#ddd"/>:order===full?<path key={i} d={`M${x} ${y}h20v${20*fraction}l-20 3z`} fill="#ddd"/>:null;
 })}
 {Array.from({length:6},(_,i)=><g key={i} stroke="#182e38" strokeWidth=".6"><path d={`M${10+i*20} 4v112`}/><path d={`M4 ${10+i*20}h112`}/></g>)}
 </svg>;
}
export function Gallery({selected,onSelect,disabled}:{selected?:GT;onSelect:(g:GT)=>void;disabled?:boolean}) {
 return <><div className="gt-gallery">{descriptions.map((d,i)=><button key={i} disabled={disabled} aria-pressed={selected===i} onClick={()=>onSelect(i as GT)}><Diagram gt={i}/><strong>GT{i}</strong><span>{d}</span></button>)}</div><p className="gt-hint">Eigene schematische Darstellungen in Anlehnung an DIN EN ISO 2409:2020-12, Tabelle 1. Keine Originalabbildungen der Norm. Prozentbereiche dienen der Orientierung; digitale Flächenanteile ersetzen die visuelle Einstufung nicht.</p></>;
}
