import {axes,planeAxes} from './logic';
import type {Parameters,Slice,View} from './types';
export const WIDTH=1100,HEIGHT=800;
export const fmt=(v:number)=>Math.abs(v)>=1?v.toLocaleString('de-DE',{maximumFractionDigits:1}):Number(v.toPrecision(4)).toLocaleString('de-DE',{maximumSignificantDigits:4});
export function color(t:number,lo:number,hi:number):[number,number,number] {
  const f=hi===lo?.5:Math.max(0,Math.min(1,(t-lo)/(hi-lo)));
  // Fixed continuous blue -> cyan -> yellow -> orange -> red scale.
  const stops=[[24,67,185],[0,185,220],[255,230,45],[245,135,20],[194,32,35]];
  const segment=Math.min(3,Math.floor(f*4)),q=f*4-segment;
  return stops[segment].map((v,i)=>Math.round(v+(stops[segment+1][i]-v)*q)) as [number,number,number];
}
export function mapBounds(p:Parameters,view:View) {
  const [h,v]=planeAxes(view.plane),scale=Math.min(670/p.size[h],430/p.size[v]);
  const width=p.size[h]*scale,height=p.size[v]*scale;
  return {x:95+(670-width)/2,y:90+(430-height)/2,width,height};
}
export function diagramPoint(p:Parameters,view:View,x:number,y:number) {
  const r=mapBounds(p,view),[h,v,n]=planeAxes(view.plane);
  if(x<r.x||x>r.x+r.width||y<r.y||y>r.y+r.height)return null;
  const pos=[0,0,0];pos[h]=((x-r.x)/r.width-.5)*p.size[h];pos[v]=(.5-(y-r.y)/r.height)*p.size[v];pos[n]=view.position;
  if(!view.smooth) for(const i of [h,v])pos[i]=-p.size[i]/2+Math.round((pos[i]/p.size[i]+.5)*(p.points[i]-1))*p.size[i]/(p.points[i]-1);
  for(const i of [h,v]) if(Math.abs(pos[i])<1e-12*p.size[i])pos[i]=0;
  return pos;
}
function line(ctx:CanvasRenderingContext2D,points:number[][],close=false,fill?:string) {
  ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));if(close)ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}ctx.stroke();
}
function arrow(ctx:CanvasRenderingContext2D,x:number,y:number,xx:number,yy:number) {
  line(ctx,[[x,y],[xx,yy]]);const a=Math.atan2(yy-y,xx-x),head=Math.min(9,Math.hypot(xx-x,yy-y)/3);line(ctx,[[xx-head*Math.cos(a-.45),yy-head*Math.sin(a-.45)],[xx,yy],[xx-head*Math.cos(a+.45),yy-head*Math.sin(a+.45)]]);
}
function doubleArrow(ctx:CanvasRenderingContext2D,x:number,y:number,xx:number,yy:number) {
  arrow(ctx,x,y,xx,yy);
  const a=Math.atan2(y-yy,x-xx),head=Math.min(9,Math.hypot(xx-x,yy-y)/3);
  line(ctx,[[x-head*Math.cos(a-.45),y-head*Math.sin(a-.45)],[x,y],[x-head*Math.cos(a+.45),y-head*Math.sin(a+.45)]]);
}
export function drawDiagram(canvas:HTMLCanvasElement,p:Parameters,view:View,s:Slice,selected:number[]|null=null) {
  canvas.width=WIDTH;canvas.height=HEIGHT;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.fillStyle='#162c3c';ctx.font='bold 26px system-ui';ctx.fillText('Temperaturverteilung',30,35);
  ctx.font='20px system-ui';ctx.fillText(`${view.plane} · ${s.normal} = ${fmt(view.position)} mm · t = ${fmt(view.time)} s`,30,66);
  const r=mapBounds(p,view),lo=Math.min(p.initial,p.ambient),hi=Math.max(p.initial,p.ambient);
  const nx=s.u.length,ny=s.v.length;
  const off=document.createElement('canvas');off.width=Math.max(1,Math.ceil(r.width));off.height=Math.max(1,Math.ceil(r.height));
  const oc=off.getContext('2d')!,image=oc.createImageData(off.width,off.height);
  for(let y=0;y<off.height;y++)for(let x=0;x<off.width;x++) {
    const gx=(x+.5)/off.width*(nx-1),gy=(1-(y+.5)/off.height)*(ny-1);
    let t:number;
    if(view.smooth) {
      const i=Math.floor(gx),j=Math.floor(gy),u=gx-i,v=gy-j;
      const a=s.temperature[j][i]*(1-u)+s.temperature[j][Math.min(nx-1,i+1)]*u;
      const b=s.temperature[Math.min(ny-1,j+1)][i]*(1-u)+s.temperature[Math.min(ny-1,j+1)][Math.min(nx-1,i+1)]*u;t=a*(1-v)+b*v;
    } else t=s.temperature[Math.round(gy)][Math.round(gx)];
    const rgb=color(t,lo,hi),idx=(y*off.width+x)*4;image.data.set([...rgb,255],idx);
  }
  oc.putImageData(image,0,0);ctx.drawImage(off,r.x,r.y,r.width,r.height);
  ctx.strokeStyle='#162c3c';ctx.lineWidth=1.5;ctx.strokeRect(r.x,r.y,r.width,r.height);ctx.fillStyle='#162c3c';ctx.font='17px system-ui';
  for(let i=0;i<=4;i++) {
    const x=r.x+i*r.width/4,y=r.y+r.height-i*r.height/4;
    if(r.width>180||i===0||i===4){line(ctx,[[x,r.y+r.height],[x,r.y+r.height+6]]);ctx.textAlign=r.width>180?'center':i===0?'right':'left';ctx.fillText(fmt(s.u[0]+(s.u.at(-1)!-s.u[0])*i/4),x,r.y+r.height+26);}
    // Very thin slices: show only end coordinates to avoid overlapping labels.
    if(r.height>110||i===0||i===4){line(ctx,[[r.x-6,y],[r.x,y]]);ctx.textAlign='right';ctx.fillText(fmt(s.v[0]+(s.v.at(-1)!-s.v[0])*i/4),r.x-10,y+6);}
  }
  ctx.textAlign='center';ctx.fillText(`${s.horizontal} [mm]`,r.x+r.width/2,r.y+r.height+53);
  ctx.save();ctx.translate(r.x-65,r.y+r.height/2);ctx.rotate(-Math.PI/2);ctx.fillText(`${s.vertical} [mm]`,0,0);ctx.restore();
  ctx.strokeStyle='#00543f';ctx.fillStyle='#00543f';
  doubleArrow(ctx,r.x+r.width/2,r.y+r.height+77,r.x+r.width,r.y+r.height+77);
  ctx.textAlign='left';subscriptText(ctx,[['L',`${s.horizontal},char`],[` = ${fmt((s.u.at(-1)!-s.u[0])/2)} mm`]],r.x+r.width/2,r.y+r.height+103);
  // Vertical half-length label stays immediately next to its dimension arrow.
  const verticalX=r.x+r.width+15,verticalMid=r.y+r.height/4;
  doubleArrow(ctx,verticalX,r.y+r.height/2,verticalX,r.y);
  ctx.save();ctx.translate(verticalX+15,verticalMid);ctx.rotate(-Math.PI/2);
  const verticalLabel=`L${s.vertical},char = ${fmt((s.v.at(-1)!-s.v[0])/2)} mm`;
  ctx.font='17px system-ui';const labelWidth=ctx.measureText(verticalLabel).width;
  subscriptText(ctx,[['L',`${s.vertical},char`],[` = ${fmt((s.v.at(-1)!-s.v[0])/2)} mm`]],-labelWidth/2,0);ctx.restore();
  ctx.font='16px system-ui';ctx.fillText('Charakteristische Länge = halbe Bauteilabmessung',30,646);
  if(selected){
    const [h,v]=planeAxes(view.plane),x=r.x+(selected[h]/p.size[h]+.5)*r.width,y=r.y+(.5-selected[v]/p.size[v])*r.height;
    ctx.save();ctx.beginPath();ctx.rect(r.x,r.y,r.width,r.height);ctx.clip();
    ctx.strokeStyle='#fff';ctx.lineWidth=3;line(ctx,[[r.x,y],[r.x+r.width,y]]);line(ctx,[[x,r.y],[x,r.y+r.height]]);
    ctx.strokeStyle='#162c3c';ctx.lineWidth=1;ctx.setLineDash([7,5]);line(ctx,[[r.x,y],[r.x+r.width,y]]);line(ctx,[[x,r.y],[x,r.y+r.height]]);ctx.setLineDash([]);
    ctx.beginPath();ctx.arc(x,y,5,0,2*Math.PI);ctx.fillStyle='#a34800';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  }
  // Legend uses fixed physical temperature endpoints.
  const lx=30,ly=668,lw=740;
  for(let x=0;x<lw;x++){ctx.fillStyle=`rgb(${color(lo+(hi-lo)*x/(lw-1),lo,hi).join(',')})`;ctx.fillRect(lx+x,ly,1,20);}
  ctx.fillStyle='#162c3c';ctx.font='18px system-ui';ctx.textAlign='left';ctx.fillText(`${fmt(lo)} °C`,lx,ly+44);ctx.textAlign='right';ctx.fillText(`${fmt(hi)} °C`,lx+lw,ly+44);ctx.textAlign='center';ctx.fillText('Temperatur [°C] · feste Skala',lx+lw/2,ly+44);
  ctx.textAlign='left';ctx.font='18px system-ui';ctx.fillText(`${view.smooth?'Bilinear geglättet':'Farbfelder ohne Glättung'} · Geometrie maßstabsgerecht`,30,752);
  ctx.fillText(s.converged?'Reihenfehler ≤ 0,01 K (konservative Abschätzung)': 'ACHTUNG: Genauigkeitsziel nicht erreicht – Termlimit.',30,781);
  // Orthographic isometric projection, one common scale for all dimensions.
  const project=cuboidProjection(p.size);
  const proj=(x:number,y:number,z:number)=>project([x*p.size[0],y*p.size[1],z*p.size[2]]);
  ctx.strokeStyle='#657c8a';ctx.lineWidth=1.5;
  const corners=Array.from({length:8},(_,i)=>proj(i&1,(i>>1)&1,(i>>2)&1));
  for(let i=0;i<8;i++)for(const bit of [1,2,4])if(!(i&bit))line(ctx,[corners[i],corners[i|bit]]);
  const [h,v,n]=planeAxes(view.plane),f=view.position/p.size[n]+.5;
  const plane=[[0,0],[1,0],[1,1],[0,1]].map(([a,b])=>{const pos=[0,0,0];pos[h]=a;pos[v]=b;pos[n]=f;return proj(pos[0],pos[1],pos[2]);});
  ctx.strokeStyle='#a34800';line(ctx,plane,true,'#f0a65b80');ctx.fillStyle='#162c3c';ctx.font='16px system-ui';ctx.fillText('Quader · proportionale Geometrie',810,60);
  const origin=proj(.5,.5,.5);
  ctx.strokeStyle='#007053';ctx.fillStyle='#007053';ctx.lineWidth=2.5;
  [[Math.sqrt(3)/2,.5],[-Math.sqrt(3)/2,.5],[0,-1]].forEach(([dx,dy],i)=>{
    const length=i===2?75:140;
    const end=[origin[0]+length*dx,origin[1]+length*dy];arrow(ctx,origin[0],origin[1],end[0],end[1]);
    ctx.fillText(axes[i],end[0]+(dx<0?-14:6),end[1]+(dy<0?-4:6));
  });ctx.fillStyle='#162c3c';ctx.lineWidth=1.5;
  ctx.fillText(`Schnitt: ${view.plane}, ${s.normal} = ${fmt(view.position)} mm`,815,247);
  ctx.strokeStyle='#cad5dd';ctx.strokeRect(805,252,275,535);ctx.font='17px system-ui';
  const text=(value:string,y:number)=>ctx.fillText(value,818,y,250);
  text(p.material,277);text(`${p.size.map(fmt).join(' × ')} mm`,303);
  text(`λ = ${fmt(p.conductivity)} W/(m K)`,329);text(`ρ = ${fmt(p.density)} kg/m³`,355);
  subscriptText(ctx,[['c','p'],[` = ${fmt(p.cp)} J/(kg K)`]],818,381);
  subscriptText(ctx,[['T','0'],[` = ${fmt(p.initial)} °C; `],['T','∞'],[` = ${fmt(p.ambient)} °C`]],818,407);
  text(`Endzeit: ${fmt(p.endTime)} s`,433);
  axes.forEach((axis,i)=>{
    const y=469+i*92;ctx.strokeStyle='#cad5dd';line(ctx,[[817,y-16],[1068,y-16]]);
    subscriptText(ctx,[['α',`${axis},−`],[` = ${fmt(p.alphas[2*i])} W/(m² K)`]],818,y);
    subscriptText(ctx,[['α',`${axis},+`],[` = ${fmt(p.alphas[2*i+1])} W/(m² K)`]],818,y+18);
    subscriptText(ctx,[['L',`${axis},char`],[` = ${fmt(p.size[i]/2)} mm`]],818,y+36);
    subscriptText(ctx,[['Bi',`${axis},−`],[` = ${fmt(s.bi[2*i])}; `],['Bi',`${axis},+`],[` = ${fmt(s.bi[2*i+1])}`]],818,y+54);
    subscriptText(ctx,[['Fo',axis],[` = ${fmt(s.fo[i])}`]],818,y+72);
  });
  ctx.strokeStyle='#cad5dd';line(ctx,[[817,744],[1068,744]]);text(`Punkte: ${p.points.join(' × ')}`,770);
}

/** Canvas-native subscripts: index drawn smaller and below the baseline. */
function subscriptText(ctx:CanvasRenderingContext2D,parts:[string,string?][],x:number,y:number) {
  const widths=parts.map(([base,index])=>{ctx.font='17px system-ui';const w=ctx.measureText(base).width;ctx.font='12px system-ui';return w+(index?ctx.measureText(index).width:0);});
  ctx.save();ctx.translate(x,y);ctx.scale(Math.min(1,250/widths.reduce((a,b)=>a+b,0)),1);
  let offset=0;parts.forEach(([base,index])=>{ctx.font='17px system-ui';ctx.fillText(base,offset,0);offset+=ctx.measureText(base).width;if(index){ctx.font='12px system-ui';ctx.fillText(index,offset,4);offset+=ctx.measureText(index).width;}});ctx.restore();ctx.font='17px system-ui';
}

/** Equal physical dimensions have equal projected edge lengths. */
export function cuboidProjection(size:number[]) {
  const width=Math.sqrt(3)/2*(size[0]+size[1]),height=(size[0]+size[1])/2+size[2];
  const scale=Math.min(230/width,110/height),ox=940-Math.sqrt(3)/4*(size[0]-size[1])*scale,oy=158-((size[0]+size[1])/4-size[2]/2)*scale;
  return (point:number[])=>[ox+Math.sqrt(3)/2*(point[0]-point[1])*scale,oy+((point[0]+point[1])/2-point[2])*scale];
}

export function plotTicks(min:number,max:number) {
  const tickvals=Array.from({length:5},(_,i)=>min+(max-min)*i/4);
  return {tickmode:'array' as const,tickvals,ticktext:tickvals.map(fmt)};
}
export function displayNumber(value:number) {
  return Math.abs(value)>=1?Number(value.toFixed(1)):Number(value.toPrecision(4));
}
