import {describe,it,expect} from 'vitest';
import {fit,acquisition,candidates} from '../src/apps/bayes-optimierung/logic';
const f=[{name:'x',unit:'',min:0,max:1}];
describe('Gaußprozess und Versuchsauswahl',()=>{
 it('interpoliert nahezu rauschfreie Messungen',()=>{const p=fit([{x:[0],y:0},{x:[1],y:2}],f,0,0.3);expect(p([0]).mean).toBeCloseTo(0,6);expect(p([1]).mean).toBeCloseTo(2,6);expect(p([0.5]).sd).toBeGreaterThan(p([0]).sd)});
 it('liefert analytischen Einzelpunkt-Referenzfall',()=>{const p=fit([{x:[0.5],y:10}],f,0.5,0.3);expect(p([0.5]).mean).toBe(10);expect(p([0.5]).sd).toBeCloseTo(Math.sqrt(0.125),6)});
 it('verarbeitet Wiederholungsmessungen und fremde Versuchspunkte',()=>{const p=fit([{x:[0.2],y:1},{x:[0.2],y:1.2},{x:[0.8],y:2}],f,0.1,0.3);expect(Number.isFinite(p([0.6]).sd)).toBe(true)});
 it('EI stimmt am bisherigen Optimum und respektiert Richtung',()=>{expect(acquisition(2,1,2,true,'ei',2)).toBeCloseTo(1/Math.sqrt(2*Math.PI),6);expect(acquisition(3,0,2,true,'ei',2)).toBe(1);expect(acquisition(1,0,2,false,'ei',2)).toBe(1)});
 it('hält Kandidaten innerhalb des vollständigen Faktorraums',()=>{const c=candidates([...f,...f,...f]);expect(c).toHaveLength(2197);expect(c.every(x=>x.every(v=>v>=0&&v<=1))).toBe(true)});
});
