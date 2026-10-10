export interface Parameters {
  stages: number;
  area: number;
  throughput: number;
  specificDrag: number;
  initialConcentration: number;
  freshConcentration: number;
  targetCriterion: number;
  freshFlow: number;
  mode: 'target' | 'flow';
}
export const DEFAULTS: Parameters = {
  stages: 3, area: 20, throughput: 60, specificDrag: 80,
  initialConcentration: 50, freshConcentration: 0,
  targetCriterion: 800, freshFlow: 14.276852428799721, mode: 'target',
};
export const MAX_STAGES = 8;

function validateStages(stages: number) {
  if (!Number.isInteger(stages) || stages < 1 || stages > MAX_STAGES)
    throw new Error(`Die Zahl der Spülstufen muss zwischen 1 und ${MAX_STAGES} liegen.`);
}
function validatePositive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} muss größer als 0 sein.`);
}
function validateNonnegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} muss mindestens 0 sein.`);
}

// Ratio S_(N-i)/S_N, with S_j = 1 + R + ... + R^j.
// For R > 1 use inverse powers so even large ratios do not overflow.
export function concentrationProfile(stages: number, ratio: number, initial: number, fresh: number): number[] {
  validateStages(stages);
  validateNonnegative(ratio, 'Das Spülverhältnis');
  validatePositive(initial, 'Die Eingangskonzentration');
  validateNonnegative(fresh, 'Die Frischwasserkonzentration');
  const base = ratio > 1 ? 1 / ratio : ratio;
  const sums = [1];
  let power = 1;
  for (let j = 1; j <= stages; j++) {
    power *= base;
    sums.push(sums[j - 1] + power);
  }
  return Array.from({ length: stages + 1 }, (_, i) => {
    const fraction = sums[stages - i] / sums[stages] * (ratio > 1 ? Math.pow(base, i) : 1);
    return initial * fraction + fresh * (1 - fraction);
  });
}

export function requiredRatio(stages: number, initial: number, fresh: number, criterion: number): number {
  validateStages(stages);
  validatePositive(initial, 'Die Eingangskonzentration');
  validateNonnegative(fresh, 'Die Frischwasserkonzentration');
  if (!Number.isFinite(criterion) || criterion < 1) throw new Error('Das Spülkriterium muss mindestens 1 sein.');
  if (criterion === 1) return 0;
  const target = initial / criterion;
  if (target <= fresh) throw new Error(`Das Spülziel ist nicht erreichbar: Die Endkonzentration muss über der Frischwasserkonzentration liegen. Frischwasserqualität verbessern oder Spülkriterium verringern.`);
  const fraction = (target - fresh) / (initial - fresh);
  let upper = 1;
  while (concentrationProfile(stages, upper, 1, 0)[stages] > fraction) {
    upper *= 2;
    if (!Number.isFinite(upper)) throw new Error('Der erforderliche Wasserstrom liegt außerhalb des berechenbaren Bereichs.');
  }
  let lower = 0;
  for (let iteration = 0; iteration < 100; iteration++) {
    const middle = lower + (upper - lower) / 2;
    if (concentrationProfile(stages, middle, 1, 0)[stages] > fraction) lower = middle;
    else upper = middle;
  }
  return upper;
}

export function calculate(p: Parameters) {
  validateStages(p.stages);
  validatePositive(p.area, 'Die benetzte Oberfläche');
  validatePositive(p.throughput, 'Der Durchsatz');
  validatePositive(p.specificDrag, 'Die spezifische Verschleppung');
  validatePositive(p.initialConcentration, 'Die Eingangskonzentration');
  validateNonnegative(p.freshConcentration, 'Die Frischwasserkonzentration');
  if (!Number.isFinite(p.targetCriterion) || p.targetCriterion < 1) throw new Error('Das Spülkriterium muss mindestens 1 sein.');
  const dragVolume = p.area * p.specificDrag / 1000; // L per part/batch
  const dragFlow = dragVolume * p.throughput / 60; // L/min
  if (!Number.isFinite(dragFlow) || dragFlow <= 0) throw new Error('Der Verschleppungsstrom liegt außerhalb des berechenbaren Bereichs.');
  if (p.mode !== 'target' && p.mode !== 'flow') throw new Error('Unbekannte Betriebsart.');
  let ratio: number;
  if (p.mode === 'target') ratio = requiredRatio(p.stages, p.initialConcentration, p.freshConcentration, p.targetCriterion);
  else {
    validateNonnegative(p.freshFlow, 'Der Frischwasserstrom');
    ratio = p.freshFlow / dragFlow;
  }
  const freshFlow = p.mode === 'flow' ? p.freshFlow : ratio * dragFlow;
  if (!Number.isFinite(freshFlow)) throw new Error('Der Wasserstrom liegt außerhalb des berechenbaren Bereichs.');
  const concentrations = concentrationProfile(p.stages, ratio, p.initialConcentration, p.freshConcentration);
  const finalConcentration = concentrations[p.stages];
  const criterion = finalConcentration === 0 ? Infinity : p.initialConcentration / finalConcentration;
  const limit = p.initialConcentration / p.targetCriterion;
  const meetsTarget = finalConcentration <= limit + 1e-12 * Math.max(limit, Number.MIN_VALUE);
  // Generalized approximation; cf=0 gives R ≈ Sk^(1/N).
  const approximateRatio = limit > p.freshConcentration && p.targetCriterion > 1
    ? Math.pow((p.initialConcentration - p.freshConcentration) / (limit - p.freshConcentration), 1 / p.stages)
    : p.targetCriterion === 1 ? 0 : null;
  return { dragVolume, dragFlow, ratio, freshFlow, concentrations, finalConcentration, criterion, limit, meetsTarget,
    approximateFlow: approximateRatio === null ? null : approximateRatio * dragFlow,
    bathWasteLoad: freshFlow * concentrations[1],
    outputDragLoad: dragFlow * finalConcentration,
  };
}

export function compareStages(p: Parameters) {
  return Array.from({ length: MAX_STAGES }, (_, index) => {
    const stages = index + 1;
    try { return { stages, result: calculate({ ...p, stages }), error: '' }; }
    catch (error) { return { stages, result: null, error: (error as Error).message }; }
  });
}
