import {describe,it,expect} from 'vitest';
import {defaults,type Parameters} from '../src/apps/waermeleitung/types';
import {pointTemperature} from '../src/apps/waermeleitung/logic';
import {SIGMA,radiationFlux,simulateNumerical,numericalSnapshot,numericalTemperature,fieldEnergy,numericalSlice,numericalAnalysis} from '../src/apps/waermeleitung/radiation';
import {exportSheets} from '../src/apps/waermeleitung/exports';
const parameters=():Parameters=>({...defaults,size:[70,70,5],points:[11,11,11],alphas:[10,10,10,10,10,10],radiation:{enabled:true,ambient:20,emissivities:[.8,.8,.8,.8,.8,.8],resolution:'coarse'},endTime:60});
describe('Nichtlineare Wärmestrahlung / numerische 3D-Wärmeleitung',()=>{
  it('verwendet Kelvin und liefert vorzeichenrichtigen Nettowärmestrom',()=>{
    expect(radiationFlux(126.85,26.85,1)).toBeCloseTo(SIGMA*(400**4-300**4),9);
    expect(radiationFlux(20,180,.8)).toBeCloseTo(-radiationFlux(180,20,.8),10);
    expect(radiationFlux(180,20,0)).toBe(0);
  });
  it('erhält das thermische Gleichgewicht und die adiabatische Anfangstemperatur',()=>{
    const p=parameters();p.initial=20;
    let run=simulateNumerical(p,true,{grid:[5,5,5],outputs:4});
    expect([...run.snapshots.at(-1)!.field].every(t=>Math.abs(t-20)<1e-9)).toBe(true);
    p.initial=180;p.alphas.fill(0);p.radiation!.emissivities.fill(0);
    run=simulateNumerical(p,true,{grid:[5,5,5],outputs:4});
    expect([...run.snapshots.at(-1)!.field].every(t=>Math.abs(t-180)<1e-9)).toBe(true);
  });
  it('liefert bei ε=0 exakt denselben numerischen Verlauf wie ohne Strahlung',()=>{
    const p=parameters();p.radiation!.emissivities.fill(0);
    const a=simulateNumerical(p,true,{grid:[7,7,5],outputs:6}),b=simulateNumerical(p,false,{grid:[7,7,5],outputs:6});
    expect([...a.snapshots.at(-1)!.field]).toEqual([...b.snapshots.at(-1)!.field]);
  });
  it('reproduziert die analytische Robin-Lösung ohne Strahlung einschließlich Oberflächen und Ecken',()=>{
    const p=parameters();p.alphas=[5,25,10,40,15,30];
    const run=simulateNumerical(p,false,{grid:[21,21,9],outputs:6,maxStep:.05});
    for(const time of [10,30,60])for(const point of [[0,0,0],[35,35,2.5],[-35,-35,-2.5],[12,-20,2.5]])
      expect(Math.abs(numericalTemperature(run,numericalSnapshot(run,time),point)-pointTemperature(p,time,point))).toBeLessThan(.25);
  });
  it('bilanziert konvektive und radiative Randenergie gegen die gespeicherte Energie',()=>{
    const p=parameters();p.radiation!.ambient=5;p.alphas=[0,10,30,20,5,50];p.radiation!.emissivities=[0,.3,.7,1,.2,.9];
    const run=simulateNumerical(p,true,{grid:[7,7,5],outputs:6});
    for(const s of run.snapshots)expect(Math.abs(fieldEnergy(run,s.field)-run.initialEnergy+s.boundaryEnergy)).toBeLessThan(1e-6);
  });
  it('kann bei α=0 durch Strahlung heizen und berücksichtigt einzelne Flächen',()=>{
    const p=parameters();p.initial=20;p.ambient=20;p.radiation!.ambient=180;p.alphas.fill(0);p.radiation!.emissivities=[0,1,0,0,0,0];
    const run=simulateNumerical(p,true,{grid:[9,7,5],outputs:6}),s=run.snapshots.at(-1)!;
    expect(numericalTemperature(run,s,[35,0,0])).toBeGreaterThan(numericalTemperature(run,s,[-35,0,0]));
    expect(Math.min(...s.field)).toBeGreaterThanOrEqual(20);expect(Math.max(...s.field)).toBeLessThan(180);
  });
  it('stimmt bei hoher Leitfähigkeit mit unabhängigem RK4-Strahlungsmodell überein',()=>{
    const p=parameters();p.size=[10,10,10];p.conductivity=1000;p.alphas.fill(0);p.endTime=100;
    const run=simulateNumerical(p,true,{grid:[3,3,3],maxStep:.05,outputs:10});
    const f=(t:number)=>-6/(p.density*p.cp*.01)*radiationFlux(t,20,.8);
    let t=p.initial;const dt=.005;
    for(let i=0;i<20000;i++){const a=f(t),b=f(t+dt*a/2),c=f(t+dt*b/2),d=f(t+dt*c);t+=dt*(a+2*b+2*c+d)/6;}
    expect(numericalTemperature(run,run.snapshots.at(-1)!,[0,0,0])).toBeCloseTo(t,1);
  });
  it('zeigt räumliche Konvergenz für schlecht leitenden Quader',()=>{
    const p=parameters();p.size=[20,20,20];p.conductivity=.5;p.alphas.fill(30);p.endTime=20;
    const values=[7,13,25].map(n=>{const r=simulateNumerical(p,true,{grid:[n,n,n],maxStep:.05,outputs:4});return numericalTemperature(r,r.snapshots.at(-1)!,[10,10,10]);});
    expect(Math.abs(values[1]-values[2])).toBeLessThan(Math.abs(values[0]-values[1]));
  });
  it('zeigt zeitliche Konvergenz und interpoliert Schnitt/Profil/Punkt konsistent',()=>{
    const p=parameters();const values=[1,.5,.25].map(maxStep=>{const r=simulateNumerical(p,true,{grid:[7,7,5],maxStep,outputs:1});return numericalTemperature(r,r.snapshots.at(-1)!,[35,35,2.5]);});
    expect(Math.abs(values[1]-values[2])).toBeLessThan(Math.abs(values[0]-values[1]));
    const r=simulateNumerical(p,true,{grid:[7,7,5],outputs:6}),view={plane:'XY' as const,position:2.5,time:12.345,smooth:false};
    const slice=numericalSlice(r,view),point=numericalAnalysis(r,view,[35,35,0]);
    expect(point.position).toEqual([35,35,2.5]);expect(point.temperature).toBe(slice.temperature.at(-1)!.at(-1));
    expect(point.profiles[0].temperature.at(-1)).toBe(point.temperature);
    const sheets=exportSheets(p,view,slice);expect(sheets[0].some(row=>row[0]==='Strahlungsumgebung')).toBe(true);
    expect(sheets[0].some(row=>row[0]==='Abschätzung Reihenfehler')).toBe(false);
  });
  it('weist ungültige Emissionsgrade, Temperaturen und Gitter zurück',()=>{
    const p=parameters();p.radiation!.emissivities[0]=-1;expect(()=>simulateNumerical(p,true)).toThrow('Emissionsgrade');
    p.radiation!.emissivities[0]=1;p.radiation!.ambient=-274;expect(()=>simulateNumerical(p,true)).toThrow('Strahlungsumgebung');
    p.radiation!.ambient=20;expect(()=>simulateNumerical(p,true,{grid:[100,100,100]})).toThrow('Gitter');
  });
  it('berechnet den vollständigen Standardfall und Strahlung senkt bei kalter Umgebung die Temperatur',()=>{
    const p=parameters();p.endTime=600;p.radiation!.resolution='standard';
    const run=simulateNumerical(p,true),s=run.snapshots.at(-1)!;
    expect(run.grid).toEqual([21,21,9]);expect(run.snapshots).toHaveLength(121);
    const t=numericalTemperature(run,s,[0,0,0]);expect(t).toBeLessThan(pointTemperature(p,600,[0,0,0]));expect(t).toBeGreaterThan(20);
    expect(Math.abs(fieldEnergy(run,s.field)-run.initialEnergy+s.boundaryEnergy)).toBeLessThan(1e-5);
  },20000);
});
