import {describe,it,expect} from 'vitest';
import {score,feasible,intervalProbability,buildModels,evaluateCandidate,paretoIndices,parseProject,targetDefaults} from '../src/apps/bayes-optimierung/multi';
import {generateSimulation} from '../src/apps/bayes-optimierung/simulation';
const f=[{name:'x₁',unit:'',min:0,max:10}];
describe('Sollwerte und Bedingungen',()=>{
 it('bevorzugt geringere Sollwertabweichung unabhängig von Seite',()=>{const t=[{...targetDefaults[0],goal:'target' as const,desired:20}];expect(score([19],t)).toBe(score([21],t));expect(score([20],t)).toBeGreaterThan(score([19],t))});
 it('verrechnet Bereichsbedingungen nicht mit Zielnutzen',()=>{const t=[{...targetDefaults[0],goal:'range' as const,lower:19,upper:21},{...targetDefaults[1]}];expect(feasible([22,100],t)).toBe(false);expect(score([20,10],t)).toBe(10)});
 it('normalverteilte Bereichswahrscheinlichkeit hat Referenzwert',()=>expect(intervalProbability(20,1,19,21)).toBeCloseTo(.68268949,6));
 it('exakte Bereichsgrenzen und Nullstreuung',()=>{expect(intervalProbability(19,0,19,21)).toBe(1);expect(intervalProbability(22,0,19,21)).toBe(0)});
 it('sucht zunächst zulässige Punkte ohne EI-Baseline',()=>{const t=[{...targetDefaults[0],goal:'range' as const,lower:1,upper:3},{...targetDefaults[1]}];const b=buildModels([{x:[5],values:[2,4],source:'Test'}],f,t,.25);const v=evaluateCandidate([5],b,t,null,'ei',2);expect(v.score).toBeGreaterThan(.99);expect(v.ei).toBe(0)});
 it('Sollwertmoment berücksichtigt Unsicherheit statt Verlust am Mittelwert',()=>{const t=[{...targetDefaults[0],goal:'target' as const,desired:20,noise:1}];const b=buildModels([{x:[5],values:[20],source:'Test'}],f,t,.25);expect(b.combined([5]).mean).toBeLessThan(0);expect(b.combined([5]).sd).toBeGreaterThan(0)});
 it('Pareto ignoriert unzulässige Punkte und berücksichtigt Sollwerte',()=>{const t=[{...targetDefaults[0],goal:'target' as const,desired:20},{...targetDefaults[1],goal:'range' as const,lower:0,upper:1}];expect(paretoIndices([{x:[1],values:[20,2],source:'Test'},{x:[2],values:[19,1],source:'Test'},{x:[3],values:[20,1],source:'Test'}],t)).toEqual([2])});
 it('weist ungültige Bereiche und reine Bedingungen zurück',()=>{expect(()=>parseProject({factors:f,targets:[{...targetDefaults[0],goal:'range',lower:21,upper:19}],rows:[]})).toThrow()});
 it('erzeugt adaptive Folge und bewahrt vorhandene Messungen',async()=>{const initial=[{x:[2],values:[3],source:'Eigener Versuch'}];const r=await generateSimulation(initial,f,targetDefaults.slice(0,1),.25,'ei',2,6,()=>{});expect(r).toHaveLength(6);expect(r[0]).toEqual(initial[0]);expect(r[5].predictions).toHaveLength(1);expect(r.every(v=>v.x[0]>=0&&v.x[0]<=10)).toBe(true)});
 it('weist ungültiges Simulationsbudget zurück',async()=>{await expect(generateSimulation([],f,targetDefaults.slice(0,1),.25,'ei',2,151,()=>{})).rejects.toThrow()});
});
