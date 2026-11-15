import {describe,it,expect} from 'vitest';
import {defaults,simulate,sum} from '../src/apps/pulverkreislauf/logic';
describe('Pulverkreislauf',()=>{
 it('erhält Gesamtmasse einschließlich Kabine',()=>{const r=simulate(defaults);expect(Math.abs(r.balance)).toBeLessThan(1e-8);expect(sum(r.mass)).toBeCloseTo(defaults.stock,9);expect(sum(r.wall)).toBeGreaterThan(0);expect(r.history[0].time).toBe(0);expect(sum(r.history[0].wall)).toBe(0)});
 it('erhält Verteilung ohne Selektivität',()=>{const r=simulate({...defaults,selective:false,recover:false,sieve:2000});r.mass.forEach((v,i)=>expect(v/defaults.stock).toBeCloseTo(r.fresh[i],9))});
 it('liefert analytischen stationären Referenzfall',()=>{const p={...defaults,selective:false,recover:false,sieve:2000,wallFraction:0,maxTurns:10};const r=simulate(p);expect(r.steadyTurns).not.toBeNull();expect(r.deposited).toBeCloseTo(p.flow*.8*r.time,8);expect(r.added).toBeCloseTo(r.deposited,8)});
 it('ohne Rückführung ist Zugabe gleich versprühter Masse',()=>{const r=simulate({...defaults,recycle:0});expect(r.added).toBeCloseTo(defaults.flow*r.time,8)});
 it('prüft Stationarität beider Bestände und positive Massen',()=>{const r=simulate(defaults);expect(r.steadyTurns).not.toBeNull();expect(r.residual).toBeLessThan(1e-5);for(const h of r.history){expect(Math.min(...h.mass,...h.wall)).toBeGreaterThanOrEqual(0);expect(Math.abs(defaults.stock+h.added-sum(h.mass)-sum(h.wall)-h.deposited-h.lost)).toBeLessThan(1e-8)}});
 it('blockiert ungültige Parameter',()=>expect(()=>simulate({...defaults,stock:0})).toThrow());
});
