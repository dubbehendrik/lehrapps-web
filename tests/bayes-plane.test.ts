import {describe,it,expect} from 'vitest';
import {axisLabel,fieldGrid,pointGroups,pointInSlice} from '../src/apps/bayes-optimierung/plane';
import {targetDefaults} from '../src/apps/bayes-optimierung/multi';
const factors=[{name:'x₁',unit:'',min:0,max:1},{name:'x₂',unit:'',min:0,max:2},{name:'x₃',unit:'',min:0,max:3}];
describe('Faktorflächen',()=>{
 it('kennzeichnet fehlende Einheiten',()=>{expect(axisLabel('x₁','')).toBe('x₁ [-]');expect(axisLabel('y₁','µm')).toBe('y₁ [µm]')});
 it('bildet x,y und dritten Schnittwert korrekt ab',()=>{const g=fieldGrid(factors,2,[x=>({mean:x[0]+10*x[1]+100*x[2],sd:.2})],targetDefaults.slice(0,1),0,3);expect(g.mean[0][0]).toBe(200);expect(g.mean[2][2]).toBe(221);expect(g.sd[1][1]).toBe(.2)});
 it('unterscheidet Schnittebene und Projektion',()=>{expect(pointInSlice([.2,.3,2],factors,2)).toBe(true);expect(pointInSlice([.2,.3,1],factors,2)).toBe(false);expect(pointInSlice([.2,.3],factors.slice(0,2),0)).toBe(true)});
 it('unterscheidet eigene Punkte und Systemvorschläge',()=>{const rows=[{x:[.1,.2,2],values:[1],source:'Eigener Versuch'},{x:[.1,.2,1],values:[1],source:'Simulierter Vorschlag'}];expect(pointGroups(rows,factors,2)).toEqual([{source:'own',projected:false,indices:[0]},{source:'system',projected:true,indices:[1]}])});
 it('stellt Wahrscheinlichkeit neuer Messungen mit Messrauschen dar',()=>{const t=[{...targetDefaults[0],goal:'range' as const,lower:-1,upper:1,noise:1},{...targetDefaults[1]}];const g=fieldGrid(factors.slice(0,2),0,[()=>({mean:0,sd:0}),()=>({mean:0,sd:0})],t,0,3);expect(g.probability[0][0]).toBeCloseTo(.68268949,6)});
});
