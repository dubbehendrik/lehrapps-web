import {it,expect} from 'vitest';
import {defaults} from '../src/apps/tropfenflug/types';
import {simulate} from '../src/apps/tropfenflug/logic';
import {templates} from '../src/apps/tropfenflug/geometry';
import {buildFields,sample} from '../src/apps/tropfenflug/fields';
it('vergleicht Feld und Flugzeit einer Platte auf 5- und 2,5-mm-Gitter',()=>{
 const p={...defaults,charging:'contact' as const,rpm:0,airSpeed:0,gravity:false,meridionalSpeed:0,azimuth:90,maxTime:.5};
 const coarse=simulate({parameters:p,polygon:templates['Ebene Platte']}),fine=simulate({parameters:p,polygon:templates['Ebene Platte'],resolution:2});
 expect(coarse.reason).toBe('workpiece');expect(fine.reason).toBe('workpiece');
 const a=coarse.frames.at(-1)!,b=fine.frames.at(-1)!;expect(Math.abs(a.position.x-b.position.x)).toBeLessThan(.001);expect(Math.abs(a.t-b.t)/b.t).toBeLessThan(.12);
 const pt={x:.15,y:0};expect(Math.abs(sample(coarse.grid,coarse.grid.ex,pt)/sample(fine.grid,fine.grid.ex,pt)-1)).toBeLessThan(.12);
},30000);
it('löst auch das U-Profil mit Außenaufladung auf feinem Gitter',()=>{const g=buildFields({...defaults,charging:'external'},templates['U-Profil'],2);expect(g.airResidual).toBeLessThan(1e-6);expect(g.electricResidual).toBeLessThan(1e-6);},30000);
