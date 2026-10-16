import {it,expect,vi} from 'vitest';
import {defaults} from '../src/apps/waermeleitung/types';

it('liefert beide Szenarien mit synchronen Profilen und Kurven aus dem Worker und wechselt zurück zur Analytik',async()=>{
  const messages:Record<string,any>[]=[];
  const target={onmessage:null as unknown as (e:{data:unknown})=>void,postMessage:(message:Record<string,any>)=>messages.push(message)};
  vi.stubGlobal('self',target);
  try {
    await import('../src/apps/waermeleitung/worker');
    const p={...defaults,points:[11,11,11],endTime:10,radiation:{...defaults.radiation!,enabled:true,resolution:'coarse'}};
    const view={plane:'XY',position:2.5,time:5,smooth:false},point=[0,0,2.5];
    target.onmessage({data:{id:1,p,view,point,compare:true,curve:true}});
    const a=messages.at(-1)!;expect(a.error).toBeUndefined();expect(a.id).toBe(1);
    expect(a.slice.numerical.radiation).toBe(true);expect(a.comparison.slice.numerical.radiation).toBe(false);
    expect(a.slice.numerical.grid).toEqual(a.comparison.slice.numerical.grid);
    expect(a.analysis.temperature).toBe(a.slice.temperature[5][5]);
    expect(a.history.map((r:any)=>r.time)).toEqual(a.comparison.history.map((r:any)=>r.time));
    p.radiation.enabled=false;
    target.onmessage({data:{id:2,p,view,point,compare:true,curve:true}});
    const b=messages.at(-1)!;expect(b.slice.temperature).toEqual(a.comparison.slice.temperature);expect(b.comparison.slice.temperature).toEqual(a.slice.temperature);
    target.onmessage({data:{id:3,p,view,point,compare:false,curve:true}});
    const c=messages.at(-1)!;expect(c.error).toBeUndefined();expect(c.slice.numerical).toBeUndefined();expect(c.comparison).toBeNull();expect(c.history).toHaveLength(121);
    target.onmessage({data:{id:4,p,view,point:null,compare:true,curve:false}});
    const d=messages.at(-1)!;expect(d.analysis).toBeNull();expect(d.history).toEqual([]);expect(d.comparison.analysis).toBeNull();
  } finally {vi.unstubAllGlobals();}
});
