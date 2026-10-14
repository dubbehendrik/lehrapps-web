import { describe,it,expect } from 'vitest';
import { simulate,splitRows,linearFit,metrics,parseCsv,trainNetwork,parameterCount } from './logic';
describe('Neuronale Netze',()=>{
 it('teilt 100 Punkte reproduzierbar und disjunkt 64/16/20',()=>{const rows=simulate(100,1,0,'linear');const s=splitRows(rows);expect([s.train.length,s.validation.length,s.test.length]).toEqual([64,16,20]);expect(new Set([...s.train,...s.validation,...s.test]).size).toBe(100);expect(splitRows(rows)).toEqual(s);});
 it('trifft die lineare Referenz mit zwei Faktoren',()=>{const rows=simulate(100,2,0,'linear');const f=linearFit(rows);expect(f([.3,-.2])).toBeCloseTo(1.4,10);});
 it('liest Dezimalkomma und zitierte Spalten',()=>{expect(parseCsv('"x; [-]";y\n0,5;2,5\n1;3').values).toEqual([[.5,2.5],[1,3]]);expect(()=>parseCsv('x,y\n"0,1')).toThrow();});
 it('verweigert unvollständige Daten und singuläre Regression',()=>{expect(()=>splitRows(Array.from({length:10},()=>({x:[NaN],y:2})))).toThrow();expect(()=>linearFit([{x:[1],y:2},{x:[1],y:3}])).toThrow();});
 it('berechnet Referenzfehler und konstantes R²',()=>{expect(metrics([1,3],[2,2])).toEqual({mae:1,rmse:1,r2:0});expect(metrics([2,2],[2,2]).r2).toBeNull();expect(parameterCount(1,[16,16])).toBe(321);});
 it('lernt nichtlineare Daten und hält Testwerte aus dem Training',async()=>{const rows=simulate(100,1,0,'nonlinear'),s=splitRows(rows),o={layers:[16,16],epochs:600,rate:.01,seed:7,early:true,activation:'tanh' as const};const a=await trainNetwork(rows,s.train,s.validation,o,()=>{});expect(metrics(s.test.map(i=>rows[i].y),s.test.map(i=>a.predict(rows[i].x))).rmse).toBeLessThan(.15);const altered=rows.map((r,i)=>s.test.includes(i)?{...r,y:9999}:r);const b=await trainNetwork(altered,s.train,s.validation,o,()=>{});expect(b.predict([.4])).toBe(a.predict([.4]));},20000);
 it('kann Training abbrechen',async()=>{const rows=simulate(20,1,0,'linear'),s=splitRows(rows);await expect(trainNetwork(rows,s.train,s.validation,{layers:[4],epochs:10,rate:.01,seed:1,early:false,activation:'relu'},()=>{},()=>true)).rejects.toThrow('abgebrochen');});
});
