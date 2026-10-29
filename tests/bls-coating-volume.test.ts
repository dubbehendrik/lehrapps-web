import { describe, it, expect } from 'vitest';
import { coatingVolume } from '../src/apps/bls-bahnplanung/coatingVolume';
describe('BLS closed coating visualization', () => {
  it('has every edge shared by two oppositely wound triangles', () => {
    const { indices } = coatingVolume(200,100,3,2,new Float32Array([1,2,3,4,5,6]),500);
    const edges = new Map<string, number[]>();
    for(let i=0;i<indices.length;i+=3) for(let j=0;j<3;j++) {
      const a=indices[i+j],b=indices[i+(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');
      edges.set(key,[...(edges.get(key)||[]),a<b?1:-1]);
    }
    for(const directions of edges.values()) { expect(directions.length).toBe(2);expect(directions[0]+directions[1]).toBe(0); }
  });
  it('encloses the expected exaggerated uniform volume without changing its input', () => {
    const values=new Float32Array(6).fill(20), { positions:p, indices:f }=coatingVolume(200,100,3,2,values,500);
    let volume=0;
    for(let i=0;i<f.length;i+=3) {const a=f[i]*3,b=f[i+1]*3,c=f[i+2]*3;
      volume+=(p[a]*(p[b+1]*p[c+2]-p[b+2]*p[c+1])+p[a+1]*(p[b+2]*p[c]-p[b]*p[c+2])+p[a+2]*(p[b]*p[c+1]-p[b+1]*p[c]))/6;
    }
    expect(volume).toBeCloseTo(200*100*10,5); expect([...values]).toEqual([20,20,20,20,20,20]);
    expect([...coatingVolume(200,100,3,2,values,0).positions].filter((_,i)=>i%3===1).every(y=>y===2)).toBe(true);
  });
});
