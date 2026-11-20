import { describe, expect, it } from 'vitest';
import { addBatches, calculateBatch, defaults, emptyBatch, fillHeight, maxChargeHeight, retainedVolume } from '../src/apps/lackierverluste/logic';

describe('Lackierverluste', () => {
  const cylinder = { diameter: 100, capacity: 500, wallFilm: 1, bottomRest: 2 };

  it('uses total bottom depth and excludes the overlapping wall zone', () => {
    const input = 100;
    const expected = Math.PI * 2.5 * 2 + Math.PI * (2.5 - 2.401) * (fillHeight(input, cylinder) - 2);
    expect(retainedVolume(input, cylinder)).toBeCloseTo(expected, 10);
  });

  it('uses the entire RPS wall even for a partial charge and caps rest at input', () => {
    expect(retainedVolume(100, cylinder, true)).toBeCloseTo(34.8859279225, 8);
    expect(retainedVolume(1, cylinder, true)).toBe(1);
    expect(retainedVolume(0, cylinder, true)).toBe(0);
  });

  it('limits mixing-cup fill height to the downstream RPS capacity', () => {
    const batch = calculateBatch(5000, { ...defaults, fillHeight: maxChargeHeight(defaults) });
    expect(batch.sprayCupInput).toBeCloseTo(defaults.sprayCup.capacity, 9);
  });

  it.each([true, false])('closes the full pail balance with mixing cup enabled = %s', useMixingCup => {
    const settings = { ...defaults, useMixingCup };
    const rest = retainedVolume(settings.pail.capacity, settings.pail);
    let remaining = settings.pail.capacity - rest;
    let total = emptyBatch;
    const fullCharge = calculateBatch(remaining, settings).withdrawn;
    let lastCharge = 0;
    for (let run = 0; remaining > 1e-8 && run < 20; run++) {
      const batch = calculateBatch(remaining, settings);
      lastCharge = batch.withdrawn;
      remaining -= batch.withdrawn;
      total = addBatches(total, batch);
    }
    expect(lastCharge).toBeLessThan(fullCharge);
    expect(remaining).toBeCloseTo(0, 8);
    expect(rest + total.mixingRest + total.sprayCupRest + total.overspray + total.deposited)
      .toBeCloseTo(settings.pail.capacity, 8);
    expect(total.overspray).toBeCloseTo(total.deposited, 8);
    if (!useMixingCup) expect(total.mixingRest).toBe(0);
  });
});
