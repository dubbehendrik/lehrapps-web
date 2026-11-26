import { describe, expect, it } from 'vitest';
import { includePath, makeGlowPath } from './glowTree';

describe('Leuchtbaum', () => {
  it('zeichnet für jede Operation genau eine Kante und teilt gemeinsame Wege', () => {
    const p = makeGlowPath(27), q = makeGlowPath(54);
    expect(p.steps).toBe(111);
    expect(p.coordinates.length).toBe(224);
    expect(Array.from(q.coordinates.slice(0,p.coordinates.length))).toEqual(Array.from(p.coordinates));
    expect(q.steps).toBe(112);
  });
  it('bestimmt den bekannten Rekord im Bereich bis 9.999', () => {
    let best = makeGlowPath(1);
    for(let n = 2; n <= 9999; n++) { const p = makeGlowPath(n); if(p.steps > best.steps) best = p; }
    expect([best.start,best.steps]).toEqual([6171,261]);
  });
  it('nimmt alle Koordinaten in die Grenzen auf', () => {
    const b = {minX:0,maxX:0,minY:0,maxY:0};
    const p = makeGlowPath(7); includePath(b,p);
    for(let i=0;i<p.coordinates.length;i+=2) { expect(p.coordinates[i]).toBeGreaterThanOrEqual(b.minX); expect(p.coordinates[i]).toBeLessThanOrEqual(b.maxX); expect(p.coordinates[i+1]).toBeGreaterThanOrEqual(b.minY); expect(p.coordinates[i+1]).toBeLessThanOrEqual(b.maxY); }
  });
});
