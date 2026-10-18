import {useMemo,useState} from 'react';
import type {Result} from './types';
import {electricAt} from './electrostatics';
import {inside,bellPolygon,electrodes} from './geometry';
import {Chart} from '../../components/Chart';
export function FieldProbe({result}:{result:Result}){
 const [y,setY]=useState(0);
 const data=useMemo(()=>{const solids=[result.geometry,bellPolygon(result.parameters),...electrodes(result.parameters)];return Array.from({length:301},(_,i)=>{const x=.08+i*.37/300,point={x,y:y/1000};if(solids.some(poly=>inside(point,poly)))return {x:x*1000,e:null};const f=result.grid.electric?electricAt(result.grid.electric,point):{x:0,y:0};return {x:x*1000,e:Math.hypot(f.x,f.y)/1000};});},[result,y]);
 return <details><summary>Abschirmung untersuchen · horizontaler Feldstärkeverlauf</summary><p>Prüflinie durch den zuletzt berechneten Stand. Bei der Abschirmtasche zeigt y = 0 mm den Verlauf von der Öffnung zum Taschenboden. Im Metall werden keine Werte gezeichnet. Eine offene Tasche ist nicht vollständig feldfrei.</p><label>Höhe der Prüflinie y [mm]<input type="number" min="-150" max="150" step="5" value={y} onChange={e=>{const v=Number(e.target.value);if(Number.isFinite(v)&&v>=-150&&v<=150)setY(v);}}/></label><Chart title="Elektrische Abschirmung" description={`Feldstärke entlang y = ${y} mm; logarithmische Achse, Nullwerte nicht darstellbar.`} data={[{type:'scatter',mode:'lines',x:data.map(v=>v.x),y:data.map(v=>v.e),connectgaps:false,name:'|E|',line:{color:'#b47700'}}]} layout={{xaxis:{title:{text:'x [mm]'}},yaxis:{title:{text:'|E| [kV/m]'},type:'log'},showlegend:false}}/></details>;
}
