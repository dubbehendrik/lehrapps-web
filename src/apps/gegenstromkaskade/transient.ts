import { calculate, type Parameters } from './logic';
export interface TransientSettings { volume: number; initial: number; count: number }
export interface PartRecord { number: number; timeMinutes: number; concentrations: number[]; bathsAtExit: number[] }

/** Exact integration of the equal-volume, ideally mixed counterflow between transfers.
 * The upper-bidiagonal system has an exponential times a finite Poisson sum.
 */
export function advanceWater(baths: number[], fresh: number, waterVolumeRatio: number): number[] {
  if (!Number.isFinite(waterVolumeRatio) || waterVolumeRatio < 0) throw new Error('Ungültiges Wasserintervall.');
  if (waterVolumeRatio === 0) return [...baths];
  if (waterVolumeRatio > 745) return baths.map(() => fresh);
  return baths.map((_, i) => {
    let weight = Math.exp(-waterVolumeRatio), difference = 0;
    for (let k = 0; i + k < baths.length; k++) {
      if (k > 0) weight *= waterVolumeRatio / k;
      difference += weight * (baths[i + k] - fresh);
    }
    return fresh + difference;
  });
}

/** Synchronous transfer: withdraw outgoing film at the pre-transfer concentration,
 * then add incoming film and mix. At startup the extra film volume is displaced
 * through the counterflow overflows; solve those coupled mixing balances backwards.
 */
export function transfer(baths: number[], step: number, filmVolume: number, volume: number, initial: number) {
  const stages = baths.length;
  const next = [...baths];
  const overflow = step < stages ? filmVolume : 0;
  const filledThrough = Math.min(stages, step + 1);
  for (let j = stages - 1; j >= 0; j--) {
    const incoming = j < filledThrough ? filmVolume : 0;
    const outgoing = j < Math.min(stages, step) ? filmVolume : 0;
    const waterOut = j < filledThrough ? overflow : 0;
    const waterIn = j + 1 < filledThrough ? overflow : 0;
    const source = j === 0 ? initial : baths[j - 1];
    next[j] = ((volume - outgoing) * baths[j] + incoming * source + waterIn * (next[j + 1] ?? 0)) / (volume + waterOut);
  }
  const bathMass = (values: number[]) => volume * values.reduce((sum, c) => sum + c, 0);
  const finalFilmMass = step >= stages ? filmVolume * baths[stages - 1] : 0;
  const overflowMass = overflow * next[0];
  const residual = bathMass(next) - bathMass(baths) - filmVolume * initial + finalFilmMass + overflowMass;
  return { baths: next, residual, overflowVolume: overflow, overflowMass, finalFilmMass };
}

export function simulate(p: Parameters, settings: TransientSettings) {
  const stationary = calculate({ ...p, mode: 'flow' });
  const { volume, initial, count } = settings;
  if (!Number.isFinite(volume) || volume <= stationary.dragVolume) throw new Error(`Das Flüssigkeitsvolumen je Becken muss größer als das Verschleppungsvolumen je Bauteil (${stationary.dragVolume.toLocaleString('de-DE')} L) sein.`);
  if (!Number.isFinite(initial) || initial < 0) throw new Error('Die Anfangskonzentration muss mindestens 0 sein.');
  if (!Number.isInteger(count) || count < 1 || count > 10000) throw new Error('Bitte 1 bis 10.000 Bauteile berechnen.');
  const intervalMinutes = 60 / p.throughput;
  const q = stationary.freshFlow * intervalMinutes / volume;
  if (!Number.isFinite(q)) throw new Error('Die Zeit- und Wasserparameter liegen außerhalb des berechenbaren Bereichs.');
  let baths = Array(p.stages).fill(initial) as number[];
  const parts: PartRecord[] = Array.from({ length: count }, (_, index) => ({ number: index + 1, timeMinutes: (index + p.stages) * intervalMinutes, concentrations: [p.initialConcentration], bathsAtExit: [] }));
  let maxMassResidual = 0;
  let startupOverflowVolume = 0;
  // Additional parts keep entering until the last requested part has completed all stages.
  for (let step = 0; step < count + p.stages; step++) {
    for (let j = 0; j < Math.min(step, p.stages); j++) {
      const id = step - j;
      if (id <= count) {
        parts[id - 1].concentrations[j + 1] = baths[j];
        if (j === p.stages - 1) parts[id - 1].bathsAtExit = [...baths];
      }
    }
    if (step === count + p.stages - 1) break;
    const pulse = transfer(baths, step, stationary.dragVolume, volume, p.initialConcentration);
    maxMassResidual = Math.max(maxMassResidual, Math.abs(pulse.residual));
    startupOverflowVolume += pulse.overflowVolume;
    baths = advanceWater(pulse.baths, p.freshConcentration, q);
  }
  // Operational indicator at the same cycle phase, checked over the last 10 parts.
  // This is not a proof of proximity to the infinite-time limit.
  const tail = parts.slice(-11);
  const scale = Math.max(p.initialConcentration, p.freshConcentration, initial, 1e-12);
  const maxRecentChange = tail.length >= 11 ? Math.max(...tail.slice(1).map((row, j) => Math.max(...row.bathsAtExit.map((c, i) => Math.abs(c - tail[j].bathsAtExit[i]))))) / scale : null;
  return { parts, stationary, intervalMinutes, maxMassResidual, startupOverflowVolume, maxRecentChange,
    repeating: maxRecentChange !== null && maxRecentChange < 1e-5 };
}
