import {describe,it,expect} from 'vitest';
import {calculate,defaults,newtonPoint,powerPoint} from '../src/apps/filmstroemung-glockenteller/logic';
describe('Filmströmung',()=>{
 it('reproduziert Vorlesungswerte am Rand und konvergierten Python-Ansatz',()=>{
 const r=calculate(defaults);expect(r.converged).toBe(true);
 expect(r.newton.at(-1)!.thickness*1e6).toBeCloseTo(29.303091,5);
 expect(r.history.at(-1)!.points.at(-1)!.thickness*1e6).toBeCloseTo(8.011619,4);
 expect(r.history.at(-1)!.points.at(-1)!.viscosity*1000).toBeCloseTo(5.109289,4);
 expect(r.newton[0].r).toBe(.003);expect(r.newton.at(-1)!.r).toBe(.0275);
 });
 it('reproduziert das hochgeladene Python-Skript bei 150 ml/min',()=>{
 const a={...defaults,flow:150,innerRadius:2.75,diameter:49.30750000000005};const r=calculate(a);
 expect(r.history.at(-1)!.points[0].thickness*1e6).toBeCloseTo(41.62829532,4);
 expect(r.history.at(-1)!.points.at(-1)!.thickness*1e6).toBeCloseTo(7.73575277,4);
 });
 it('reduziert das Potenzgesetz bei p=1 auf Newton',()=>{
 const a={...defaults,p:1,k:250};const n=newtonPoint(a,.02),p=powerPoint(a,.02);
 for(const key of ['thickness','mean','max','wallShear','viscosity'] as const)expect(p[key]).toBeCloseTo(n[key],9);
 });
 it('erfüllt Massenbilanz und integriertes Potenzgesetz',()=>{
 const a=defaults,r=.02,v=powerPoint(a,r),A=a.density*(2*Math.PI*a.speed/60)**2*r*Math.sin(a.angle*Math.PI/180);
 const q=a.p/(2*a.p+1)*(A/(a.k/1000))**(1/a.p)*v.thickness**((2*a.p+1)/a.p);
 expect(q/(a.flow*1e-6/60/(2*Math.PI*r))).toBeCloseTo(1,10);
 expect(v.mean*2*Math.PI*r*v.thickness/(a.flow*1e-6/60)).toBeCloseTo(1,10);
 });
 it('ist vom Startwert unabhängig und meldet Iterationsgrenze',()=>{
 const a=calculate({...defaults,viscosity:10}),b=calculate(defaults);
 expect(a.history.at(-1)!.points.at(-1)!.thickness/b.history.at(-1)!.points.at(-1)!.thickness).toBeCloseTo(1,5);
 expect(calculate(defaults,20,1e-6,1).converged).toBe(false);
 });
 it('weist ungültige Eingaben zurück',()=>{for(const a of [{...defaults,flow:0},{...defaults,p:NaN},{...defaults,angle:0},{...defaults,innerRadius:30}])expect(()=>calculate(a)).toThrow();});
});
