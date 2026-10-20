import {it,expect} from 'vitest';
import {format,inputNumber,defaultGeometry} from '../src/apps/klebstoffauftrag/logic';
import {drawingSvg} from '../src/apps/klebstoffauftrag/drawing';
it('limits labels to one decimal and preserves small values with scientific notation',()=>{expect(format(1.2345)).toBe('1,2');expect(format(.01234)).toBe('1,2 · 10⁻²');expect(format(0)).toBe('0');expect(format(123456)).toBe('1,2 · 10⁵');expect(inputNumber(.003456)).toBe('3.5e-3');expect(inputNumber(12.345)).toBe('12.3');expect(format(NaN)).toBe('–');});
it('reserves header clearance and includes two-wing clamp screw',()=>{for(const part of ['holder','assembly'] as const){const s=drawingSvg(defaultGeometry,part);expect(s).toContain('Flügelschraube, zwei Flügel');expect(s).toContain('M4');}const s=drawingSvg({...defaultGeometry,reservoirDepth:10.234},'body');expect(s).toContain('10,2');expect(s).not.toContain('tief bis Konusbeginn.10.234');});

