import {it,expect} from 'vitest';
import {defaultGeometry as g,defaultProcess as p,toolPose,simulate,validate,collisionWarnings,readProject} from '../src/apps/klebstoffauftrag/logic';
import {drawingSvg} from '../src/apps/klebstoffauftrag/drawing';
it('keeps the shield fixed while the open reservoir moves',()=>{
 const a=toolPose(g,0),b=toolPose(g,100);
 expect(a.bodyTop).toBe(a.lidBottom);expect(b.lidTop).toBe(a.lidTop);expect(b.lidBottom).toBe(a.lidBottom);
 expect(b.bodyTop-a.bodyTop).toBe(100);expect(b.bodyBottom-a.bodyBottom).toBe(100);
});
it('ends with reservoir rim two millimetres below the tip and conserves adhesive',()=>{
 const s=simulate(g,p);expect(s.stroke).toBe(157);expect(toolPose(g,s.stroke).bodyTop).toBe(g.pencilLength+2);
 expect(s.start).toBe(15);expect(s.balanceError).toBeCloseTo(0,9);expect(s.warnings.join(' ')).not.toContain('Filmschicht passt nicht');
});
it('accepts nominal pencil-size lid bore and a smaller independent lid diameter',()=>{
 expect(validate(g,p)).toEqual([]);expect(g.lidOpening).toBe(g.pencilDiameter);
 expect(validate({...g,lidDiameter:38},p)).toEqual([]);expect(validate({...g,lidOpening:14},p).length).toBeGreaterThan(0);
});
it('places threaded holes in the holder rather than the moving body',()=>{
 expect(validate({...g,holderHeight:18,threadDepth:20},p).join(' ')).toContain('Edelstahl');
 expect(drawingSvg(g,'body')).toContain('keine Gewindebohrungen');
 expect(drawingSvg(g,'lid')).toContain('Senkung UNTERSEITE');
 expect(drawingSvg(g,'holder')).toContain('von UNTEN');
});
it('warns about the wing-head envelope and clears it when the lid is smaller',()=>{
 expect(collisionWarnings(g).join(' ')).toContain('festem Deckel');
 expect(collisionWarnings({...g,lidDiameter:38})).toEqual([]);
 expect(validate({...g,boltCircle:38},p).join(' ')).toContain('Edelstahlaufnahme');
});
it('roundtrips current projects and rejects incomplete v2 data',()=>{
 const r=readProject({version:2,geometry:g,process:p});expect(r.geometry).toEqual(g);expect(r.migrated).toBe(false);
 expect(()=>readProject({version:2,geometry:{...g,lidDiameter:undefined},process:p})).toThrow();
});
it('migrates legacy moving-lid files explicitly',()=>{
 const old:Record<string,unknown>={...g,lidOpening:14,boltCircle:36};delete old.lidDiameter;delete old.clampHeadSpan;delete old.clampProjection;
 const r=readProject({version:1,geometry:old,process:p});expect(r.migrated).toBe(true);expect(r.geometry.lidDiameter).toBe(g.bodyDiameter);expect(r.geometry.lidOpening).toBe(g.pencilDiameter);expect(r.geometry.boltCircle).toBe(26);
});
