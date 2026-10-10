import { describe, expect, it } from 'vitest';
import { DEFAULTS } from '../src/apps/gegenstromkaskade/logic';
import { advanceWater, simulate, transfer } from '../src/apps/gegenstromkaskade/transient';
const p = { ...DEFAULTS, mode: 'flow' as const };
describe('Instationäre Gegenstromkaskade', () => {
  it('integriert ein einzelnes Becken analytisch', () => {
    expect(advanceWater([50], 2, 0.5)[0]).toBeCloseTo(2 + 48 * Math.exp(-0.5), 12);
    expect(advanceWater([50], 2, 0)).toEqual([50]);
  });
  it('integriert die gekoppelte zweistufige Wasserkaskade analytisch', () => {
    const r = advanceWater([50, 10], 2, 0.5);
    expect(r[1]).toBeCloseTo(2 + 8 * Math.exp(-0.5), 12);
    expect(r[0]).toBeCloseTo(2 + Math.exp(-0.5) * (48 + 0.5 * 8), 12);
  });
  it('schließt jede diskrete Massenbilanz einschließlich des Anfahrüberlaufs', () => {
    let baths = [0.2, 0.1, 0.05];
    for (let step = 0; step < 8; step++) {
      const r = transfer(baths, step, 1.6, 100, 50);
      expect(Math.abs(r.residual)).toBeLessThan(1e-10);
      expect(r.overflowVolume).toBe(step < 3 ? 1.6 : 0);
      baths = advanceWater(r.baths, 0.01, 0.2);
    }
  });
  it('liefert den ersten Bauteilaustritt eines Einzelbeckens unabhängig', () => {
    const r = simulate({ ...p, stages: 1 }, { volume: 100, initial: 0, count: 1 });
    const expected = (1.6 * 50 / 101.6) * Math.exp(-p.freshFlow / 100);
    expect(r.parts[0].concentrations[1]).toBeCloseTo(expected, 12);
    expect(r.parts[0].timeMinutes).toBe(1);
  });
  it('nähert sich dem unabhängigen periodischen Einzelbecken-Grenzwert', () => {
    const volume = 100, initial = 0.1, fresh = 0.01;
    const r = simulate({ ...p, stages: 1, freshConcentration: fresh }, { volume, initial, count: 1000 });
    const decay = Math.exp(-p.freshFlow / volume);
    const expected = (decay * (1.6 / volume) * 50 + fresh * (1 - decay)) / (1 - decay * (1 - 1.6 / volume));
    expect(r.parts.at(-1)!.concentrations[1]).toBeCloseTo(expected, 10);
    expect(r.repeating).toBe(true);
  });
  it('bildet den Durchlauf und alle Austrittsprofile ohne Phantomwerte ab', () => {
    const r = simulate(p, { volume: 100, initial: 0, count: 10 });
    expect(r.parts).toHaveLength(10);
    for (const part of r.parts) {
      expect(part.concentrations).toHaveLength(4);
      expect(part.concentrations.every(Number.isFinite)).toBe(true);
      expect(part.bathsAtExit).toHaveLength(3);
      expect(part.timeMinutes).toBe(part.number + 2);
    }
    expect(r.parts[0].concentrations[3]).toBe(r.parts[0].bathsAtExit[2]);
  });
  it('zeigt mit unbelasteten Becken ein ansteigendes Anfahrprofil', () => {
    const r = simulate(p, { volume: 100, initial: 0, count: 100 });
    const values = r.parts.map(row => row.concentrations[3]);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThanOrEqual(values[i - 1] - 1e-12);
  });
  it('nähert sich bei kleinen Filmanteilen der kontinuierlichen Referenz', () => {
    const r = simulate(p, { volume: 10000, initial: 0, count: 10000 });
    expect(Math.abs(r.parts.at(-1)!.concentrations[3] / r.stationary.finalConcentration - 1)).toBeLessThan(0.01);
  });
  it('konvergiert ohne Frischwasser gegen die Eingangskonzentration', () => {
    const r = simulate({ ...p, freshFlow: 0 }, { volume: 10, initial: 0, count: 1000 });
    expect(r.parts.at(-1)!.concentrations[3]).toBeCloseTo(50, 8);
  });
  it('erhält eine überall gleiche Konzentration exakt', () => {
    const r = simulate({ ...p, freshConcentration: 50 }, { volume: 100, initial: 50, count: 20 });
    for (const row of r.parts) for (const value of row.concentrations) expect(value).toBeCloseTo(50, 12);
  });
  it('prüft die gesamte diskrete Bilanz auch über 10000 Bauteile', () => {
    const r = simulate(p, { volume: 100, initial: 0.1, count: 10000 });
    expect(r.maxMassResidual).toBeLessThan(1e-9);
    expect(r.startupOverflowVolume).toBeCloseTo(4.8, 12);
  });
  it('begrenzt die zusätzlichen Eingaben und vermeidet voreilige Einschwingaussagen', () => {
    expect(() => simulate(p, { volume: 1, initial: 0, count: 100 })).toThrow();
    expect(() => simulate(p, { volume: 100, initial: -1, count: 100 })).toThrow();
    for (const count of [0, 1.5, 10001, NaN]) expect(() => simulate(p, { volume: 100, initial: 0, count })).toThrow();
    expect(simulate(p, { volume: 100, initial: 0, count: 1 }).repeating).toBe(false);
  });
});
