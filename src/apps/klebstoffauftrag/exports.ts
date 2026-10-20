import type {Geometry,Process,Simulation} from './types';
import {drawingSvg,drawScene,type Camera} from './drawing';
import {geometryGroups,processFields} from './fields';
import {download} from '../../lib/download';
import {format} from './logic';
export async function exportDrawing(g:Geometry){
 const {jsPDF}=await import('jspdf');await import('svg2pdf.js');
 const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
 for(const [i,part] of (['assembly','body','lid','holder'] as const).entries()){
   if(i)pdf.addPage();
   const svg=new DOMParser().parseFromString(drawingSvg(g,part),'image/svg+xml').documentElement;
   const host=document.createElement('div');host.style.cssText='position:absolute;left:-10000px;top:0;width:1000px;height:780px;pointer-events:none';host.append(svg);document.body.append(host);
   try{await pdf.svg(svg as unknown as SVGSVGElement,{x:22.8,y:5,width:251.3,height:196});}finally{host.remove();}
   pdf.setFontSize(8);pdf.text(`Klebstoffauftrag | ${new Date().toLocaleDateString('de-DE')} | Blatt ${i+1}/5`,10,205);
 }
 pdf.addPage();pdf.setFontSize(15);pdf.text('Parameter und Werkstattabstimmung',12,15);pdf.setFontSize(9);
 let y=26;for(const group of geometryGroups){pdf.setFont('helvetica','bold');pdf.text(group.title,12,y);y+=6;pdf.setFont('helvetica','normal');for(const [key,label,unit]of group.fields){pdf.text(`${label}: ${format(g[key])} ${unit}`,16,y);y+=5;}}
 pdf.text(`Deckelbohrung nominal = Stift: ${format(g.lidOpening)} mm`,16,y);
 pdf.text('Notizen / Passung / Schrauben / Freigabe:',155,28);for(let j=0;j<10;j++)pdf.line(155,38+j*13,280,38+j*13);
 pdf.save('Klebstoffauftrag-Werkstattzeichnung.pdf');
}
export function exportProject(g:Geometry,p:Process){download(new Blob([JSON.stringify({version:2,geometry:g,process:p},null,2)],{type:'application/json'}),'Klebstoffauftrag-Parameter.json');}
export function exportResults(g:Geometry,p:Process,s:Simulation){
 // Geometry groups contain editable values; the linked bore is exported separately.
 const rows=[['Modus',p.mode],['Nassfilm [µm]',String(s.wet)],['Status','Planungsszenario bzw. eingeschränkte LLD-Referenz; keine validierte Ringraumprognose'],...geometryGroups.flatMap(a=>a.fields.map(([k,l,u])=>[`${l} [${u}]`,String(g[k])])),...processFields.map(([k,l,u])=>[`${l} [${u}]`,String(p[k])]),[],['Zeit [s]','Hub [mm]','Füllhöhe [mm]','Rest [ml]','Auftrag [ml]'],...s.frames.filter((_,i)=>i%6===0||i===s.frames.length-1).map(f=>[f.time,f.travel,f.level,f.remaining/1000,f.deposited/1000].map(String)),[],['Position ab oberem Stiftende [mm]','Nassfilm [µm]'],...s.profile.map(v=>[String(v.z),String(v.wet)])];
 rows.unshift(['Bauart','Deckel fest an Edelstahlaufnahme; nur offener Reservoirkörper bewegt'],['Deckelbohrung nominal [mm]',String(g.lidOpening)]);
 download(new Blob(['\uFEFF'+rows.map(r=>r.map(x=>'"'+x.replaceAll('"','""')+'"').join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}),'Klebstoffauftrag-Ergebnisse.csv');
}
export function renderCombined(canvas:HTMLCanvasElement,g:Geometry,s:Simulation,time:number,camera:Camera,exaggeration:number){
 const frame=s.frames[Math.min(s.frames.length-1,Math.round(time/s.frames.at(-1)!.time*(s.frames.length-1)))];
 const ctx=canvas.getContext('2d')!;canvas.width=1600;canvas.height=900;ctx.fillStyle='#f3f6f8';ctx.fillRect(0,0,1600,900);
 ctx.fillStyle='#162c3c';ctx.font='bold 26px system-ui';ctx.fillText('Klebstoffauftrag · Vorrichtungsplanung',28,40);
 ctx.font='17px system-ui';ctx.fillText('Planungsszenario: Filmdicke vorgegeben; keine validierte Schichtdickenprognose',28,72);
 const temp=document.createElement('canvas');temp.width=800;temp.height=760;
 for(const [i,kind]of(['2d','3d'] as const).entries()){drawScene(temp,g,s,frame,kind,camera,exaggeration);ctx.drawImage(temp,i*800,90);}
 ctx.font='17px system-ui';ctx.fillStyle='#162c3c';ctx.fillText(`Nassfilm ${format(s.wet)} µm | Ausgangsvorlage ${format(s.initialVolume/1000)} ml | Rest ${format(frame.remaining/1000)} ml`,28,880);
}
export async function exportImage(g:Geometry,s:Simulation,time:number,camera:Camera,exaggeration:number){const c=document.createElement('canvas');renderCombined(c,g,s,time,camera,exaggeration);const b=await new Promise<Blob>((res,rej)=>c.toBlob(b=>b?res(b):rej(Error('PNG-Export fehlgeschlagen.'))));download(b,'Klebstoffauftrag.png');}
export function videoMime(){if(typeof MediaRecorder==='undefined')return null;return['video/mp4;codecs=avc1.42E01E','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m))??null;}
export async function exportVideo(g:Geometry,s:Simulation,camera:Camera,exaggeration:number,onProgress:(v:number)=>void,signal:AbortSignal){
 const mime=videoMime();if(!mime)throw Error('Dieser Browser bietet keinen unterstützten Videoencoder. Bitte PNG verwenden oder einen aktuellen Desktop-Browser nutzen.');
 const c=document.createElement('canvas');renderCombined(c,g,s,0,camera,exaggeration);
 if(!c.captureStream)throw Error('Videoaufnahme von Canvas wird in diesem Browser nicht unterstützt.');
 const stream=c.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5_000_000});
 const chunks:BlobPart[]=[];const recorded=new Promise<Blob>((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>resolve(new Blob(chunks,{type:mime}));recorder.onerror=()=>reject(Error('Videoaufnahme fehlgeschlagen.'));});
 let raf=0;
 try{
 recorder.start();const duration=Math.max(6,s.frames.at(-1)!.time),start=performance.now();
 await new Promise<void>((resolve,reject)=>{
   const abort=()=>{cancelAnimationFrame(raf);reject(new DOMException('Export abgebrochen.','AbortError'));};signal.addEventListener('abort',abort,{once:true});
   const tick=(now:number)=>{if(signal.aborted)return abort();const progress=Math.min(1,(now-start)/(duration*1000));renderCombined(c,g,s,progress*s.frames.at(-1)!.time,camera,exaggeration);onProgress(progress);if(progress<1)raf=requestAnimationFrame(tick);else{signal.removeEventListener('abort',abort);resolve();}};raf=requestAnimationFrame(tick);
 });
 recorder.stop();const blob=await recorded;if(signal.aborted)throw new DOMException('Export abgebrochen.','AbortError');download(blob,`Klebstoffauftrag.${mime.startsWith('video/mp4')?'mp4':'webm'}`);
 }finally{cancelAnimationFrame(raf);if(recorder.state!=='inactive')recorder.stop();stream.getTracks().forEach(t=>t.stop());}
}

