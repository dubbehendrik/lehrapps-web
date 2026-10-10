import { describe, expect, it } from 'vitest';
import { calculate, concentrationProfile, DEFAULTS, requiredRatio, compareStages } from '../src/apps/gegenstromkaskade/logic';

describe('Gegenstromkaskade: Aufgabenreferenz', () => {
  it('reproduziert die Bilanz und die exakte dreistufige Lösung', () => {
    const r = calculate(DEFAULTS);
    expect(r.dragVolume).toBeCloseTo(1.6, 12);
    expect(r.dragFlow).toBeCloseTo(1.6, 12);
    expect(r.ratio).toBeCloseTo(8.923032767999825, 10);
    expect(r.freshFlow).toBeCloseTo(14.276852428799721, 10);
    expect(r.concentrations[1]).toBeCloseTo(5.596471659174902, 10);
    expect(r.concentrations[2]).toBeCloseTo(0.620189547999989, 10);
    expect(r.finalConcentration).toBeCloseTo(0.0625, 12);
    expect(r.criterion).toBeCloseTo(800, 10);
    expect(r.meetsTarget).toBe(true);
    expect(r.approximateFlow).toBeCloseTo(14.853084267560892, 10);
  });
  it('prüft die einstufige und zweistufige Lösung unabhängig', () => {
    expect(requiredRatio(1, 50, 0, 800)).toBeCloseTo(799, 10);
    const quadratic = (-1 + Math.sqrt(3197)) / 2;
    expect(requiredRatio(2, 50, 0, 800)).toBeCloseTo(quadratic, 10);
  });
});

describe('Gegenstromkaskade: belastetes Frischwasser und Bilanzschluss', () => {
  for (const stages of [1, 2, 3, 8]) for (const ratio of [0, 0.1, 0.999999999, 1, 1.000000001, 10, 1000]) {
    it(`schließt alle lokalen und die Gesamtbilanz für N=${stages}, R=${ratio}`, () => {
      const p = { ...DEFAULTS, stages, freshConcentration: 0.01, freshFlow: 1.6 * ratio, mode: 'flow' as const };
      const r = calculate(p);
      expect(r.concentrations[0]).toBeCloseTo(p.initialConcentration, 12);
      for (let i = 1; i <= stages; i++) {
        const next = i === stages ? p.freshConcentration : r.concentrations[i + 1];
        const incoming = r.dragFlow * r.concentrations[i - 1] + r.freshFlow * next;
        const outgoing = (r.dragFlow + r.freshFlow) * r.concentrations[i];
        expect(Math.abs(incoming - outgoing)).toBeLessThan(1e-10 * Math.max(1, incoming));
        expect(r.concentrations[i]).toBeGreaterThanOrEqual(p.freshConcentration);
        expect(r.concentrations[i]).toBeLessThanOrEqual(r.concentrations[i - 1]);
      }
      const totalIn = r.dragFlow * p.initialConcentration + r.freshFlow * p.freshConcentration;
      expect(totalIn).toBeCloseTo(r.bathWasteLoad + r.outputDragLoad, 8);
    });
  }
  it('löst ein erreichbares Ziel mit belastetem Frischwasser', () => {
    const r = calculate({ ...DEFAULTS, freshConcentration: 0.01 });
    expect(r.finalConcentration).toBeCloseTo(0.0625, 12);
    expect(r.freshFlow).toBeGreaterThan(calculate(DEFAULTS).freshFlow);
    const fixed = calculate({ ...DEFAULTS, freshConcentration: 0.01, freshFlow: r.freshFlow, mode: 'flow' });
    expect(fixed.criterion).toBeCloseTo(800, 10);
  });
  it('behandelt R=1 ohne Division durch R−1', () => {
    expect(concentrationProfile(3, 1, 50, 2)).toEqual([50, 38, 26, 14]);
  });
  it('zeigt bei Nullwasser keine stationäre Reinigung', () => {
    const r = calculate({ ...DEFAULTS, freshFlow: 0, mode: 'flow' });
    expect(r.concentrations).toEqual([50, 50, 50, 50]);
    expect(r.meetsTarget).toBe(false);
    expect(r.criterion).toBe(1);
  });
  it('weist unerreichbare Ziele einschließlich der asymptotischen Grenze zurück', () => {
    for (const freshConcentration of [0.0625, 0.1, 50, 60]) {
      expect(() => calculate({ ...DEFAULTS, freshConcentration })).toThrow('nicht erreichbar');
    }
  });
  it('erlaubt belasteteres Frischwasser im Vorwärtsmodell und zeigt die Verschlechterung', () => {
    const r = calculate({ ...DEFAULTS, freshConcentration: 60, mode: 'flow' });
    expect(r.finalConcentration).toBeGreaterThan(50);
    expect(r.criterion).toBeLessThan(1);
    expect(r.meetsTarget).toBe(false);
  });
  it('berechnet das minimale Wasser für Sk=1 als null', () => {
    expect(calculate({ ...DEFAULTS, targetCriterion: 1 }).freshFlow).toBe(0);
  });
  it('bleibt bei sehr großem R numerisch endlich', () => {
    const c = concentrationProfile(8, 1e100, 50, 0.01);
    expect(c.every(Number.isFinite)).toBe(true);
    expect(c[8]).toBe(0.01);
  });
  it('skalierender Durchsatz verändert den Wasserbedarf, nicht das Konzentrationsprofil', () => {
    const a = calculate(DEFAULTS);
    const b = calculate({ ...DEFAULTS, throughput: 120 });
    expect(b.freshFlow).toBeCloseTo(a.freshFlow * 2, 10);
    expect(b.concentrations).toEqual(a.concentrations);
  });
  it('zusätzliche Stufen senken den Wasserbedarf bei gleichem Spülkriterium', () => {
    const rows = compareStages(DEFAULTS);
    for (let i = 1; i < rows.length; i++) expect(rows[i].result!.freshFlow).toBeLessThan(rows[i - 1].result!.freshFlow);
  });
  it('zusätzliche Stufen verbessern die Reinigung bei gleichem Wasserstrom', () => {
    const rows = compareStages({ ...DEFAULTS, mode: 'flow' });
    for (let i = 1; i < rows.length; i++) expect(rows[i].result!.criterion).toBeGreaterThan(rows[i - 1].result!.criterion);
  });
  for (const [key, value] of [
    ['area', 0], ['area', NaN], ['throughput', 0], ['specificDrag', -1],
    ['initialConcentration', 0], ['freshConcentration', -1], ['freshConcentration', Infinity],
    ['stages', 0], ['stages', 9], ['stages', 2.5], ['targetCriterion', 0], ['targetCriterion', NaN],
  ] as const) it(`validiert ${key}=${value}`, () => {
    expect(() => calculate({ ...DEFAULTS, [key]: value })).toThrow();
  });
  it('validiert negative Wasserströme im Vorwärtsmodell', () => {
    expect(() => calculate({ ...DEFAULTS, freshFlow: -1, mode: 'flow' })).toThrow();
  });
});
