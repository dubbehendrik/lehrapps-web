import { describe, it, expect } from 'vitest';
import { unzipSync, strFromU8, strToU8, zipSync } from 'fflate';
import { REFERENCE_BASE64, REFERENCE_NAME } from '../src/apps/duerr-roboter/reference';
import fixture from './duerr-fixture.json';
import { applyPlan, changedBrushes, exportDocument, importDocument, makePlan, patchBrush, readBrush, validate, verifyChanges, type Axis } from '../src/apps/duerr-roboter/logic';
const decode = (s:string) => Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const original = decode(REFERENCE_BASE64), changed = decode(fixture.changed);
const axes:Axis[] = [{key:'BLL1',enabled:true,from:0.5,to:2,count:10},{key:'BLL2',enabled:true,from:1,to:3,count:10}];
describe('Dürr Brush-Dateiformat und Bearbeitung',()=>{
 it('liest die realen Werte der Brushes 1–6 und den Vergleichsexport',()=>{
  expect(readBrush(original,2)).toEqual({BLL1:2,BLL2:expect.closeTo(1.2,5),ML1:60000,FM:300,HV:100});
  expect(readBrush(changed,100)).toEqual({BLL1:1,BLL2:2,ML1:3,FM:4,HV:100});
  expect(changedBrushes(original,changed)).toEqual([100]);
 });
 it('reproduziert den echten Roboterexport bytegenau',()=>{
  expect(patchBrush(original,100,{BLL1:1,BLL2:2,ML1:3,FM:4,HV:100})).toEqual(changed);
 });
 it('exportiert ohne Änderungen bytegleich und erhält Namen, README und Zusatzdateien',()=>{
  const doc=importDocument(REFERENCE_NAME,original);doc.readme='# Versuch\nÄnderung: Oberfläche';doc.user='Dubbe';doc.extras={'Anlage/info.txt':strToU8('beibehalten')};
  const zip=exportDocument(doc,original),files=unzipSync(zip);
  expect(files[REFERENCE_NAME]).toEqual(original);expect(strFromU8(files['README.md'])).toBe(doc.readme);
  const imported=importDocument('Versuch.zip',zip);expect(imported.original).toEqual(original);expect(imported.name).toBe(REFERENCE_NAME);expect(imported.readme).toBe(doc.readme);expect(imported.user).toBe('Dubbe');expect(imported.extras).toEqual(doc.extras);
 });
 it('schützt Anfangsblock, Brushes unter 100 und reservierte Bereiche',()=>{
  for(const n of [0,1,99,501])expect(()=>patchBrush(original,n,{FM:5})).toThrow();
  for(const i of [0,2399,2404,2412]){const bad=original.slice();bad[i]=1;expect(()=>verifyChanges(original,bad)).toThrow();}
  const out=patchBrush(original,500,{FM:900});verifyChanges(original,out);expect(readBrush(out,500).FM).toBe(900);expect(out.length).toBe(12024);
 });
 it('prüft Grenzwerte, NaN, Auflösung und HV-Lücke',()=>{
  for(const n of [1,99,401,-1,NaN,Infinity,100.5])expect(()=>validate('HV',n)).toThrow();
  for(const n of [0,100,400])expect(()=>validate('HV',n)).not.toThrow();
  expect(()=>validate('BLL1',6.01)).toThrow();expect(()=>validate('BLL2',1.001)).toThrow();expect(()=>validate('FM',900.5)).toThrow();
 });
 it('plant gekoppelte Reihen mit zehn Brushes und allen Kombinationen',()=>{
  const paired=makePlan(original,2,100,10,'paired',axes);expect(paired.length).toBe(10);expect(paired[0].values.BLL1).toBe(.5);expect(paired[9].values.BLL1).toBe(2);expect(paired[9].n).toBe(109);expect(paired[0].values.ML1).toBe(60000);
  const grid=makePlan(original,2,401,10,'combinations',axes);expect(grid.length).toBe(100);expect(grid[99].n).toBe(500);expect(new Set(grid.map(r=>`${r.values.BLL1}/${r.values.BLL2}`)).size).toBe(100);
  const out=applyPlan(original,grid);verifyChanges(original,out);expect(changedBrushes(original,out).length).toBe(100);
 });
 it('verwirft Überläufe, ungültige Reihen und falsche Dateien',()=>{
  expect(()=>makePlan(original,2,402,10,'combinations',axes)).toThrow();
  expect(()=>makePlan(original,2,100,10,'paired',[{key:'HV',enabled:true,from:0,to:100,count:10}])).toThrow();
  expect(()=>importDocument(REFERENCE_NAME,new Uint8Array(12000))).toThrow();
  expect(()=>importDocument('x.zip',zipSync({[REFERENCE_NAME]:original, ['BrushData_other']:original}))).toThrow();
  expect(()=>importDocument('x.zip',zipSync({[REFERENCE_NAME]:original, ['../bad']:strToU8('x')}))).toThrow();
 });
 it('ändert bei einer einzelnen Feldänderung keine anderen Werte oder Bytes',()=>{
  const seed=original.slice();seed[2404]=91;seed[2412]=82;
  const out=patchBrush(seed,100,{FM:4});expect(out.slice(0,2422)).toEqual(seed.slice(0,2422));expect(out.slice(2424)).toEqual(seed.slice(2424));verifyChanges(seed,out);
 });
});
