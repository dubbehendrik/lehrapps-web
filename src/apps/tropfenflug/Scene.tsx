import {electricAt} from './electrostatics';
import {forceScales} from './display';
import {useMemo,useId} from 'react';
import type {Point,Parameters,Result,Frame,Vec} from './types';
import {domain,editor,bellPolygon,electrodes,inside,polygonHit} from './geometry';
import {sample} from './fields';
import {magnitude} from './logic';
export const colors={electric:'#b47700',drag:'#2765b1',gravity:'#00824f',total:'#ab254d'};
export const sx=(x:number)=>50+(x-domain.x0)*1300;
export const sy=(y:number)=>35+(domain.y1-y)*1300;
export const points=(poly:Point[])=>poly.map(p=>`${sx(p.x)},${sy(p.y)}`).join(' ');
export const labels:Record<string,string>={workpiece:'Werkstück getroffen',atomizer:'Zerstäuber getroffen',electrode:'Elektrode getroffen',escaped:'Berechnungsgebiet verlassen',timeout:'Zeitlimit erreicht'};
export function format(v:number):string{if(!Number.isFinite(v))return '–';return v!==0&&(Math.abs(v)<.1||Math.abs(v)>=1e5)?v.toExponential(1).replace('.',','):v.toLocaleString('de-DE',{maximumFractionDigits:1});}
function trace(result:Result,start:Point,type:'air'|'electric',sign:number){const g=result.grid;let p=start;const out:Point[]=[];const obstacles=[result.geometry,bellPolygon(result.parameters),...electrodes(result.parameters)];
 for(let n=0;n<550;n++){if(p.x<=domain.x0||p.x>=domain.x1||p.y<=domain.y0||p.y>=domain.y1)break;const k=Math.round((p.y-g.y0)/g.h)*g.nx+Math.round((p.x-g.x0)/g.h);if((type==='air'&&g.solid[k])||obstacles.some(poly=>inside(p,poly)))break;out.push(p);
 const ef=type==='electric'&&g.electric?electricAt(g.electric,p):null;const vx=ef?ef.x:sample(g,g.ux,p),vy=ef?ef.y:sample(g,g.uy,p),speed=Math.hypot(vx,vy);if(speed<1e-10)break;
 const near=type==='electric'&&g.electric?Math.min(...g.electric.panels.map(s=>{const dx=p.x-s.x,dy=p.y-s.y,u=Math.max(0,Math.min(s.length,dx*s.tx+dy*s.ty));return Math.hypot(dx-u*s.tx,dy-u*s.ty);})):g.h;const step=Math.min(g.h*.45,Math.max(.000025,near*.35))*sign,mid={x:p.x+step*vx/speed/2,y:p.y+step*vy/speed/2},mf=type==='electric'&&g.electric?electricAt(g.electric,mid):null,mx=mf?mf.x:sample(g,g.ux,mid),my=mf?mf.y:sample(g,g.uy,mid),ms=Math.hypot(mx,my);if(ms<1e-10)break;const next={x:p.x+step*mx/ms,y:p.y+step*my/ms};if(obstacles.some(poly=>polygonHit(p,next,poly)!==null))break;p=next;
 }return out;
}
function heatmap(r:Result){const g=r.grid,c=document.createElement('canvas');c.width=g.nx;c.height=g.ny;const ctx=c.getContext('2d');if(!ctx)return {url:'',max:0};const data=ctx.createImageData(g.nx,g.ny);let max=0;for(let k=0;k<g.ex.length;k++)if(!g.solid[k])max=Math.max(max,Math.hypot(g.ex[k],g.ey[k]));
 for(let j=0;j<g.ny;j++)for(let i=0;i<g.nx;i++){const k=j*g.nx+i,l=((g.ny-1-j)*g.nx+i)*4,t=max?Math.log1p(Math.hypot(g.ex[k],g.ey[k])/1000)/Math.log1p(max/1000):0;data.data[l]=255;data.data[l+1]=Math.round(250-110*t);data.data[l+2]=Math.round(240-205*t);data.data[l+3]=g.solid[k]?0:255;}ctx.putImageData(data,0,0);return {url:c.toDataURL(),max};}
export interface SceneProps{p:Parameters;polygon:Point[];result:Result|null;frame:Frame|null;fieldLines:boolean;airLines:boolean;heat:boolean;showPath:boolean;individual:boolean;forceZoom:number;enabled:Record<string,boolean>;lineCount:number}
export function Scene({p,polygon,result,frame,fieldLines,airLines,heat,showPath,individual,forceZoom,enabled,lineCount}:SceneProps){
 const uid=useId().replace(/:/g,''),heatImage=useMemo(()=>result?heatmap(result):{url:'',max:0},[result]);
 const paths=useMemo(()=>{if(!result)return {air:[],electric:[]} as {air:Point[][];electric:Point[][]};
 const surfaces=p.charging==='external'?electrodes(p):[bellPolygon(p)];const seeds:Point[]=[];
 for(const poly of surfaces){const area=poly.reduce((a,b,i)=>{const c=poly[(i+1)%poly.length];return a+b.x*c.y-b.y*c.x;},0),sign=area>0?1:-1;
 const lengths=poly.map((a,i)=>Math.hypot(poly[(i+1)%poly.length].x-a.x,poly[(i+1)%poly.length].y-a.y)),total=lengths.reduce((a,b)=>a+b,0);
 for(let n=0;n<lineCount/surfaces.length;n++){let distance=(n+.5)*total/Math.ceil(lineCount/surfaces.length),i=0;while(distance>lengths[i]&&i<poly.length-1)distance-=lengths[i++];const a=poly[i],b=poly[(i+1)%poly.length],l=lengths[i];seeds.push({x:a.x+(b.x-a.x)*distance/l+sign*(b.y-a.y)/l*.00008,y:a.y+(b.y-a.y)*distance/l-sign*(b.x-a.x)/l*.00008});}
 }
 // Additional tip fan resolves the narrow right-facing high-field zone.
 if(p.charging==='external')for(const sign of [-1,1])for(let i=0;i<16;i++){const a=-Math.PI/2+(i+.5)*Math.PI/16,r=p.tipRadius/1000;seeds.push({x:p.electrodeX/1000+.03-r+(r+.00004)*Math.cos(a),y:sign*p.electrodeY/1000+(r+.00004)*Math.sin(a)});}
 return {air:Array.from({length:19},(_,i)=>trace(result,{x:-.094,y:-.225+i*.025},'air',1)),electric:seeds.map(v=>trace(result,v,'electric',Math.sign(p.voltage)||-1))};},[result,p,lineCount]);
 const scales=useMemo(()=>forceScales(result,individual,forceZoom),[result,individual,forceZoom]);
 const shape=result?.geometry??polygon,midY=(Math.max(...shape.map(v=>v.y))+Math.min(...shape.map(v=>v.y)))/2;
 const crossings=shape.flatMap((a,i)=>{const b=shape[(i+1)%shape.length];return (a.y>midY)!==(b.y>midY)?[a.x+(b.x-a.x)*(midY-a.y)/(b.y-a.y)]:[];});const groundX=Math.max(...crossings,...shape.filter(v=>v.y===midY).map(v=>v.x));
 const arrow=(a:Point,v:Point,color:string,id:string,label?:string)=>{const x=sx(a.x),y=sy(a.y),dx=v.x,dy=-v.y;return <g key={id}><line x1={x} y1={y} x2={x+dx} y2={y+dy} stroke={color} strokeWidth={label?3:1.7} markerEnd={`url(#${uid}-${id})`}/>{label&&<text x={x+dx+7} y={y+dy-5} fill={color} fontSize="17" fontWeight="bold">F<tspan baselineShift="sub" fontSize="12">{label}</tspan></text>}</g>;};
 return <svg className="tf-scene" viewBox="0 0 950 800" role="img" aria-label="Flugraum mit elektrischem Feld, Luftströmung, projizierter Tropfenflugbahn und Kraftvektoren">
 <defs>{Object.entries({...colors,air:'#5794c5',electricLine:'#b47700'}).map(([id,c])=><marker key={id} id={`${uid}-${id}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth"><path d="M0 0 L7 3.5 L0 7 Z" fill={c}/></marker>)}<clipPath id={`${uid}-clip`}><rect x="50" y="35" width="845" height="650"/></clipPath></defs>
 <rect width="950" height="800" fill="white"/>
 <g clipPath={`url(#${uid}-clip)`}>
 {heat&&heatImage.url&&<image href={heatImage.url} x="50" y="35" width="845" height="650" preserveAspectRatio="none"/>}
 <rect x={sx(editor.x0)} y={sy(editor.y1)} width={(editor.x1-editor.x0)*1300} height={(editor.y1-editor.y0)*1300} fill="none" stroke="#9caeb7" strokeDasharray="4 7"/>
 {airLines&&paths.air.map((path,i)=><g key={`a${i}`}><polyline points={points(path)} fill="none" stroke="#5794c5" strokeOpacity=".55" strokeWidth="1.4"/>{path.length>20&&(()=>{const k=Math.floor(path.length*.35),a=path[k],b=path[k+1];return arrow(a,{x:(b.x-a.x)*1300*4,y:(b.y-a.y)*1300*4},'#5794c5','air');})()}</g>)}
 {fieldLines&&paths.electric.map((path,i)=>{const k=Math.floor(path.length*.55),a=path[k],b=path[k+1];return <g key={`e${i}`}><polyline points={points(path)} fill="none" stroke="#b47700" strokeOpacity=".7" strokeWidth="1.6"/>{a&&b&&arrow(a,{x:(b.x-a.x)*1300*(Math.sign(p.voltage)||-1)*4,y:(b.y-a.y)*1300*(Math.sign(p.voltage)||-1)*4},'#b47700','electricLine')}</g>;})}
 <line x1={sx(0)} x2={sx(0)} y1="35" y2="685" stroke="#637985" strokeDasharray="7 6"/><text x={sx(0)+7} y="660" fill="#48616f" fontSize="15">x = 0</text>
 <polygon points={points(bellPolygon(p))} fill="#d4dfe4" stroke="#28495a" strokeWidth="2"/>
 <polygon points={points(result?.geometry??polygon)} fill="#d4e4de" stroke="#007053" strokeWidth="3"/>
 {electrodes(p).map((poly,i)=><polygon key={i} points={points(poly)} fill="#e8c49c" stroke="#925515" strokeWidth="2"/>)}
 {showPath&&result&&<polyline points={points(result.frames.map(f=>f.position))} fill="none" stroke="#ac1e3d" strokeWidth="2.5" strokeDasharray="6 5"/>}
 {frame&&<><circle cx={sx(frame.position.x)} cy={sy(frame.position.y)} r="7" fill="#c81d3d" stroke="white" strokeWidth="2"/>{(['electric','drag','gravity','total'] as const).filter(k=>enabled[k]).map(k=>{const v=frame[k],scale=scales[k];return arrow(frame.position,{x:v.x*scale,y:v.y*scale},colors[k],k,{electric:'el',drag:'W',gravity:'G',total:'res'}[k]);})}</>}
 </g>
 <rect x="50" y="35" width="845" height="650" fill="none" stroke="#768f9d"/>
 {[-100,0,100,200,300,400,500].map(x=><text key={x} x={sx(x/1000)} y="708" textAnchor="middle" fontSize="15">{x}</text>)}
 {[-200,-100,0,100,200].map(y=><text key={y} x="43" y={sy(y/1000)+5} textAnchor="end" fontSize="15">{y}</text>)}
 <text x="870" y="732" textAnchor="end" fontSize="17">x [mm]</text><text x="14" y="25" fontSize="17">y [mm]</text>
 <text x={sx(-.075)} y={sy(-.055)} fontSize="15">Glocke {p.charging==='contact'?`${format(p.voltage)} kV`:'0 V'}</text>
 <g aria-label="Geerdetes Werkstück" transform={`translate(${sx(Number.isFinite(groundX)?groundX:Math.max(...shape.map(v=>v.x)))},${sy(midY)})`} stroke="#007053" strokeWidth="2.5" fill="none"><path d="M0 0 H35 V35 M20 35 H50 M25 42 H45 M30 49 H40"/><text x="43" y="17" fill="#007053" stroke="none" fontSize="15">0 V</text></g>
 <text x="65" y="58" fontSize="16">{frame?`t = ${format(frame.t*1000)} ms · z = ${format(frame.position.z*1000)} mm`:'Parameter einstellen und berechnen'}</text>
 {heat&&<g aria-label="Farbskala der Feldstärke"><defs><linearGradient id={`${uid}-heat`}><stop offset="0" stopColor="rgb(255,250,240)"/><stop offset="1" stopColor="rgb(255,140,35)"/></linearGradient></defs><rect x="270" y="750" width="350" height="14" fill={`url(#${uid}-heat)`}/>{[0,.5,1].map(t=><text key={t} x={270+350*t} y="785" textAnchor="middle" fontSize="14">{format(Math.expm1(t*Math.log1p(heatImage.max/1000)))} kV/m</text>)}<text x="55" y="765" fontSize="15">|E| · logarithmisch</text></g>}
 </svg>;
}
