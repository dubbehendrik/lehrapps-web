import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import type { Project } from './types';
import { SIZE, validCorners } from './logic';
export function encodeProject(project:Project) {
 const files:Record<string,Uint8Array>={};
 const shots=project.shots.map((s,i)=>{
 const [header,b64]=s.dataUrl.split(',');files[`images/${i}.bin`]=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
 if(s.baseMask)files[`basemasks/${i}.bin`]=new Uint8Array(s.baseMask);
 if(s.mask)files[`masks/${i}.bin`]=new Uint8Array(s.mask);
 return {...s,dataUrl:undefined,mask:undefined,baseMask:undefined,baseMaskPath:s.baseMask?`basemasks/${i}.bin`:undefined,path:`images/${i}.bin`,mime:header.slice(5,header.indexOf(';')),maskPath:s.mask?`masks/${i}.bin`:undefined};
 });
 files['project.json']=strToU8(JSON.stringify({...project,shots}));return zipSync(files);
}
export function decodeProject(bytes:Uint8Array):Project {
 if(bytes.length>150*1024*1024)throw Error('Projekt überschreitet 150 MB.');
 let total=0;const files=unzipSync(bytes,{filter:e=>{total+=e.originalSize;if(total>250*1024*1024)throw Error('Entpacktes Projekt überschreitet 250 MB.');return true}});
 if(!files['project.json'])throw Error('Projektbeschreibung fehlt.');
 const p=JSON.parse(strFromU8(files['project.json']));
 if(p.format!=='gitterschnitt'||p.version!==1||typeof p.name!=='string'||!Array.isArray(p.shots)||p.shots.length>500)throw Error('Ungültiges Projektformat.');
 const ids=new Set();
 const gt=(v:unknown)=>v===undefined||(Number.isInteger(v)&&Number(v)>=0&&Number(v)<=5);
 for(const s of p.shots){
 if(!s||![s.id,s.name,s.component,s.position,s.tool,s.removal,s.notes,s.comment].every(v=>typeof v==='string')||ids.has(s.id)||!files[s.path]||!/^image\/(jpeg|png|webp)$/.test(s.mime)||!Number.isInteger(s.width)||!Number.isInteger(s.height)||s.width<1||s.height<1||s.width*s.height>16000000||!validCorners(s.corners)||s.corners.some((a:{x:number;y:number})=>a.x<0||a.x>1||a.y<0||a.y>1)||![1,2,3].includes(s.spacing)||!['hard','soft'].includes(s.substrate)||!Number.isFinite(s.thickness)||s.thickness<=0||!Number.isFinite(s.tolerance)||s.tolerance<1||s.tolerance>100||!Number.isFinite(s.kerf)||s.kerf<0||s.kerf>10||!gt(s.blind)||!gt(s.final)||typeof s.revealed!=='boolean'||typeof s.synthetic!=='boolean'||(s.revealed&&s.blind===undefined))throw Error('Ungültige Aufnahme oder Geometrie.');
 if(s.gridStatus!==undefined&&!['suggested','not-found','manual'].includes(s.gridStatus))throw Error('Ungültiger Gitterstatus.');
 ids.add(s.id);
 for(const refs of [s.coat,s.bare])if(!Array.isArray(refs)||refs.length>100||refs.some((r:unknown)=>!Array.isArray(r)||r.length!==3||r.some(v=>!Number.isFinite(v)||v<0||v>255)))throw Error('Ungültige Farbreferenzen.');
 if(s.dirty!==undefined&&typeof s.dirty!=='boolean')throw Error('Ungültiger Speicherstatus.');
 for(const [refs,points] of [[s.coat,s.coatPoints],[s.bare,s.barePoints]])if(points!==undefined&&(!Array.isArray(points)||points.length!==refs.length||points.some((a:any)=>a!==null&&(!a||!Number.isFinite(a.x)||!Number.isFinite(a.y)||a.x<0||a.x>1||a.y<0||a.y>1))))throw Error('Ungültige Referenzpunkte.');
 if(s.savedResult){const r=s.savedResult;if(![r.component,r.position,r.name,r.comment].every(v=>typeof v==='string')||![r.blind,r.proposal,r.final].every(v=>v!==undefined&&gt(v))||!Number.isFinite(r.percent)||r.percent<0||r.percent>100)throw Error('Ungültiger übernommener Ergebnisstand.');}
 if(s.maskPath){const m=files[s.maskPath];if(!m||m.length!==SIZE*SIZE||m.some(v=>v>3))throw Error('Ungültige Maske.');s.mask=Array.from(m);}
 if(s.baseMaskPath){const m=files[s.baseMaskPath];if(!m||m.length!==SIZE*SIZE||m.some(v=>v>3))throw Error('Ungültige Ausgangsmaske.');s.baseMask=Array.from(m);}
 let binary='';for(const b of files[s.path])binary+=String.fromCharCode(b);s.dataUrl=`data:${s.mime};base64,${btoa(binary)}`;
 delete s.path;delete s.mime;delete s.maskPath;delete s.baseMaskPath;
 }return p;
}
