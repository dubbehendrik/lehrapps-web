import {axes} from './logic';
import {drawDiagram} from './diagram';
import {download} from '../../lib/download';
import type {Parameters,View,Slice} from './types';
export function exportSheets(p:Parameters,view:View,s:Slice) {
  const parameters:(string|number|boolean)[][]=[['Parameter','Wert','Einheit'],['Material',p.material,''],['Schnittorientierung',view.plane,''],['Schnittposition '+s.normal,view.position,'mm'],['Zeit',view.time,'s'],['Endzeit',p.endTime,'s'],['T₀',p.initial,'°C'],['T∞',p.ambient,'°C'],['λ',p.conductivity,'W/(m K)'],['ρ',p.density,'kg/m³'],['cₚ',p.cp,'J/(kg K)'],['a',p.conductivity/(p.density*p.cp),'m²/s'],['Darstellung',view.smooth?'Bilinear geglättet':'Farbfelder',''],['Genauigkeitsziel erreicht',s.converged,''],['Abschätzung Reihenfehler',Number.isFinite(s.errorBound)?s.errorBound:'nicht begrenzbar','K']];
  axes.forEach((axis,i)=>parameters.push(['Abmessung '+axis,p.size[i],'mm'],['Punkte '+axis,p.points[i],''],['Reihenglieder '+axis,s.terms[i],''],['α'+axis+'−',p.alphas[2*i],'W/(m² K)'],['α'+axis+'+',p.alphas[2*i+1],'W/(m² K)']));
  const numbers:(string|number)[][]=[['Richtung','Bezugsgröße halbe Abmessung [mm]','Bi−','Bi+','Fo'],...axes.map((axis,i)=>[axis,p.size[i]/2,s.bi[2*i],s.bi[2*i+1],s.fo[i]])];
  const matrix:(string|number)[][]=[['Temperaturen [°C]; '+s.vertical+' [mm] ↓ / '+s.horizontal+' [mm] →',...s.u],...s.v.map((v,i)=>[v,...s.temperature[i]])];
  return [parameters,numbers,matrix];
}
export async function exportExcel(p:Parameters,view:View,s:Slice) {
  const {default:writeXlsxFile}=await import('write-excel-file/browser');
  const tables=exportSheets(p,view,s),names=['Parameter','Kennzahlen','Aktueller Schnitt'];
  await writeXlsxFile(tables.map((data,i)=>({sheet:names[i],data,stickyRowsCount:1}))).toFile('Temperaturverteilung.xlsx');
}
export async function exportPng(p:Parameters,view:View,s:Slice,point:number[]|null=null) {
  const canvas=document.createElement('canvas');drawDiagram(canvas,p,view,s,point);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG konnte nicht erstellt werden.')),'image/png'));
  download(blob,'Temperaturverteilung.png');
}
