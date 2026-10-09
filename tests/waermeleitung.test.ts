import {describe,it,expect} from 'vitest';
import {axisSolution,factor,computeSlice,pointTemperature,validate,solutions} from '../src/apps/waermeleitung/logic';
import {defaults,type Parameters} from '../src/apps/waermeleitung/types';
const p=():Parameters=>({...defaults,size:[...defaults.size],points:[...defaults.points],alphas:[...defaults.alphas]});
describe('Analytische Wärmeleitung im Quader',()=>{
  it('validiert Punktzahlen, negative Alphas und Stoffwerte',()=>{
    for(const mutate of [(v:Parameters)=>v.points[0]=202,(v:Parameters)=>v.points[1]=12.5,(v:Parameters)=>v.alphas[0]=-1,(v:Parameters)=>v.cp=0,(v:Parameters)=>v.size[0]=NaN]) {const v=p();mutate(v);expect(()=>validate(v)).toThrow();}
    const v=p();v.alphas.fill(0);expect(()=>validate(v)).not.toThrow();
  });
  it('liefert t=0 exakt und alle Flächen adiabatisch bei jeder Zeit konstant',()=>{
    const v=p();expect(pointTemperature(v,0,[35,-35,2.5])).toBe(180);
    v.endTime=1800;v.alphas.fill(0);for(const t of [0,.001,100,1800])expect(pointTemperature(v,t,[35,-35,2.5])).toBe(180);
  });
  it('stimmt mit der symmetrischen Plattenreferenz mu*tan(mu)=Bi überein',()=>{
    // Independent half-slab one-term reference, Bi=1: mu1=0.8603335890193797,
    // C1=4*sin(mu)/(2*mu+sin(2mu)); Fo_half=1, full-length Fo=.25.
    const mu=.8603335890193797,c=4*Math.sin(mu)/(2*mu+Math.sin(2*mu));
    const s=axisSolution(2,2,.25,1e-12);
    expect(s.q[0]/2).toBeCloseTo(mu,12);
    for(const x of [0,.25,.5,.75,1])expect(factor(s,x)).toBeCloseTo(c*Math.cos(mu*(2*x-1))*Math.exp(-mu*mu),5);
  });
  it('erfüllt asymmetrische Robin-Randbedingungen und Spiegelung',()=>{
    const b0=.7,b1=4,fo=.03,s=axisSolution(b0,b1,fo,1e-12),reverse=axisSolution(b1,b0,fo,1e-12),eps=1e-6;
    const left=(factor(s,eps)-factor(s,0))/eps,right=(factor(s,1)-factor(s,1-eps))/eps;
    expect(left).toBeCloseTo(b0*factor(s,0),4);expect(right).toBeCloseTo(-b1*factor(s,1),4);
    for(const x of [0,.17,.5,.83,1])expect(factor(s,x)).toBeCloseTo(factor(reverse,1-x),11);
  });
  it('eine adiabatische Seite entspricht einer symmetrischen Halbplatte',()=>{
    const s=axisSolution(0,1,.3,1e-12),symmetric=axisSolution(2,2,.075,1e-12);
    for(const x of [0,.1,.5,1])expect(factor(s,x)).toBeCloseTo(factor(symmetric,.5+x/2),11);
    expect(factor(s,0)).toBeGreaterThan(factor(s,1));
  });
  it('liefert unabhängig von der Schnittwahl dieselbe Temperatur und Kennzahlen mit halber Länge',()=>{
    const v=p();v.size=[50,70,5];v.alphas=[10,20,30,40,0,50];const t=30;
    const xy=computeSlice(v,{plane:'XY',position:0,time:t,smooth:false});
    const xz=computeSlice(v,{plane:'XZ',position:0,time:t,smooth:true});
    expect(xy.temperature[50][50]).toBeCloseTo(xz.temperature[20][50],12);
    expect(xy.bi[0]).toBeCloseTo(10*.025/50,14);expect(xy.bi[4]).toBe(0);
    expect(xy.fo[2]).toBeCloseTo((v.conductivity/(v.density*v.cp))*t/.0025**2,12);
    const coarse={...v,points:[11,11,11] as [number,number,number]};
    expect(computeSlice(coarse,{plane:'XY',position:0,time:t,smooth:false}).temperature[5][5]).toBe(xy.temperature[50][50]);
  });
  it('hält die Energiebilanz d(mean theta)/dFo = -Bi0*theta0-Bi1*theta1 ein',()=>{
    const b0=2,b1=7,t=.1,dt=1e-5;
    const mean=(fo:number)=>{const s=axisSolution(b0,b1,fo,1e-13);return s.q.reduce((acc,q,i)=>acc+s.coefficient[i]*(Math.sin(q-s.phase[i])+Math.sin(s.phase[i]))/q*Math.exp(-q*q*fo),0);};
    const s=axisSolution(b0,b1,t,1e-13);
    expect((mean(t+dt)-mean(t-dt))/(2*dt)).toBeCloseTo(-b0*factor(s,0)-b1*factor(s,1),7);
  });
  it('nähert bei kleinen Bi den konzentrierten Abkühlungsverlauf an',()=>{
    const v=p();v.conductivity=10000;const t=500;
    const rate=v.size.reduce((acc,d,i)=>acc+(v.alphas[2*i]+v.alphas[2*i+1])/(d/1000),0)/(v.density*v.cp);
    expect(pointTemperature(v,t,[0,0,0])).toBeCloseTo(v.ambient+(v.initial-v.ambient)*Math.exp(-rate*t),1);
  });
  it('erreicht Genauigkeitsziel bei frühen Zeiten, meldet Termlimit und bleibt in physikalischen Grenzen',()=>{
    const v=p();v.endTime=1800;v.conductivity=.02;v.density=100;v.cp=1000;
    for(const time of [.01,1,100,1800]) {
      const slice=computeSlice(v,{plane:'XY',position:2.5,time,smooth:false});expect(slice.converged).toBe(true);
      for(const row of slice.temperature)for(const T of row){expect(T).toBeGreaterThanOrEqual(20-.01);expect(T).toBeLessThanOrEqual(180+.01);}
    }
    expect(computeSlice(v,{plane:'XY',position:0,time:1e-12,smooth:false}).converged).toBe(false);
  });
  it('funktioniert auch bei Aufheizung, gleichem T und sehr kleinen Alphas',()=>{
    const v=p();v.initial=20;v.ambient=180;expect(pointTemperature(v,100,[0,0,0])).toBeGreaterThan(20);
    v.initial=180;expect(pointTemperature(v,100,[35,35,2.5])).toBe(180);
    v.ambient=20;v.alphas.fill(1e-10);expect(pointTemperature(v,100,[0,0,0])).toBeCloseTo(180,6);
    expect(solutions(v,100)[0].q[0]).toBeGreaterThan(0);
  });
});

import reference from '../docs/waermeleitung/reference.json';
import {mapBounds,diagramPoint,color} from '../src/apps/waermeleitung/diagram';
import {exportSheets} from '../src/apps/waermeleitung/exports';
it('vergleicht asymmetrische und adiabatische Reihenlösungen mit unabhängigen Finite-Volumen-Referenzen',()=>{
  for(const c of reference.cases){const s=axisSolution(c.b0,c.b1,c.fo,1e-12);c.positions.forEach((x,i)=>expect(Math.abs(factor(s,x)-c.temperatureFactors[i])).toBeLessThan(1e-5));}
});
it('ordnet Klickkoordinaten richtig zu, respektiert Maßstab und exportiert ungerundete Temperaturmatrix',()=>{
  const v=p(),view={plane:'XZ' as const,position:7,time:100,smooth:true};
  const bounds=mapBounds(v,view);expect(bounds.width/bounds.height).toBeCloseTo(14,12);
  const pos=diagramPoint(v,view,bounds.x+bounds.width/2,bounds.y+bounds.height/2)!;
  [0,7,0].forEach((x,i)=>expect(pos[i]).toBeCloseTo(x,12));expect(diagramPoint(v,view,0,0)).toBeNull();
  const s=computeSlice(v,view),sheets=exportSheets(v,view,s);
  expect(sheets[2][21][51]).toBe(s.temperature[20][50]);expect(sheets[1][3][1]).toBe(2.5);
  expect(color(20,20,180)).toEqual([24,67,185]);expect(color(180,20,180)).toEqual([194,32,35]);
});

import {analyzePoint,pointInPlane} from '../src/apps/waermeleitung/logic';
import {fmt,cuboidProjection} from '../src/apps/waermeleitung/diagram';
import {materials} from '../src/apps/waermeleitung/materials';
it('Punktauswahl folgt nur der Normalrichtung; Profile und Temperatur beziehen sich auf denselben Ort',()=>{
  const v=p();v.alphas=[0,100,20,10,0,100];const view={plane:'XY' as const,position:1,time:30,smooth:true};
  expect(pointInPlane(v,view,null)).toBeNull();expect(pointInPlane(v,view,[7,-14,0])).toEqual([7,-14,1]);
  const analysis=analyzePoint(v,view,[7,-14,0]);
  expect(analysis.temperature).toBe(pointTemperature(v,30,[7,-14,1]));
  for(const [i,coordinate] of [[0,7],[1,-14]]){const j=analysis.profiles[i].x.findIndex(x=>Math.abs(x-coordinate)<1e-10);expect(j).toBeGreaterThanOrEqual(0);expect(analysis.profiles[i].temperature[j]).toBeCloseTo(analysis.temperature,12);}
  expect(analyzePoint(v,{...view,position:0},[0,0,0]).temperature).toBe(pointTemperature(v,30,[0,0,0]));
});
it('formatiert relevante kleine Werte ohne Rechenwerte zu runden',()=>{
  expect(fmt(12.12342354)).toBe('12,1');expect(fmt(.0009)).toBe('0,0009');expect(fmt(.123456)).toBe('0,1235');expect(fmt(-12.123)).toBe('-12,1');expect(fmt(12)).toBe('12');expect(fmt(0)).toBe('0');expect(fmt(.0000009)).toContain('9');
});
it('zeichnet Würfel und Blech mit gleichen Maßstäben in allen Achsen',()=>{
  for(const size of [[70,70,70],[70,70,5]]){const project=cuboidProjection(size),o=project([0,0,0]);const lengths=size.map((d,i)=>{const pos=[0,0,0];pos[i]=d;const e=project(pos);return Math.hypot(e[0]-o[0],e[1]-o[1]);});expect(lengths[0]/lengths[1]).toBeCloseTo(1,12);expect(lengths[0]/lengths[2]).toBeCloseTo(size[0]/size[2],12);}
});
it('verwendet die vorgegebenen Lehrstoffwerte einschließlich Initialisierung',()=>{
  for(const id of ['steel','stainless']){const m=materials.find(m=>m.id===id)!;expect(m.cp).toBe(477);expect(m.density).toBe(7850);}
  expect(materials.find(m=>m.id==='aluminum')?.cp).toBe(888);expect(materials.find(m=>m.id==='aluminum')?.density).toBe(2700);expect(defaults.cp).toBe(477);
});
