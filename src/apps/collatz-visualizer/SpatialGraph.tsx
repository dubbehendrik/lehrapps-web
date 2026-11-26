import { useMemo, useState } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
// @ts-expect-error Plotly distributes this browser bundle without declarations.
import Plotly from 'plotly.js-gl3d-dist-min';
import type { Data } from 'plotly.js';
import { spatialGraph } from './springGraph';
const Plot=createPlotlyComponent(Plotly);
export default function SpatialGraph({onChoose}:{onChoose:(n:string)=>void}) {
 const [count,setCount]=useState(200);
 const nodes=useMemo(()=>spatialGraph(count),[count]);
 const edges:Record<'even'|'odd',{x:(number|null)[];y:(number|null)[];z:(number|null)[]}>={even:{x:[],y:[],z:[]},odd:{x:[],y:[],z:[]}};
 nodes.slice(1).forEach(n=>{const parent=nodes[n.parent],e=edges[n.value%2n?'odd':'even'];e.x.push(parent.x,n.x,null);e.y.push(parent.y,n.y,null);e.z.push(parent.z,n.z,null);});
 const traces:Data[]=[...(['even','odd'] as const).map(k=>({type:'scatter3d',mode:'lines',name:k==='even'?'Gerader Vorgänger':'Ungerader Vorgänger',...edges[k],line:{color:k==='even'?'#39b8ff':'#ff7acc',width:k==='even'?2:4},hoverinfo:'skip'} as Data)),{type:'scatter3d',mode:'markers',name:'Zahlen',x:nodes.map(n=>n.x),y:nodes.map(n=>n.y),z:nodes.map(n=>n.z),customdata:nodes.map(n=>n.value.toString()),text:nodes.map(n=>`${n.value} · ${n.depth} Schritte bis 1`),hovertemplate:'%{text}<extra></extra>',marker:{size:3,color:nodes.map(n=>n.depth),colorscale:'Viridis',showscale:true,colorbar:{title:{text:'Schritte bis 1'}}}} as Data];
 return <section><h2>Räumliches Collatz-Netz</h2><p>Der inverse reguläre Collatz-Graph beginnt bei 1. Kanten verbinden Zahlen mit ihrem nächsten Folgewert; die Zykluskante zur 1 wird ausgelassen. Das räumliche Federlayout orientiert sich am verlinkten 3D-Projekt: Abstände und Richtungen sind ausschließlich ein Layout, keine numerischen Achsen. Ein Knoten lässt sich als neuer gemeinsamer Startwert übernehmen.</p><label>Anzahl der Knoten <select value={count} onChange={e=>setCount(Number(e.target.value))}><option value={100}>100</option><option value={200}>200</option><option value={350}>350</option></select></label><p>{nodes.length} Knoten · blau: gerade Vorgänger · pink: ungerade Vorgänger · Knotenfarbe: Schritte bis 1. Mit Maus oder Touch drehen und zoomen.</p><Plot data={traces} layout={{height:600,autosize:true,margin:{l:0,r:0,t:20,b:40},paper_bgcolor:'#08162e',font:{color:'white'},legend:{orientation:'h'},scene:{xaxis:{visible:false},yaxis:{visible:false},zaxis:{visible:false},bgcolor:'#08162e',aspectmode:'data'}}} config={{responsive:true,displaylogo:false}} useResizeHandler style={{width:'100%'}} onClick={e=>{const p=e.points[0] as unknown as {customdata?:string}; if(p?.customdata)onChoose(p.customdata);}}/></section>;
}
