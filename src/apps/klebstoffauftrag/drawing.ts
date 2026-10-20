import {bodyHeight,coneHeight,reservoirHeight,pencilRadius,format,toolPose} from './logic';
import type {Geometry,Simulation,Frame} from './types';
export const colors={steel:'#8094a2',pom:'#dbe4e9',wood:'#d1ad70',glue:'#8a41bd',ink:'#243d50'};
const esc=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export type Part='assembly'|'body'|'lid'|'holder';
export function drawingSvg(g:Geometry,part:Part='assembly',detail=false):string{
 const W=1000,H=780,items:string[]=[];
 const text=(x:number,y:number,t:string,size=17)=>items.push(`<text x="${x}" y="${y}" font-size="${size}" fill="#162c3c">${esc(t)}</text>`);
 const line=(x:number,y:number,x2:number,y2:number,dash=false)=>items.push(`<path d="M${x} ${y}L${x2} ${y2}" fill="none" stroke="#243d50" stroke-width="1.2"${dash?' stroke-dasharray="8 5"':''}/>`);
 const bh=bodyHeight(g),ch=coneHeight(g);
 const isA=part==='assembly';const dh=isA?g.pencilLength+g.holderHeight-g.embedDepth:part==='body'?bh:part==='holder'?g.holderHeight:g.lidThickness;
 const width=part==='holder'?g.holderDiameter:part==='lid'?g.lidDiameter:part==='assembly'?Math.max(g.bodyDiameter,g.lidDiameter,g.holderDiameter):g.bodyDiameter;
 const scale=Math.min(detail?9:5.5,365/Math.max(dh,12),330/width);
 const cx=410,top=172,X=(v:number)=>cx+v*scale,Y=(v:number)=>top+v*scale;
 const poly=(pts:number[][])=>items.push(`<polygon points="${pts.map(([x,y])=>`${X(x)},${Y(y)}`).join(' ')}" fill="url(#hatch)" stroke="#243d50" stroke-width="1.8"/>`);
 const rect=(x:number,z:number,w:number,h:number)=>poly([[x,z],[x+w,z],[x+w,z+h],[x,z+h]]);
 const dimH=(a:number,b:number,z:number,label:string)=>{const y=Y(z);line(X(a),y-9,X(a),y+9);line(X(b),y-9,X(b),y+9);line(X(a),y,X(b),y);text((X(a)+X(b))/2-label.length*4,y-7,label,15);};
 const dimV=(a:number,b:number,x:number,label:string)=>{const xx=X(x);line(xx-7,Y(a),xx+7,Y(a));line(xx-7,Y(b),xx+7,Y(b));line(xx,Y(a),xx,Y(b));text(xx+10,(Y(a)+Y(b))/2+5,label,15);};
 const body=(z:number)=>{const r=g.pencilDiameter/2,b=g.reservoirDiameter/2,o=g.bodyDiameter/2;for(const sign of [-1,1])poly([[sign*b,z],[sign*o,z],[sign*o,z+bh],[sign*r,z+bh],[sign*r,z+g.reservoirDepth+ch],[sign*b,z+g.reservoirDepth]]);};
 const lid=(z:number)=>{for(const sign of [-1,1])rect(sign<0?-g.lidDiameter/2:g.lidOpening/2,z,(g.lidDiameter-g.lidOpening)/2,g.lidThickness);};
 const holder=(z:number)=>{const o=g.holderDiameter/2,r=g.pencilDiameter/2;poly([[-o,z],[o,z],[o,z+g.holderHeight],[r,z+g.holderHeight],[r,z+g.holderHeight-g.embedDepth],[-r,z+g.holderHeight-g.embedDepth],[-r,z+g.holderHeight],[-o,z+g.holderHeight]]);const axis=z+g.holderHeight-g.embedDepth/2,d=g.clampDiameter;
 const sy=Y(axis),left=X(-o),right=X(-r);
 const headX=left-g.clampProjection*scale,span=g.clampHeadSpan*scale/2,half=1.5*scale;
 items.push(`<rect x="${headX}" y="${sy-d*scale/2}" width="${right-headX}" height="${d*scale}" fill="#aebbc4" stroke="#243d50"/>`);
 items.push(`<path d="M${headX-half} ${sy}L${headX-3*scale} ${sy-span}Q${headX+3*scale} ${sy-span} ${headX+half} ${sy}L${headX+3*scale} ${sy+span}Q${headX-3*scale} ${sy+span} ${headX-half} ${sy}Z" fill="#8094a2" stroke="#243d50"/>`);
 text(40,125,`M${format(d)} · Flügelschraube, zwei Flügel`,14);};
 text(40,42,part==='assembly'?'Zusammenbau · Längsschnitt A–A':part==='body'?'POM-Grundkörper · Schnitt und Draufsicht':part==='lid'?'POM-Deckel · Schnitt und Unteransicht':'Edelstahlhalterung · Schnitt und Unteransicht',24);
 text(40,74,'Alle Maße in mm · Maße gelten, Darstellung beim Druck nicht maßstäblich',15);
 let notes:string[]=[];
 if(isA){const bottom=g.holderHeight,pen=bottom-g.embedDepth;holder(0);lid(bottom);body(bottom+g.lidThickness);
   items.push(`<path d="M${X(-g.pencilDiameter/2)} ${Y(pen)}L${X(g.pencilDiameter/2)} ${Y(pen)}L${X(g.pencilDiameter/2)} ${Y(pen+g.pencilLength-g.tipLength)}L${X(0)} ${Y(pen+g.pencilLength)}L${X(-g.pencilDiameter/2)} ${Y(pen+g.pencilLength-g.tipLength)}Z" fill="#d1ad70" stroke="#243d50"/>`);
   dimV(pen,pen+g.pencilLength,-g.bodyDiameter/2-12,`L = ${format(g.pencilLength)}`);dimV(pen,pen+g.freeLength,g.bodyDiameter/2+10,`Kappe ${format(g.freeLength)}`);
   dimH(-g.bodyDiameter/2,g.bodyDiameter/2,-5,`Ø ${format(g.bodyDiameter)}`);
   notes=['Deckel fest mit Edelstahlaufnahme verschraubt; Anlage des Grundkörpers nur am Start.','Nur der oben offene POM-Grundkörper wird nach unten abgezogen.','Senkschrauben von unten durch den Deckel in Gewindesacklöcher der Aufnahme.','Schraubenpaar 90° zur Flügelschraube; Befüllung über radiale Nut im Grundkörper.'];
 } else if(part==='body'){
   body(0);dimV(0,g.reservoirDepth,g.bodyDiameter/2+8,`${format(g.reservoirDepth)}`);dimV(g.reservoirDepth,g.reservoirDepth+ch,g.bodyDiameter/2+18,format(ch));dimV(g.reservoirDepth+ch,bh,g.bodyDiameter/2+8,`${format(g.guideLength)}`);dimV(0,bh,-g.bodyDiameter/2-12,format(bh));dimH(-g.reservoirDiameter/2,g.reservoirDiameter/2,-5,`Ø ${format(g.reservoirDiameter)}`);
   notes=[`Außen Ø${format(g.bodyDiameter)}; Reservoir Ø${format(g.reservoirDiameter)} × ${format(g.reservoirDepth)} tief bis Konusbeginn.`,`Bohrerspitzenwinkel ${format(g.pointAngle)}°; Führungsbohrung Ø${format(g.pencilDiameter)}, axiale Länge ${format(g.guideLength)}.`,`Keine Deckelbefestigung und keine Gewindebohrungen im beweglichen Grundkörper.`,`Dosiernut ${format(g.grooveWidth)} breit × ${format(g.grooveDepth)} tief, radial von außen bis Reservoir.`];
 } else if(part==='lid'){
   lid(0);dimH(-g.lidDiameter/2,g.lidDiameter/2,-5,`Ø ${format(g.lidDiameter)}`);dimV(0,g.lidThickness,g.lidDiameter/2+9,`${format(g.lidThickness)}`);
   notes=[`Feste Schutzscheibe; Bohrung nominal Ø${format(g.lidOpening)} = Stift; reales Spiel abstimmen.`,`2 × Durchgang Ø${format(g.boltDiameter+.5)} auf Lochkreis Ø${format(g.boltCircle)}, gegenüberliegend.`,`Senkung UNTERSEITE: 90°, Planungs-Ø${format(2*g.boltDiameter)} für M${format(g.boltDiameter)}.`,`Senkschrauben von unten in Edelstahlaufnahme; keine Verbindung zum Grundkörper.`];
 } else {
   holder(0);dimH(-g.holderDiameter/2,g.holderDiameter/2,-5,`Ø ${format(g.holderDiameter)}`);dimV(0,g.holderHeight,g.holderDiameter/2+8,`${format(g.holderHeight)}`);dimV(g.holderHeight-g.embedDepth,g.holderHeight,-g.holderDiameter/2-25,`${format(g.embedDepth)}`);
   notes=[`Aufnahme Ø${format(g.pencilDiameter)} × ${format(g.embedDepth)} von unten; seitliche M${format(g.clampDiameter)}-Flügelschraube.`,`2 × M${format(g.boltDiameter)} von UNTEN, nutzbare Tiefe ${format(g.threadDepth)}, Lochkreis Ø${format(g.boltCircle)}.`,`Schraubenpaar 90° zur Flügelschraube; Sackloch-Bohrtiefe in Werkstatt festlegen.`,`Flügelspannweite ${format(g.clampHeadSpan)}; Kopfmitte ${format(g.clampProjection)} vor Wand. Reale Freigängigkeit prüfen.`];
 }
 line(X(0),Y(-8),X(0),Y(dh+8),true);
 if(!isA){const vx=790,vy=285,od=part==='holder'?g.holderDiameter:part==='lid'?g.lidDiameter:g.bodyDiameter,rs=Math.min(2,130/od);
 const circle=(r:number,dash=false)=>items.push(`<circle cx="${vx}" cy="${vy}" r="${r*rs}" fill="none" stroke="#243d50" stroke-width="1.3"${dash?' stroke-dasharray="5 4"':''}/>`);
 circle(od/2);circle((part==='body'?g.reservoirDiameter:part==='lid'?g.lidOpening:g.pencilDiameter)/2);
 if(part==='body'){const half=g.grooveWidth*rs/2;items.push(`<path d="M${vx+g.reservoirDiameter/2*rs} ${vy-half}H${vx+od/2*rs}V${vy+half}H${vx+g.reservoirDiameter/2*rs}" fill="none" stroke="#243d50"/>`);}
 else{circle(g.boltCircle/2,true);for(const sign of [-1,1]){items.push(`<circle cx="${vx}" cy="${vy+sign*g.boltCircle/2*rs}" r="${(part==='lid'?g.boltDiameter+.5:g.boltDiameter)/2*rs}" fill="none" stroke="#243d50"/>`);if(part==='lid')items.push(`<circle cx="${vx}" cy="${vy+sign*g.boltCircle/2*rs}" r="${g.boltDiameter*rs}" fill="none" stroke="#243d50"/>`);}text(680,460,`Lochkreis Ø${format(g.boltCircle)}`,15);}
 line(vx-110,vy,vx+110,vy,true);line(vx,vy-100,vx,vy+110,true);text(650,140,part==='body'?'Draufsicht: offenes Reservoir':part==='lid'?'Unteransicht: Senkungen':'Unteransicht: Gewindebohrungen',15);
 }
 notes.forEach((s,i)=>text(40,600+i*28,s,16));
 text(40,748,'Werkstattentwurf · Passungen, Senkungen und Gewindebohrtiefe vor Fertigung abstimmen.',15);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="780" viewBox="0 0 1000 780"><defs><pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#f5f7f8"/><path d="M0 10L10 0" stroke="#b6c2ca" stroke-width=".8"/></pattern></defs><rect width="1000" height="780" fill="white"/><g font-family="sans-serif">${items.join('')}</g></svg>`;
}
/** Axial portions outside the opaque moving tool, including the conical tip. */
export function exposedPencilRanges(g:Geometry,toolTop:number,toolBottom:number):[number,number][]{
 const exposedStart=g.embedDepth+g.lidThickness;
 return [[exposedStart,Math.min(g.pencilLength,toolTop)],[Math.max(exposedStart,toolBottom),g.pencilLength]].filter(([a,b])=>b>a) as [number,number][];
}
export interface Camera{yaw:number;tilt:number}
export function drawScene(canvas:HTMLCanvasElement,g:Geometry,s:Simulation,f:Frame,kind:'2d'|'3d',camera:Camera={yaw:.65,tilt:.2},exaggeration=1){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
 ctx.save();ctx.scale(w/800,h/760);ctx.font='18px system-ui';ctx.fillStyle=colors.ink;ctx.fillText(kind==='2d'?'Längsschnitt · bewegte POM-Einheit':'3D · sichtbare und verdeckte Kanten',25,32);
 const full=g.pencilLength+s.stroke+g.holderHeight,scale=Math.min(3,590/full),origin=110;
 const pose=toolPose(g,f.travel),top=pose.bodyTop,bottom=pose.bodyBottom,floor=top+reservoirHeight(g),surface=floor-f.level;
 const px=(x:number)=>400+x*scale,py=(z:number)=>origin+z*scale;
 const poly=(pts:number[][],fill:string,stroke=colors.ink)=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke!=='none'){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}};
 if(kind==='2d'){
   const body=(a:number)=>[[a*g.reservoirDiameter/2,top],[a*g.bodyDiameter/2,top],[a*g.bodyDiameter/2,bottom],[a*g.pencilDiameter/2,bottom],[a*g.pencilDiameter/2,floor],[a*g.reservoirDiameter/2,top+g.reservoirDepth]];
   for(const a of [-1,1])poly(body(a).map(([x,z])=>[px(x),py(z)]),colors.pom);
   const pen:[[number,number],...number[][]]=[[-g.pencilDiameter/2,0],[g.pencilDiameter/2,0],[g.pencilDiameter/2,g.pencilLength-g.tipLength],[0,g.pencilLength],[-g.pencilDiameter/2,g.pencilLength-g.tipLength]];
   poly(pen.map(([x,z])=>[px(x),py(z)]),colors.wood);
   if(f.remaining>0)for(const a of [-1,1]){const z0=Math.max(surface,top),z1=floor;const points:number[][]=[];for(let j=0;j<=24;j++){const z=z0+(z1-z0)*j/24;const r=z<=top+g.reservoirDepth?g.reservoirDiameter/2:g.pencilDiameter/2+(floor-z)*Math.tan(g.pointAngle*Math.PI/360);points.push([px(a*r),py(z)]);}points.push([px(a*g.pencilDiameter/2),py(z1)],[px(a*g.pencilDiameter/2),py(z0)]);poly(points,colors.glue);}
   if(f.deposited>0&&f.front>s.start)for(const a of [-1,1]){const pts:number[][]=[];const z1=Math.min(f.front,g.pencilLength);for(let j=0;j<=80;j++){const z=s.start+(z1-s.start)*j/80;pts.push([px(a*(pencilRadius(g,z)+s.wet/1000*exaggeration)),py(z)]);}for(let j=80;j>=0;j--){const z=s.start+(z1-s.start)*j/80;pts.push([px(a*pencilRadius(g,z)),py(z)]);}poly(pts,colors.glue,colors.glue);}
   for(const a of [-1,1]){const x=a<0?-g.lidDiameter/2:g.lidOpening/2;poly([[px(x),py(pose.lidTop)],[px(x+(g.lidDiameter-g.lidOpening)/2),py(pose.lidTop)],[px(x+(g.lidDiameter-g.lidOpening)/2),py(pose.lidBottom)],[px(x),py(pose.lidBottom)]],colors.pom);}
   poly([[px(-g.holderDiameter/2),py(g.embedDepth-g.holderHeight)],[px(g.holderDiameter/2),py(g.embedDepth-g.holderHeight)],[px(g.holderDiameter/2),py(g.embedDepth)],[px(-g.holderDiameter/2),py(g.embedDepth)]],colors.steel);
   const screwY=py(g.embedDepth/2),screwX=px(-g.holderDiameter/2-g.clampProjection),sd=g.clampDiameter*scale,span=g.clampHeadSpan*scale/2;
   ctx.fillStyle=colors.steel;ctx.strokeStyle=colors.ink;ctx.fillRect(screwX,screwY-sd/2,px(-g.pencilDiameter/2)-screwX,sd);ctx.strokeRect(screwX,screwY-sd/2,px(-g.pencilDiameter/2)-screwX,sd);
   poly([[screwX-2*scale,screwY-span],[screwX+2*scale,screwY-span],[screwX+scale,screwY],[screwX+2*scale,screwY+span],[screwX-2*scale,screwY+span],[screwX-scale,screwY]],colors.steel);
   ctx.setLineDash([6,4]);ctx.strokeStyle='#a34c00';ctx.beginPath();ctx.moveTo(px(g.pencilDiameter/2)+5,py(g.freeLength));ctx.lineTo(570,py(g.freeLength));ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#a34c00';ctx.fillText(`Kappgrenze ${format(g.freeLength)} mm`,575,py(g.freeLength)+5);
   ctx.fillStyle=colors.ink;ctx.fillText('Deckel fest',485,py(pose.lidBottom)+25);ctx.fillText('Stift fest',465,py(g.pencilLength*.55));ctx.fillText('Reservoir ↓',465,py(bottom)-5);
 } else {
   // Orthographic engineering view: opaque shells, visible edges solid,
   // buried bores and back lower rims dashed. No intersecting facet mesh.
   const project=(x:number,y:number,z:number):number[]=>{const a=x*Math.cos(camera.yaw)-y*Math.sin(camera.yaw),b=x*Math.sin(camera.yaw)+y*Math.cos(camera.yaw);return[400+scale*a,origin+scale*(z*Math.cos(camera.tilt)+b*Math.sin(camera.tilt))];};
   const edge=(pts:number[][],hidden=false,color=colors.ink)=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=hidden?'#91a2ae':color;ctx.lineWidth=hidden?1:1.25;ctx.setLineDash(hidden?[5,4]:[]);ctx.stroke();ctx.setLineDash([]);};
   const arc=(r:number,z:number,a:number,b:number,hidden=false,color=colors.ink)=>edge(Array.from({length:49},(_,i)=>{const t=a+(b-a)*i/48-camera.yaw;return project(r*Math.cos(t),r*Math.sin(t),z);}),hidden,color);
   const ring=(r:number,z:number,hidden=false,color=colors.ink)=>arc(r,z,0,2*Math.PI,hidden,color);
   const sides=(r:number,z0:number,z1:number,hidden=false)=>{for(const sign of [-1,1])edge([project(sign*r*Math.cos(camera.yaw),-sign*r*Math.sin(camera.yaw),z0),project(sign*r*Math.cos(camera.yaw),-sign*r*Math.sin(camera.yaw),z1)],hidden);};
   const shell=(r:number,z0:number,z1:number,color:string)=>{
     const pts:number[][]=[];
     for(let j=0;j<=48;j++){const t=Math.PI+Math.PI*j/48-camera.yaw;pts.push(project(r*Math.cos(t),r*Math.sin(t),z0));}
     for(let j=0;j<=48;j++){const t=Math.PI*j/48-camera.yaw;pts.push(project(r*Math.cos(t),r*Math.sin(t),z1));}
     poly(pts,color,'none');
     ring(r,z0);arc(r,z1,0,Math.PI);arc(r,z1,Math.PI,2*Math.PI,true);sides(r,z0,z1);
   };
   const rod=(z0:number,z1:number,color:string,r=g.pencilDiameter/2)=>{if(z1<=z0)return;shell(r,z0,z1,color);};
   rod(g.embedDepth,g.pencilLength-g.tipLength,colors.wood);
   if(g.tipLength>0)poly([project(-g.pencilDiameter/2*Math.cos(camera.yaw),g.pencilDiameter/2*Math.sin(camera.yaw),g.pencilLength-g.tipLength),project(g.pencilDiameter/2*Math.cos(camera.yaw),-g.pencilDiameter/2*Math.sin(camera.yaw),g.pencilLength-g.tipLength),project(0,0,g.pencilLength)],colors.wood);
   if(f.deposited>0)rod(s.start,Math.min(f.front,g.pencilLength-g.tipLength),colors.glue,g.pencilDiameter/2+s.wet/1000*exaggeration);
   shell(g.bodyDiameter/2,top,bottom,colors.pom);
   // The moving body's top is OPEN, not a filled disc or moving lid.
   const mouth=Array.from({length:65},(_,j)=>project(g.reservoirDiameter/2*Math.cos(j*Math.PI/32),g.reservoirDiameter/2*Math.sin(j*Math.PI/32),top));
   poly(mouth,'#ffffff');
   if(f.remaining>0){ctx.save();ctx.beginPath();mouth.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();const r=surface<=top+g.reservoirDepth?g.reservoirDiameter/2:g.pencilDiameter/2+(floor-surface)*Math.tan(g.pointAngle*Math.PI/360);poly(Array.from({length:65},(_,j)=>project(r*Math.cos(j*Math.PI/32),r*Math.sin(j*Math.PI/32),surface)),colors.glue,colors.glue);ctx.restore();}
   // Reservoir and conical transition; a guide bore continues to the bottom face.
   ring(g.reservoirDiameter/2,top);ring(g.reservoirDiameter/2,top+g.reservoirDepth,true);
   sides(g.reservoirDiameter/2,top,top+g.reservoirDepth,true);
   ring(g.pencilDiameter/2,floor,true);ring(g.pencilDiameter/2,bottom,true);sides(g.pencilDiameter/2,floor,bottom,true);
   for(const sign of [-1,1])edge([project(sign*g.reservoirDiameter/2*Math.cos(camera.yaw),-sign*g.reservoirDiameter/2*Math.sin(camera.yaw),top+g.reservoirDepth),project(sign*g.pencilDiameter/2*Math.cos(camera.yaw),-sign*g.pencilDiameter/2*Math.sin(camera.yaw),floor)],true);
   if(f.remaining>0){const r=surface<=top+g.reservoirDepth?g.reservoirDiameter/2:g.pencilDiameter/2+(floor-surface)*Math.tan(g.pointAngle*Math.PI/360);ring(r,surface,true,colors.glue);}
   shell(g.lidDiameter/2,pose.lidTop,pose.lidBottom,'#c8d5de');ring(g.lidOpening/2,pose.lidTop);ring(g.lidOpening/2,pose.lidBottom,true);sides(g.lidOpening/2,pose.lidTop,pose.lidBottom,true);
   // Repaint each exposed axial portion after the opaque shells, including
   // the cone. Previously only the cylindrical shaft was repainted.
   const coneSegment=(a:number,b:number)=>{const ra=pencilRadius(g,a),rb=pencilRadius(g,b);poly([project(-ra*Math.cos(camera.yaw),ra*Math.sin(camera.yaw),a),project(ra*Math.cos(camera.yaw),-ra*Math.sin(camera.yaw),a),project(rb*Math.cos(camera.yaw),-rb*Math.sin(camera.yaw),b),project(-rb*Math.cos(camera.yaw),rb*Math.sin(camera.yaw),b)],colors.wood);};
   for(const [a,b] of exposedPencilRanges(g,top,bottom)){
     rod(a,Math.min(b,g.pencilLength-g.tipLength),colors.wood);
     if(f.deposited>0)rod(Math.max(a,s.start),Math.min(b,f.front,g.pencilLength-g.tipLength),colors.glue,g.pencilDiameter/2+s.wet/1000*exaggeration);
     const ca=Math.max(a,g.pencilLength-g.tipLength);if(g.tipLength>0&&b>ca)coneSegment(ca,b);
   }
   shell(g.holderDiameter/2,g.embedDepth-g.holderHeight,g.embedDepth,colors.steel);
   ring(g.pencilDiameter/2,0,true);ring(g.pencilDiameter/2,g.embedDepth,true);sides(g.pencilDiameter/2,0,g.embedDepth,true);
   // Fixed pair: 90 degrees to the radial clamping screw. Heads face down.
   for(const angle of [Math.PI/2,3*Math.PI/2]){const x=g.boltCircle/2*Math.cos(angle),y=g.boltCircle/2*Math.sin(angle);const ellipse=(r:number,z:number)=>edge(Array.from({length:49},(_,j)=>project(x+r*Math.cos(j*Math.PI/24),y+r*Math.sin(j*Math.PI/24),z)),true);ellipse(g.boltDiameter,pose.lidBottom);ellipse(g.boltDiameter/2,pose.lidTop-g.threadDepth);for(const sign of [-1,1])edge([project(x+sign*g.boltDiameter/2,y,pose.lidBottom),project(x+sign*g.boltDiameter/2,y,pose.lidTop-g.threadDepth)],true);}
   // Ordinary two-wing head on the radial M4 clamping screw.
   const sy=g.embedDepth/2,headX=-g.holderDiameter/2-g.clampProjection,screwA=project(headX,0,sy),wall=project(-g.holderDiameter/2,0,sy),screwB=project(-g.pencilDiameter/2,0,sy),hiddenScrew=-Math.sin(camera.yaw)<0;
   edge([wall,screwB],true);edge([screwA,wall],hiddenScrew);
   const span=g.clampHeadSpan/2,d=g.clampDiameter/2,wing=[project(headX,-d,sy-span),project(headX,d,sy-span),project(headX,d/4,sy),project(headX,d,sy+span),project(headX,-d,sy+span),project(headX,-d/4,sy)];
   if(hiddenScrew)edge([...wing,wing[0]],true);else poly(wing,colors.steel);
   ctx.fillStyle=colors.ink;ctx.fillText('Aufnahme + Deckel fest · M'+format(g.clampDiameter),450,70);
   ctx.fillStyle='#a34c00';const cap=project(g.holderDiameter/2,0,g.freeLength);ctx.setLineDash([5,4]);ctx.strokeStyle='#a34c00';ctx.beginPath();ctx.moveTo(cap[0]+5,cap[1]);ctx.lineTo(570,cap[1]);ctx.stroke();ctx.setLineDash([]);ctx.fillText('Kappgrenze '+format(g.freeLength)+' mm',575,cap[1]+5);

 }
 // Schematic fixed stand.
 ctx.strokeStyle=colors.steel;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(180,75);ctx.lineTo(180,650);ctx.moveTo(145,650);ctx.lineTo(220,650);const mountY=origin+scale*(g.embedDepth-g.holderHeight/2)*(kind==='3d'?Math.cos(camera.tilt):1);ctx.moveTo(180,mountY);ctx.lineTo(px(-g.holderDiameter/2),mountY);ctx.stroke();ctx.lineWidth=1;
 ctx.fillStyle=colors.ink;ctx.font='17px system-ui';ctx.fillText(`t = ${format(f.time)} s · Hub ${format(f.travel)} mm`,25,695);ctx.fillText(`Reservoir ${format(f.remaining/1000)} ml · Film ${exaggeration}× dargestellt`,25,724);ctx.restore();
}

