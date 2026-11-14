import {describe,it,expect} from 'vitest';
import {defaults,simulate,sum} from '../src/apps/pulverkreislauf/logic';
describe('Pulverkreislauf',()=>{
it('erhält Gesamtmasse',()=>{const r=simulate(defaults);expect(Math.abs(r.balance)).toBeLessThan(1e-9);expect(sum(r.mass)).toBeCloseTo(defaults.stock,10)});
it('erhält Verteilung ohne Größenselektivität',()=>{const r=simulate({...defaults,selective:false,recover:false,sieve:2000});r.mass.forEach((v,i)=>expect(v/defaults.stock).toBeCloseTo(r.fresh[i],10))});
it('ohne Rückführung entspricht Zugabe dem Pulverstrom',()=>{const r=simulate({...defaults,recycle:0});expect(r.added).toBeCloseTo(defaults.flow*defaults.minutes,8)});
it('blockiert ungültige Parameter',()=>expect(()=>simulate({...defaults,stock:0})).toThrow());
});
