import {axes,planeAxes} from './logic';
import type {Parameters,Slice,View} from './types';
export const WIDTH=1100,HEIGHT=800;
export const fmt=(v:number)=>Number(v.toPrecision(5)).toLocaleString('de-DE');
export function color(t:number,lo:number,hi:number):[number,number,number] {
  const f=hi===lo?.5:Math.max(0,Math.min(1,(t-lo)/(hi-lo)));
  // Blue -> pale neutral -> red; same temperature mapping for every time/slice.
  const a=f<.5?[24,67,185]:[245,242,234],b=f<.5?[245,242,234]:[194,32,35],q=f<.5?2*f:2*f-1;
  return a.map((v,i)=>Math.round(v+(b[i]-v)*q)) as [number,number,number];
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
  line(ctx,[[x,y],[xx,yy]]);const a=Math.atan2(yy-y,xx-x);line(ctx,[[xx-9*Math.cos(a-.45),yy-9*Math.sin(a-.45)],[xx,yy],[xx-9*Math.cos(a+.45),yy-9*Math.sin(a+.45)]]);
}
export function drawDiagram(canvas:HTMLCanvasElement,p:Parameters,view:View,s:Slice,selected:number[]|null=null) {
  canvas.width=WIDTH;canvas.height=HEIGHT;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.fillStyle='#162c3c';ctx.font='bold 26px system-ui';ctx.fillText('Wärmeleitung im Quader',30,35);
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
  arrow(ctx,r.x+r.width/2,r.y+r.height+77,r.x+r.width,r.y+r.height+77);
  ctx.fillText(`L${s.horizontal} = ${fmt((s.u.at(-1)!-s.u[0])/2)} mm`,r.x+r.width*.75,r.y+r.height+101);
  ctx.textAlign='left';ctx.fillText(`L${s.vertical} = ${fmt((s.v.at(-1)!-s.v[0])/2)} mm`,r.x,r.y+r.height+124);
  // Also show the vertical half-dimension with an actual arrow beside the field.
  arrow(ctx,r.x+r.width+12,r.y+r.height/2,r.x+r.width+12,r.y);
  if(selected){const [h,v]=planeAxes(view.plane),x=r.x+(selected[h]/p.size[h]+.5)*r.width,y=r.y+(.5-selected[v]/p.size[v])*r.height;ctx.strokeStyle='#000';ctx.lineWidth=4;line(ctx,[[x-8,y],[x+8,y]]);line(ctx,[[x,y-8],[x,y+8]]);ctx.strokeStyle='#fff';ctx.lineWidth=1;line(ctx,[[x-8,y],[x+8,y]]);line(ctx,[[x,y-8],[x,y+8]]);}
  // Legend uses fixed physical temperature endpoints.
  const lx=30,ly=668,lw=740;
  for(let x=0;x<lw;x++){ctx.fillStyle=`rgb(${color(lo+(hi-lo)*x/(lw-1),lo,hi).join(',')})`;ctx.fillRect(lx+x,ly,1,20);}
  ctx.fillStyle='#162c3c';ctx.font='18px system-ui';ctx.textAlign='left';ctx.fillText(`${fmt(lo)} °C`,lx,ly+44);ctx.textAlign='right';ctx.fillText(`${fmt(hi)} °C`,lx+lw,ly+44);ctx.textAlign='center';ctx.fillText('Temperatur [°C] · feste Skala',lx+lw/2,ly+44);
  ctx.textAlign='left';ctx.font='18px system-ui';ctx.fillText(`${view.smooth?'Bilinear geglättet':'Farbfelder ohne Glättung'} · Geometrie maßstabsgerecht`,30,752);
  ctx.fillText(s.converged?'Reihenfehler ≤ 0,01 K (konservative Abschätzung)': 'ACHTUNG: Genauigkeitsziel nicht erreicht – Termlimit.',30,781);
  // Orientation box: isometric sketch intentionally schematic, clearly labeled.
  const origin=[845,220],proj=(x:number,y:number,z:number)=>[origin[0]+145*x+70*y,origin[1]-45*y-65*z];
  ctx.strokeStyle='#657c8a';ctx.lineWidth=1.5;
  const corners=Array.from({length:8},(_,i)=>proj(i&1,(i>>1)&1,(i>>2)&1));
  for(let i=0;i<8;i++)for(const bit of [1,2,4])if(!(i&bit))line(ctx,[corners[i],corners[i|bit]]);
  const [h,v,n]=planeAxes(view.plane),f=view.position/p.size[n]+.5;
  const plane=[[0,0],[1,0],[1,1],[0,1]].map(([a,b])=>{const pos=[0,0,0];pos[h]=a;pos[v]=b;pos[n]=f;return proj(pos[0],pos[1],pos[2]);});
  ctx.strokeStyle='#a34800';line(ctx,plane,true,'#f0a65b80');ctx.fillStyle='#162c3c';ctx.font='16px system-ui';ctx.fillText('Quaderskizze · schematisch',815,100);
  ctx.fillText('x',1000,239);ctx.fillText('y',929,169);ctx.fillText('z',835,153);
  ctx.fillText(`Schnitt: ${view.plane}, ${s.normal} = ${fmt(view.position)} mm`,815,235);
  ctx.strokeStyle='#cad5dd';ctx.strokeRect(805,252,275,535);ctx.font='17px system-ui';
  const text=(value:string,y:number)=>ctx.fillText(value,818,y,250);
  text(p.material,277);text(`${p.size.map(fmt).join(' × ')} mm`,303);
  text(`λ = ${fmt(p.conductivity)} W/(m K)`,329);text(`ρ = ${fmt(p.density)} kg/m³`,355);text(`cₚ = ${fmt(p.cp)} J/(kg K)`,381);
  text(`T₀ = ${fmt(p.initial)} °C; T∞ = ${fmt(p.ambient)} °C`,407);text(`Endzeit: ${fmt(p.endTime)} s`,433);
  axes.forEach((axis,i)=>{const y=463+i*86;text(`α${axis}− / α${axis}+ = ${fmt(p.alphas[2*i])} / ${fmt(p.alphas[2*i+1])}`,y);text(`W/(m² K); L${axis} = ${fmt(p.size[i]/2)} mm`,y+24);text(`Bi−/+ = ${fmt(s.bi[2*i])} / ${fmt(s.bi[2*i+1])}`,y+48);text(`Fo${axis} = ${fmt(s.fo[i])}`,y+70);});
  text(`Punkte: ${p.points.join(' × ')}`,743);text(`Terme x/y/z: ${s.terms.join(' / ')}`,771);
}
