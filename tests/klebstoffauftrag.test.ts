import {describe,it,expect} from 'vitest';
import {defaultGeometry as g,defaultProcess as p,reservoirVolume,reservoirHeight,levelFromVolume,coneHeight,validate,simulate,minimumFilm} from '../src/apps/klebstoffauftrag/logic';
import {drawingSvg} from '../src/apps/klebstoffauftrag/drawing';
describe('Klebstoffauftrag: Geometrie und Mengenbilanz',()=>{
 it('prüft die Defaults und invertiert die konische/zylindrische Reservoirfüllung',()=>{
  expect(validate(g,p)).toEqual([]);
  expect(reservoirVolume(g)).toBeGreaterThan(1154);expect(reservoirVolume(g)).toBeLessThan(1500);
  for(const fraction of [0,.001,.05,.2,.5,1]){const h=reservoirHeight(g)*fraction;expect(levelFromVolume(g,reservoirVolume(g,h))).toBeCloseTo(h,10);}
  const old={...g,reservoirDiameter:7.6};expect(reservoirVolume(old)/1000).toBeCloseTo(.0694124807,9);
 });
 it('verwendet den eingeschlossenen Bohrerwinkel',()=>{expect(coneHeight(g)).toBeCloseTo(3.5/Math.tan(59*Math.PI/180),10);});
 it('rechnet Massenfestkörper und Verdünnung über einstellbare Feststoffdichte um',()=>{
  const f=minimumFilm(p);expect(f.dry).toBe(50);expect(f.volumeSolids).toBeCloseTo((.44/1.2)/(1/1.11+.1),12);
  expect(minimumFilm({...p,waterAddition:0}).wet).toBeLessThan(f.wet);
 });
 it('erhält Volumen und berechnet bei konstantem Film das analytische Schalenvolumen',()=>{
  const a=simulate({...g,tipLength:0},{...p,mode:'manual',scenarioThickness:135});
  const expected=Math.PI*((3.5+.135)**2-3.5**2)*155;
  expect(a.consumed).toBeCloseTo(expected,6);expect(a.balanceError).toBeCloseTo(0,9);expect(a.end).toBe(170);
  for(const f of a.frames)expect(f.remaining+f.deposited).toBeCloseTo(a.initialVolume,8);
 });
 it('beendet den Auftrag bei leerem Vorrat ohne negative Restmenge',()=>{
  const a=simulate({...g,reservoirDiameter:7.6,tipLength:0},{...p,mode:'manual',scenarioThickness:135});
  const length=a.initialVolume/(Math.PI*((3.5+.135)**2-3.5**2));
  expect(a.end-a.start).toBeCloseTo(length,6);expect(a.finalVolume).toBe(0);expect(a.frames.every(f=>f.remaining>=0)).toBe(true);
 });
 it('bleibt bei Schrittweitenänderung stabil und hält den bewegten Spiegel konsistent',()=>{
  const a=simulate(g,p,300),b=simulate(g,p,1200);
  expect(a.consumed).toBeCloseTo(b.consumed,6);expect(a.finalVolume).toBeCloseTo(b.finalVolume,6);
  const middle=b.frames[200];expect(middle.front).toBeCloseTo(middle.travel+g.embedDepth+g.lidThickness+reservoirHeight(g)-middle.level,7);
 });
 it('leeres Reservoir erzeugt keinen Film; ungültige LLD-Referenz wird nicht animiert',()=>{
  expect(simulate(g,{...p,fillPercent:0}).consumed).toBe(0);
  const a=simulate(g,{...p,mode:'lld'});expect(a.modelValid).toBe(false);expect(a.consumed).toBe(0);
 });
 it('verändert den Start bei tieferem, jeweils vollem Reservoir nicht',()=>{
  expect(simulate({...g,reservoirDepth:20},p).start).toBeCloseTo(simulate(g,p).start,10);
  expect(simulate(g,{...p,fillPercent:50}).start).toBeGreaterThan(g.freeLength);
 });
 it('verwechselt vorgegebenen Film nicht mit Viskositätsprognose',()=>{
  expect(simulate(g,{...p,viscosity:.5}).wet).toBe(simulate(g,p).wet);
 });
 it('blockiert Kollisionen, unrealistische Werte und nicht endliche Eingaben',()=>{
  for(const patch of [{pencilLength:3e6},{reservoirDiameter:70},{reservoirDiameter:6},{lidOpening:7},{boltCircle:15},{pencilLength:NaN},{holderHeight:11}])expect(validate({...g,...patch},p).length).toBeGreaterThan(0);
  expect(validate(g,{...p,viscosity:NaN}).length).toBeGreaterThan(0);
 });
 it('erzeugt vier unterschiedliche Zeichnungen mit Maßeinheit und Konstruktionshinweisen',()=>{
  for(const part of ['assembly','body','lid','holder'] as const){const svg=drawingSvg(g,part);expect(svg).toContain('viewBox="0 0 1000 780"');expect(svg).not.toContain('NaN');expect(svg).toContain('Werkstattentwurf');}
 });
});
