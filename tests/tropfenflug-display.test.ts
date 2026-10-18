import {it,expect} from 'vitest';
import {forceScales} from '../src/apps/tropfenflug/display';
import {simulate} from '../src/apps/tropfenflug/logic';
import {defaults} from '../src/apps/tropfenflug/types';
import {templates} from '../src/apps/tropfenflug/geometry';
it('bewahrt die Gewichtspfeillänge bei wechselndem Luftwiderstand, auch bei Einzelvergrößerung',()=>{const r=simulate({parameters:defaults,polygon:templates['U-Profil']});for(const individual of [false,true]){const scale=forceScales(r,individual,1);const lengths=r.frames.map(f=>Math.hypot(f.gravity.x,f.gravity.y)*scale.gravity);expect(Math.max(...lengths)-Math.min(...lengths)).toBeLessThan(1e-12);expect(lengths[0]).toBeGreaterThan(0);expect(r.frames[0].drag.y).not.toBe(r.frames.at(-1)!.drag.y);}});
