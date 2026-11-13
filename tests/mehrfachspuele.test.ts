import { describe, expect, it } from 'vitest';
import { bathColor, calculate, canEdit, cellState, defaultParameters, fmt, validateInterventions } from '../src/apps/mehrfachspuele/logic';
import type { Scenario } from '../src/apps/mehrfachspuele/types';
import { parseScenario, scenarioRows, workbookSheets } from '../src/apps/mehrfachspuele/workbook';
import write from 'write-excel-file/node';
import read from 'read-excel-file/node';

describe('Mehrfachspüle: Excel reference Tabelle1, rows 17, 18, 26, 56, 202', () => {
  // Cached unrounded results from supplied Mehrfachspuele.xlsx; D:F, G, I, J.
  const references = [
    [1, [4.545454545454546, 0.41322314049586784, 0.03756574004507889], 1330.9999999999998, 1.6129032258064515, 31.000000000000004],
    [2, [8.677685950413222, 1.1645379413974455, 0.14001775834983948], 357.0975609756098, 3.1737773152965656, 15.75409836065574],
    [10, [30.72283552852342, 13.198140554453792, 4.435793067418976], 11.271941508554896, 13.978183197218542, 3.5770027688540584],
    [40, [48.89525359239101, 44.87799392835829, 37.391282736297285], 1.337210075209934, 36.53047006669613, 1.368720410898399],
    [186, [49.99999900015987, 49.99998209377217, 49.99983838947674], 1.0000032322209123, 49.88773397935496, 1.0022503732218324],
  ] as const;
  it.each(references)('reproduces three and one bath at t=%s', (t, concentrations, R, singleC, singleR) => {
    const p = { ...defaultParameters(), steps: 186 };
    const result = calculate(p);
    concentrations.forEach((c, i) => expect(result.concentrations[t][i]).toBeCloseTo(c, 11));
    expect(result.criterion[t]).toBeCloseTo(R, 10);
    const single = calculate({ ...p, stages: [{ volume: 300, initialConcentration: 0 }] });
    expect(single.concentrations[t][0]).toBeCloseTo(singleC, 11);
    expect(single.criterion[t]).toBeCloseTo(singleR, 10);
  });
});
describe('balances, limits and intervention ordering', () => {
  it('balances mass for each bath with unequal volumes and initially contaminated baths', () => {
    const p = { ...defaultParameters(), stages: [{ volume: 67, initialConcentration: 2 }, { volume: 123, initialConcentration: 7 }] };
    const r = calculate(p);
    for (let t = 1; t <= p.steps; t++) for (let n = 0; n < p.stages.length; n++) {
      expect(r.concentrations[t][n] * (p.stages[n].volume + p.dragVolume)).toBeCloseTo(
        p.stages[n].volume * r.concentrations[t - 1][n] + p.dragVolume * (n === 0 ? p.sourceConcentration : r.concentrations[t][n - 1]), 9);
    }
  });
  it('treats zero carryover, zero source and criterion at t=0 consistently', () => {
    const p = defaultParameters();
    expect(calculate(p).criterion[0]).toBeNull();
    const r = calculate({ ...p, dragVolume: 0 });
    expect(r.concentrations.every(row => row.every(c => c === 0))).toBe(true);
    expect(r.criterion[1]).toBe(Infinity);
    expect(calculate({ ...p, sourceConcentration: 0 }).criterion[1]).toBeNull();
  });
  it('detects strict exceedance without relying on rounded display values', () => {
    expect(calculate(defaultParameters()).firstExceedance).toBe(28);
    expect(calculate({ ...defaultParameters(), limit: 50 }).firstExceedance).toBeNull();
    const p = { ...defaultParameters(), stages: [{ volume: 100, initialConcentration: 0 }], steps: 1 };
    expect(calculate({ ...p, limit: calculate(p).concentrations[1][0] }).firstExceedance).toBeNull();
  });
  it('propagates same-row and later changes, preserves upstream values, and restores on undo', () => {
    const p = defaultParameters(), baseline = calculate(p);
    const first = { stage: 2, step: 5, value: 0, comment: 'Wasserwechsel' };
    const second = { stage: 3, step: 8, value: 0.25, comment: 'Teilwechsel' };
    const a = calculate(p, [first]), b = calculate(p, [first, second]);
    expect(a.concentrations[5][1]).toBe(0);
    expect(a.concentrations[5][2]).toBeCloseTo(p.stages[2].volume * baseline.concentrations[4][2] / 110, 14);
    a.concentrations.forEach((row, t) => {
      expect(row[0]).toBe(baseline.concentrations[t][0]);
      if (t < 5) expect(row).toEqual(baseline.concentrations[t]);
    });
    expect(b.concentrations[8][2]).toBe(0.25);
    expect(b.concentrations[9][2]).not.toBe(a.concentrations[9][2]);
    expect(canEdit([first, second], 2, 9)).toBe(false);
    expect(canEdit([first, second], 3, 7)).toBe(false);
    expect(canEdit([first, second], 3, 8)).toBe(true);
    expect(canEdit([first], 2, 5)).toBe(true);
    expect(calculate(p, [first, second].slice(0, -1))).toEqual(a);
    expect(calculate(p, [])).toEqual(baseline);
    const s: Scenario = { id: 'a', name: 'Test', parameters: p, interventions: [first, second] };
    expect(cellState(s, 5, 2, 0, baseline.concentrations[5][1])).toBe('manual');
    expect(cellState(s, 5, 3, a.concentrations[5][2], baseline.concentrations[5][2])).toBe('affected');
    expect(cellState(s, 8, 1, a.concentrations[8][0], baseline.concentrations[8][0])).toBe('unchanged');
  });
  it('retains repeated edits of the same cell so undo restores its previous override', () => {
    const p = defaultParameters(), e = { stage: 1, step: 1, value: 2, comment: 'A' };
    expect(calculate(p, [e, { ...e, value: 3 }]).concentrations[1][0]).toBe(3);
    expect(calculate(p, [e]).concentrations[1][0]).toBe(2);
  });
  it('rejects invalid parameters and upstream interventions', () => {
    const p = defaultParameters();
    for (const patch of [{ steps: 0 }, { steps: 1.5 }, { steps: 2001 }, { dragVolume: NaN }, { sourceConcentration: -1 }, { limit: Infinity }, { stages: [] }, { stages: [{ volume: 0, initialConcentration: 0 }] }]) expect(() => calculate({ ...p, ...patch })).toThrow();
    const e = { stage: 2, step: 5, value: 0, comment: '' };
    for (const changed of [{ ...e, stage: 1 }, { ...e, step: 4 }, { ...e, value: -1 }, { ...e, step: 41 }]) expect(() => validateInterventions(p, [e, changed])).toThrow();
  });
  it('uses at most one decimal and scientific notation for small values', () => {
    expect(fmt(0.03756574)).toBe('3,8 · 10⁻²');
    expect(fmt(1331)).toBe('1.331'); expect(fmt(1.234)).toBe('1,2');
  });
});
describe('versioned Excel model state', () => {
  const scenario: Scenario = { id: 'before', name: 'Badwechsel / [Test]', parameters: { ...defaultParameters(), steps: 12 },
    interventions: [{ stage: 2, step: 5, value: 0, comment: 'Wasserwechsel ä & < >' }, { stage: 3, step: 8, value: 0.125, comment: '=1+1' }] };
  it('round-trips actual XLSX bytes, preserving unrounded values, comments and intervention order', async () => {
    const buffer = await write(workbookSheets([scenario, { ...scenario, id: 'second', name: scenario.name }])).toBuffer();
    const sheets = await read(buffer);
    expect(sheets).toHaveLength(2); expect(sheets[0].sheet).not.toBe(sheets[1].sheet);
    for (const sheet of sheets) {
      const imported = parseScenario(sheet.data, 'after');
      expect(imported).toEqual({ ...scenario, id: 'after' });
      expect(calculate(imported.parameters, imported.interventions)).toEqual(calculate(scenario.parameters, scenario.interventions));
      expect(canEdit(imported.interventions, 2, 9)).toBe(false);
    }
  });
  const raw = () => scenarioRows(scenario).map(row => row.map(v => v !== null && typeof v === 'object' && 'value' in v ? v.value : v));
  it('rejects unknown versions, invalid numbers, missing fields and inconsistent edit history', () => {
    const version = raw(); version[0][1] = 2; expect(() => parseScenario(version, 'x')).toThrow();
    const bad = raw(); bad[3][1] = '50'; expect(() => parseScenario(bad, 'x')).toThrow();
    const missing = raw(); missing[2][0] = 'wrong'; expect(() => parseScenario(missing, 'x')).toThrow();
    const backwards = raw(); backwards[13][2] = 1; expect(() => parseScenario(backwards, 'x')).toThrow();
  });
});

it('interpolates bath colors and clamps exceptional concentrations', () => {
  expect(bathColor(0, 50)).toBe('rgb(130, 186, 216)');
  expect(bathColor(25, 50)).toBe('rgb(143, 171, 186)');
  expect(bathColor(50, 50)).toBe('rgb(155, 155, 155)');
  expect(bathColor(100, 50)).toBe(bathColor(50, 50));
  expect(bathColor(0, 0)).toBe(bathColor(0, 50));
  expect(bathColor(1, 0)).toBe(bathColor(50, 50));
});
it('evaluates a shared limit without changing concentration or individual parameters', () => {
  const p = defaultParameters();
  const own = calculate(p), shared = calculate({ ...p, limit: 10 });
  expect(shared.concentrations).toEqual(own.concentrations);
  expect(shared.firstExceedance).toBe(16);
  expect(p.limit).toBe(25);
});
