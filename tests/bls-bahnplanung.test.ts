import {describe,it,expect} from 'vitest';
import {defaults,brush,kernel,plan,at,consumed,simulate} from '../src/apps/bls-bahnplanung/model';
describe('BLS physics and motion',()=>{
it('normalizes the Gaussian on an unlimited plane',()=>{let sum=0;for(let x=-500;x<500;x+=2)for(let y=-300;y<300;y+=2)sum+=kernel(x,y,defaults)*4;expect(sum).toBeCloseTo(1,5);});
it('round spray and discrete cap rotation',()=>{const p={...defaults,horn:0};expect(brush(p).sx).toBe(brush(p).sy);expect(kernel(20,5,defaults)).toBeCloseTo(kernel(5,20,{...defaults,orientation:90}),10);});
it('distance doubles width without creating volume',()=>{expect(brush({...defaults,distance:300}).sx/brush({...defaults,distance:150}).sx).toBe(2);});
it('stops X during nozzle offset while spraying',()=>{const s=plan(defaults),g=s.find(g=>g.b.phase==='Düsenversatz')!;expect(g.a.x).toBe(g.b.x);expect(g.b.on).toBe(true);expect(g.duration).toBeCloseTo(1.5);expect(at(s,g.start+g.duration/2).y).toBeCloseTo((g.a.y+g.b.y)/2);});
it('sprays while rotating 90 degrees',()=>{const s=plan({...defaults,mode:'cross',passes:2}),g=s.find(g=>g.b.phase==='Werkstück drehen')!;expect(g.b.on).toBe(true);expect(g.b.angle-g.a.angle).toBeCloseTo(Math.PI/2);});
it('counts priming consumption',()=>{expect(consumed(plan(defaults),1,80)).toBeCloseTo(80/60);});
it('zero flow gives zero coating',()=>{const r=simulate({...defaults,q:0});expect(Math.max(...r.frames.at(-1)!.z)).toBe(0);expect(r.frames.at(-1)!.used).toBe(0);});
it('stationary deposition matches analytical center and volume',()=>{const p={...defaults,mode:'spot',spot:2};const r=simulate(p),f=r.frames.at(-1)!;const center=f.z[Math.floor(r.ny/2)*r.nx+Math.floor(r.nx/2)];expect(center).toBeCloseTo(p.q/60*2*1e6*.7*kernel(0,0,p),1);const volume=f.z.reduce((a,b)=>a+b,0)*r.dx*r.dy/1e6;expect(volume).toBeLessThan(f.used);expect(f.used).toBeCloseTo(4);});
it('short overtravel increases edge deposition',()=>{const p={...defaults,spacing:50};const short=simulate({...p,over:0}),long=simulate({...p,over:100});const edge=(r:ReturnType<typeof simulate>)=>{const z=r.frames.at(-1)!.z;return z.reduce((sum,v,i)=>sum+(i%r.nx<3||i%r.nx>r.nx-4?v:0),0);};expect(edge(short)).toBeGreaterThan(edge(long));});
it('caps total withdrawal at syringe capacity',()=>{const r=simulate({...defaults,mode:'spot',q:420,spot:30});expect(r.frames.at(-1)!.used).toBe(100);});
});
