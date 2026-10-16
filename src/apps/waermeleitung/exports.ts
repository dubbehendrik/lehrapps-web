import {axes} from './logic';
import {drawDiagram} from './diagram';
import {download} from '../../lib/download';
import type {Parameters,View,Slice} from './types';
export function exportSheets(p:Parameters,view:View,s:Slice) {
  const parameters:(string|number|boolean)[][]=[['Parameter','Wert','Einheit'],['Material',p.material,''],['Schnittorientierung',view.plane,''],['Schnittposition '+s.normal,view.position,'mm'],['Zeit',view.time,'s'],['Endzeit',p.endTime,'s'],['T₀',p.initial,'°C'],['T∞',p.ambient,'°C'],['λ',p.conductivity,'W/(m K)'],['ρ',p.density,'kg/m³'],['cₚ',p.cp,'J/(kg K)'],['a',p.conductivity/(p.density*p.cp),'m²/s'],['Darstellung',view.smooth?'Bilinear geglättet':'Farbfelder',''],['Genauigkeitsziel erreicht',s.converged,''],['Abschätzung Reihenfehler',Number.isFinite(s.errorBound)?s.errorBound:'nicht begrenzbar','K']];
  axes.forEach((axis,i)=>parameters.push(['Abmessung '+axis,p.size[i],'mm'],['Punkte '+axis,p.points[i],''],['Reihenglieder '+axis,s.terms[i],''],['α'+axis+'−',p.alphas[2*i],'W/(m² K)'],['α'+axis+'+',p.alphas[2*i+1],'W/(m² K)']));
  parameters.push(['Berechnungsverfahren',s.numerical?'Numerische 3D-Wärmeleitung':'Analytische Produktlösung',''],['Wärmestrahlung',!!s.numerical?.radiation,''],['Biot-Zahlen','Nur konvektiver Anteil','']);
  if(p.radiation) {
    parameters.push(['Strahlungsumgebung',p.radiation.ambient,'°C'],['Strahlungsmodell','Große isotherme Umgebung; Sichtfaktor 1; konstante Emissionsgrade','']);
    p.radiation.emissivities.forEach((e,i)=>parameters.push(['ε '+axes[Math.floor(i/2)]+(i%2?'+':'−'),e,'−']));
  }
  if(s.numerical) {
    parameters.splice(parameters.findIndex(r=>r[0]==='Genauigkeitsziel erreicht'),2,['Numerischer Temperaturfehler','Nicht automatisch begrenzt; Gitter-/Zeitschrittvergleich erforderlich','']);
    parameters.push(['Rechengitter',s.numerical.grid.join(' × '),''],['Halbierte Zeitschritte',!!p.radiation?.refinedTime,''],['Zeitschritte',s.numerical.steps,''],['Energieänderung',s.numerical.energyChange,'J'],['Abgegebene Randenergie',s.numerical.boundaryEnergy,'J']);
    for(let i=parameters.length-1;i>=0;i--)if(String(parameters[i][0]).startsWith('Reihenglieder'))parameters.splice(i,1);
  }
  const numbers:(string|number)[][]=[['Richtung','Bezugsgröße halbe Abmessung [mm]','Bi−','Bi+','Fo'],...axes.map((axis,i)=>[axis,p.size[i]/2,s.bi[2*i],s.bi[2*i+1],s.fo[i]])];
  const matrix:(string|number)[][]=[['Temperaturen [°C]; '+s.vertical+' [mm] ↓ / '+s.horizontal+' [mm] →',...s.u],...s.v.map((v,i)=>[v,...s.temperature[i]])];
  return [parameters,numbers,matrix];
}
export async function exportExcel(p:Parameters,view:View,s:Slice,comparison?:Slice) {
  const {default:writeXlsxFile}=await import('write-excel-file/browser');
  const tables=exportSheets(p,view,s),names=['Parameter','Kennzahlen','Aktueller Schnitt'];
  if(comparison) {
    tables[0].push(['Vergleichsschnitt',comparison.numerical?.radiation?'Mit Strahlung':'Ohne Strahlung','']);
    tables.push(exportSheets(p,view,comparison)[2]);names.push('Vergleichsschnitt');
    tables.push([['Differenz Hauptszenario minus Vergleich [K]',...s.u],...s.v.map((v,i)=>[v,...s.temperature[i].map((t,j)=>t-comparison.temperature[i][j])])]);names.push('Differenz');
  }
  await writeXlsxFile(tables.map((data,i)=>({sheet:names[i],data,stickyRowsCount:1}))).toFile('Temperaturverteilung.xlsx');
}
export async function exportPng(p:Parameters,view:View,s:Slice,point:number[]|null=null,comparison?:Slice) {
  const canvas=document.createElement('canvas');drawDiagram(canvas,p,view,s,point);
  let output=canvas;
  if(comparison) {
    const second=document.createElement('canvas');drawDiagram(second,p,view,comparison,point);
    output=document.createElement('canvas');output.width=canvas.width;output.height=canvas.height*2;
    const ctx=output.getContext('2d')!;ctx.drawImage(canvas,0,0);ctx.drawImage(second,0,canvas.height);
  }
  const blob=await new Promise<Blob>((resolve,reject)=>output.toBlob(b=>b?resolve(b):reject(new Error('PNG konnte nicht erstellt werden.')),'image/png'));
  download(blob,'Temperaturverteilung.png');
}
