import { describe,it,expect } from 'vitest';
import { calculate, defaults, diagramPoint } from '../src/apps/zerfallsarten/logic';
import references from './zerfallsarten-references.json';
describe('Rotationsglocke: Python-Referenzen',()=>{
 for(const [i,reference] of references.entries()) it(`Referenzfall ${i+1}`,()=>{
  const r=calculate(reference.parameters);
  for(const [key,value] of Object.entries(reference.expected)) expect(Math.abs(r[key as keyof typeof reference.expected]/value-1)).toBeLessThan(1e-12);
  expect(r.point.x).toBeCloseTo(reference.point.x,10);expect(r.point.y).toBeCloseTo(reference.point.y,10);
 });
 it('Kalibrierung der logarithmischen Achsen',()=>{
  expect(diagramPoint(1e-4,1e-2)).toEqual({x:170,y:601,inside:true});
  expect(diagramPoint(1,3).x).toBe(1050);expect(diagramPoint(1,3).y).toBeCloseTo(50,10);
  expect(diagramPoint(1e-5,1).inside).toBe(false);expect(diagramPoint(1,4).inside).toBe(false);
 });
 for(const key of Object.keys(defaults) as (keyof typeof defaults)[]) for(const value of [0,-1,NaN,Infinity]) it(`Verwirft ${key} = ${value}`,()=>expect(()=>calculate({...defaults,[key]:value})).toThrow());
 it('Verwirft 180 Grad und leere Diagrammwerte',()=>{expect(()=>calculate({...defaults,angle:180})).toThrow();expect(()=>diagramPoint(0,1)).toThrow();});
 it('Skalierung von Drehzahl und Volumenstrom',()=>{
  const a=calculate(defaults),n=calculate({...defaults,speed:80000}),v=calculate({...defaults,flow:100});
  expect(n.we/a.we).toBeCloseTo(4,12);expect(n.b/a.b).toBeCloseTo(2,12);expect(n.thickness/a.thickness).toBeCloseTo(2**(-2/3),12);
  expect(v.kb/a.kb).toBeCloseTo(4,12);expect(v.thickness/a.thickness).toBeCloseTo(Math.cbrt(2),12);
 });
});
