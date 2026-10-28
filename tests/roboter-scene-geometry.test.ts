import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { INITIAL, simulate, section } from '../src/apps/roboter-bahnplanung/model';
import { tcpPathPoint, tcpPathMaterial, sheetPoint, sectionPlane, sectionCurve, SHEET_FRONT } from '../src/apps/roboter-bahnplanung/robot/scene-model';
const r=simulate(INITIAL);
describe('TCP-Bahn und räumliche Schnitte',()=>{
 it('zeichnet die TCP-Bahn auf der Zielfläche und nicht auf der um den Spritzabstand versetzten Glockenebene',()=>{
   for(const distance of [150,200,250]){
     const result={...r,config:{...r.config,brush:{...r.config.brush,distance}}};
     const p={u:123,v:234},tcp=tcpPathPoint(result,p);
     expect(tcp.x).toBe(SHEET_FRONT);expect(tcp.distanceTo(sheetPoint(result,p))).toBe(0);
     expect(tcp.distanceTo(sheetPoint(result,p,distance/1000))).toBeCloseTo(distance/1000,12);
   }
 });
 it('hält die Bahn im Vordergrund, ohne den geometrischen TCP zur Lackoberseite zu verschieben',()=>{
   const material=tcpPathMaterial(0xff0000);
   expect(material.depthTest).toBe(false);expect(material.depthWrite).toBe(false);
   material.dispose();
 });
 it.each(['u','v'] as const)('erzeugt eine echte Schnittebene entlang %s am ausgewählten Ort',axis=>{
   const p=sectionPlane(r,axis,120,80);
   expect(p).toHaveLength(4);expect(p[0].x).toBe(SHEET_FRONT);expect(p[2].x).toBeCloseTo(SHEET_FRONT-.08,12);
   const normal=new T.Vector3().crossVectors(p[1].clone().sub(p[0]),p[3].clone().sub(p[0]));
   expect(normal.length()).toBeGreaterThan(0);
   if(axis==='u'){p.forEach(v=>expect(v.z).toBeCloseTo(sheetPoint(r,{u:0,v:120}).z,12));}
   else {p.forEach(v=>expect(v.y).toBeCloseTo(sheetPoint(r,{u:120,v:0}).y,12));}
 });
 it.each(['u','v'] as const)('stellt im 3D-Schnitt %s exakt die Werte des numerischen 2D-Schnitts dar',axis=>{
   const values=r.frames[80].values,cut=117,expected=section(r,values,axis,cut),curve=sectionCurve(r,values,axis,cut,r.max,80);
   expect(curve).toHaveLength(expected.length);
   curve.forEach((p,i)=>expect((SHEET_FRONT-p.x)/.08*r.max).toBeCloseTo(expected[i],6));
 });
 it('behält bei Zeit null eine endliche Schnittebene und eine ebene Nullkurve',()=>{
   const points=sectionCurve(r,r.frames[0].values,'u',200,r.max,80);
   points.forEach(p=>{expect(p.x).toBe(SHEET_FRONT);expect(p.toArray().every(Number.isFinite)).toBe(true);});
 });
});
