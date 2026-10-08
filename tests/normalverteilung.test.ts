import { describe, expect, it } from 'vitest';
import { normalCdf, normalDensity, intervalProbability, sampleCurve, validateBounds, DEFAULT_BOUNDS } from '../src/apps/normalverteilung/logic';
import references from './references.json';
describe('Python/SciPy comparison for number input and slider', () => {
  it.each(references)('[$a, $b] via $mode', ({ a,b,cdfA,cdfB,probability })=>{
    expect(Math.abs(normalCdf(a)-cdfA)).toBeLessThan(2e-14);
    expect(Math.abs(normalCdf(b)-cdfB)).toBeLessThan(2e-14);
    expect(Math.abs(intervalProbability(a,b)-probability)).toBeLessThan(3e-14);
  });
});
describe('mathematical properties and invalid inputs',()=>{
  it('preserves defaults',()=>expect(DEFAULT_BOUNDS).toEqual({a:-1.96,b:1.96}));
  it('known density and CDF at zero',()=>{expect(normalDensity(0)).toBeCloseTo(0.3989422804014327,14);expect(normalCdf(0)).toBe(0.5)});
  it('symmetry, monotonicity and bounds across grid',()=>{let last=0;for(let i=-600;i<=600;i++){const z=i/100;const p=normalCdf(z);expect(p).toBeGreaterThanOrEqual(last-2e-15);expect(p).toBeGreaterThanOrEqual(0);expect(p).toBeLessThanOrEqual(1);expect(p+normalCdf(-z)).toBeCloseTo(1,14);last=p}});
  it('zero width gives exact zero',()=>expect(intervalProbability(2,2)).toBe(0));
  it.each([[2,-2],[NaN,1],[0,Infinity],[-6.01,1],[0,6.01]])('rejects invalid [%s,%s]',(a,b)=>{expect(validateBounds(a,b)).toBeTruthy();expect(()=>intervalProbability(a,b)).toThrow(RangeError)});
  it('includes exact shaded boundaries, including sub-grid intervals',()=>{const c=sampleCurve(1.0001,1.0002);expect(c.x).toEqual([1.0001,1.0002]);expect(c.density).toEqual(c.x.map(normalDensity))});
  it('includes right plot boundary and bounded grid size',()=>{expect(sampleCurve().x).toHaveLength(12001);expect(sampleCurve().x.at(-1)).toBe(6);expect(()=>sampleCurve(-6,6,1e-9)).toThrow()});
});
