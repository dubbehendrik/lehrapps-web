import { describe, it, expect } from 'vitest';
import { DEFAULT, INITIAL, SCENARIOS, makeKernel, makePath, poseAt, section, simulate, stats, validate, valuesAt, type Settings } from '../src/apps/roboter-bahnplanung/model';
import { dryVolumeRate, thicknessRate, singlePass, RECONSTRUCTION, REFERENCE_BRUSH, modelNotes } from '../src/apps/roboter-bahnplanung/spray';
const config = (updates: Partial<Settings> = {}): Settings => ({ ...structuredClone(DEFAULT), ...updates });
const spot = () => config({ scenario: 'spot', startU: 300, startV: 200 });
describe('Rotationssymmetrisches Lehrmodell', () => {
  it.each([450, 500, 550])('normiert das Spritzbild unabhängig von Lenkluft %s und Abstand', innerAir => {
    for (const distance of [100, 250, 500]) for (const voltage of [0, 100]) {
      const k = makeKernel({ ...DEFAULT.brush, innerAir, distance, voltage });
      const n = 10000, dr = k.support / n;
      let integral = 0;
      for (let i = 0; i < n; i++) { const r = (i + .5) * dr; integral += 2 * Math.PI * r * k.density(r) * dr; }
      expect(integral).toBeCloseTo(1, 5);
      expect(k.density(k.support + 1)).toBe(0);
    }
  });
  it('zeigt zwei symmetrische Maxima im diametralen Schnitt statt eines Zentralmaximums', () => {
    const k = makeKernel(DEFAULT.brush);
    expect(k.density(k.radius)).toBeGreaterThan(k.density(0) * 1.5);
    expect(k.density(k.radius + 4 * k.sigma)).toBeLessThan(k.density(k.radius) / 2);
  });
  it('verbreitert das Profil mit größerem Abstand und erhält die normierte Materialmenge', () => {
    const a = makeKernel(DEFAULT.brush), b = makeKernel({ ...DEFAULT.brush, distance: 250 });
    const moment = (k: ReturnType<typeof makeKernel>) => {let m=0;for(let r=.5;r<k.support;r++)m+=2*Math.PI*r*r*r*k.density(r);return m;};
    expect(moment(b)).toBeGreaterThan(moment(a)); expect(b.eta).toBe(a.eta);
  });
  it('verwendet stationär exakt denselben Kernel wie beim Bahnauftrag', () => {
    const c = spot(), r = simulate(c), k = makeKernel(c.brush), final = r.frames[80].values;
    const i = 35, j = 27;
    const expected = dryVolumeRate(c.brush) * 1000 * k.eta * c.hold * k.density(Math.hypot(r.u[i] - c.startU, r.v[j] - c.startV));
    expect(final[j * r.u.length + i]).toBeCloseTo(expected, 3);
    expect(r.captured / r.supplied).toBeLessThan(k.eta);
  });
  it('verdoppelt den Auftrag bei doppelter stationärer Spritzdauer oder doppeltem Festkörperanteil', () => {
    const a = simulate(spot()), b = simulate({ ...spot(), hold: 6 }), c = simulate({ ...spot(), brush: { ...DEFAULT.brush, solids: DEFAULT.brush.solids / 2 } });
    expect(b.max).toBeCloseTo(a.max * 2, 3); expect(c.max).toBeCloseTo(a.max / 2, 3);
    expect(b.captured).toBeCloseTo(a.captured * 2, 4);
  });
  it('liefert bei Fördermenge null über alle Zeitstände Auftrag null', () => {
    const r = simulate({ ...spot(), brush: { ...DEFAULT.brush, flow: 0 } });
    expect(r.max).toBe(0); expect(r.captured).toBe(0); expect(r.supplied).toBe(0);
    expect(r.frames.every(f => f.values.every(v => v === 0))).toBe(true);
  });
  it('erfasst Overspray als fehlenden Blechauftrag und normiert nicht auf die Blechfläche nach', () => {
    const large = { ...spot(), sheetWidth: 1200, sheetHeight: 1200, startU: 600, startV: 600 };
    const middle = simulate(large), edge = simulate({ ...large, startU: 0 }), outside = simulate({ ...large, startU: -1000 });
    expect(edge.captured / middle.captured).toBeCloseTo(.5, 2);
    expect(outside.captured).toBe(0); expect(outside.supplied).toBeGreaterThan(0);
  });
  it('halbiert den Auftrag einer Einzelbahn bei doppelter Geschwindigkeit', () => {
    const a = simulate(config({ scenario: 'line' })), b = simulate(config({ scenario: 'line', speed: 400 }));
    expect(b.path.duration).toBe(a.path.duration / 2);
    expect(b.max).toBeCloseTo(a.max / 2, 3);
    expect(b.captured).toBeCloseTo(a.captured / 2, 5);
  });
  it('speichert unveränderliche, monotone Zeitstände und interpoliert zwischen ihnen', () => {
    const r = simulate(spot());
    expect(r.frames).toHaveLength(81);
    for (let k = 1; k <= 80; k++) for (let i = 0; i < r.u.length * r.v.length; i += 37)
      expect(r.frames[k].values[i]).toBeGreaterThanOrEqual(r.frames[k - 1].values[i]);
    const values = valuesAt(r, r.path.duration / 160);
    expect(values[2000]).toBeCloseTo(r.frames[1].values[2000] / 2, 5);
    expect(r.frames[0].values.every(v => v === 0)).toBe(true);
  });
  it('unterstützt sämtliche erzeugten Szenarien mit endlichem Auftrag und positiver Dauer', () => {
    for (const scenario of Object.keys(SCENARIOS) as Settings['scenario'][]) {
      const c = config({ scenario, startU: scenario === 'spot' ? 300 : -60, startV: scenario === 'spot' ? 200 : -60 });
      const r = simulate(c);
      expect(r.path.duration).toBeGreaterThan(0); expect(r.max).toBeGreaterThan(0);
      expect(r.frames[80].values.every(Number.isFinite)).toBe(true);
      expect(r.captured).toBeLessThanOrEqual(r.supplied * makeKernel(c.brush).eta * 1.001);
    }
  });
  it('kann mittige Einzelbahnen vertikal planen und im Zentrum halten', () => {
    const p = makePath(config({ scenario: 'lineHold', lineAxis: 'vertical' }));
    expect(p.points[0]).toEqual({ u: 300, v: -60 }); expect(p.points[1]).toEqual({ u: 300, v: 200 });
    expect(p.segments.at(-1)?.phase).toBe('Im Zentrum halten');
    expect(p.duration).toBeCloseTo(260 / 200 + DEFAULT.hold);
  });
  it('schaltet Materialauftrag auf Wendestrecken ausdrücklich ab', () => {
    const on = makePath(DEFAULT), off = makePath({ ...DEFAULT, coatTurns: false });
    expect(off.duration).toBe(on.duration); expect(off.sprayDuration).toBeLessThan(on.sprayDuration);
    expect(off.segments.some(s => !s.spray)).toBe(true);
    const s = off.segments.find(s => !s.spray)!;
    expect(poseAt(off, (s.start + s.end) / 2).spray).toBe(false);
  });
  it('erzeugt bei Keil zunehmender Dichte kleiner werdende Bahnabstände', () => {
    const p = makePath(config({ scenario: 'wedge', wedgeEnd: 200 }));
    const v = p.segments.filter(s => s.a.v === s.b.v).map(s => s.a.v);
    expect(v[1] - v[0]).toBeGreaterThan(v.at(-1)! - v.at(-2)!);
  });
  it('wertet Schnitte in beiden Richtungen mit korrekter Interpolation aus', () => {
    const r = simulate(spot()), values = new Float32Array(r.u.length * r.v.length);
    r.v.forEach((v, j) => r.u.forEach((u, i) => { values[j * r.u.length + i] = u + 2 * v; }));
    const h = section(r, values, 'u', 150), v = section(r, values, 'v', 200);
    expect(h[30]).toBeCloseTo(r.u[30] + 300); expect(v[30]).toBeCloseTo(200 + 2 * r.v[30]);
    const constant = values.map(() => 2); expect(stats(r, constant, 20)).toEqual({ mean: 2, min: 2, max: 2, cv: 0 });
  });
  it('weist ungültige Eingaben und überlange Versuche zurück', () => {
    expect(validate(config({ brush: { ...DEFAULT.brush, distance: 0 } })).length).toBeGreaterThan(0);
    expect(() => simulate(config({ speed: 0 }))).toThrow();
    expect(() => simulate(config({ width: 1500, height: 1500, pitchU: 50, pitchV: 50, speed: 10 }))).toThrow('600 s');
  });
});

// Guard the initial experiment independently of moving-path defaults.
describe('Einstieg mit statischem Spritzbild', () => {
  it('startet mittig mit fertigem, rotationssymmetrischem Auftrag', () => {
    expect(INITIAL.scenario).toBe('spot');
    expect(INITIAL.startU).toBe(INITIAL.sheetWidth / 2);
    expect(INITIAL.startV).toBe(INITIAL.sheetHeight / 2);
    const r = simulate(INITIAL);
    expect(r.path.length).toBe(0);
    expect(r.path.duration).toBe(INITIAL.hold);
    expect(r.max).toBeGreaterThan(0);
    const cut = section(r, r.frames[80].values, 'u', INITIAL.startV);
    cut.forEach((v, i) => expect(v).toBeCloseTo(cut[cut.length - 1 - i], 5));
  });
});


describe('Literaturgestützte Rückrechnung und µm-Skala', () => {
  it('reproduziert das veröffentlichte symmetrisierte Einzelbahnprofil nach Vorwärtsintegration', () => {
    const d=RECONSTRUCTION, observed=d.curves.measured.observedSymmetric;
    const predicted=d.xMm.map(x=>singlePass(REFERENCE_BRUSH,x));
    const wmape=predicted.reduce((s,v,i)=>s+Math.abs(v-observed[i]),0)/observed.reduce((a,b)=>a+b,0)*100;
    expect(wmape).toBeLessThan(1.5);
    // Independent physical dimensional check: feed solid volume = 2375 mm³/s.
    expect(dryVolumeRate(REFERENCE_BRUSH)).toBeCloseTo(2375,8);
    expect(Math.max(...predicted)).toBeGreaterThan(40);expect(Math.max(...predicted)).toBeLessThan(55);
    expect(d.etaReference).toBeGreaterThan(.85);expect(d.etaReference).toBeLessThan(.95);
  });
  it('liefert die stationäre µm/s-Verteilung statt einer rotierten Einzelbahnkurve', () => {
    const k=makeKernel(REFERENCE_BRUSH);
    expect(thicknessRate(REFERENCE_BRUSH,k,k.radius)).toBeGreaterThan(25);
    expect(thicknessRate(REFERENCE_BRUSH,k,k.radius)).toBeLessThan(32);
    expect(k.radius).toBeGreaterThan(40);expect(k.radius).toBeLessThan(100);
  });
  it('integriert auch die bewegte Bahn in denselben physikalischen µm-Maßstab', () => {
    const c={...DEFAULT,scenario:'line' as const,startU:-300,width:1200,speed:150};
    const r=simulate(c),i=60,j=55;
    const expected=singlePass(c.brush,r.v[j]-c.sheetHeight/2,c.speed);
    expect(Math.abs(r.frames[80].values[j*r.u.length+i]/expected-1)).toBeLessThan(.002);
  });
  it('verändert das Profil durch alle sechs Planungsparameter, ohne Material zu erzeugen', () => {
    for(const patch of [{distance:250},{innerAir:550},{outerAir:82.5},{rpm:38500},{voltage:71.5},{flow:275}]) {
      const k=makeKernel({...REFERENCE_BRUSH,...patch}), ref=makeKernel(REFERENCE_BRUSH);
      const diff=Array.from({length:250},(_,i)=>Math.abs(k.density(i*2)-ref.density(i*2))).reduce((a,b)=>a+b,0);
      expect(diff).toBeGreaterThan(1e-9);
      let norm=0;for(let r=.25;r<500;r+=.5){expect(k.density(r)).toBeGreaterThanOrEqual(0);norm+=2*Math.PI*r*k.density(r)*.5;}
      expect(norm).toBeCloseTo(1,4);
    }
  });
  it('kennzeichnet Extrapolation und weist veraltete oder unvollständige Einstellungen zurück', () => {
    expect(modelNotes(REFERENCE_BRUSH).outside).toBe(false);
    expect(modelNotes({...REFERENCE_BRUSH,flow:500}).outside).toBe(true);
    expect(validate({...INITIAL,brush:{air:50} as unknown as Settings['brush']}).length).toBeGreaterThan(0);
    expect(validate({...INITIAL,brush:{...REFERENCE_BRUSH,solids:0}}).length).toBeGreaterThan(0);
  });
  it('bilanziert große Bleche in mm³ Festkörper bei µm-Schichtdicken', () => {
    const r=simulate({...INITIAL,sheetWidth:1200,sheetHeight:1200,startU:600,startV:600});
    const k=makeKernel(r.config.brush);
    const deposited=r.frames[80].values.reduce((a,b)=>a+b,0)*r.du*r.dv/1000;
    expect(r.captured).toBeCloseTo(deposited,5);
    expect(r.captured/r.supplied).toBeCloseTo(k.eta,3);
    expect(r.supplied).toBeCloseTo(2375*INITIAL.hold,8);
  });
});
