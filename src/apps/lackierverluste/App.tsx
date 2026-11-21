import { useState, type ReactNode } from 'react';
import { MathFormula } from '../../components/MathFormula';
import { SupportFooter } from '../../components/SupportFooter';
import {
  addBatches, calculateBatch, defaults, emptyBatch, fillHeight, maxChargeHeight, retainedVolume, volumeAt,
  type Batch, type Cylinder, type Settings,
} from './logic';
import { ProcessSketch } from './ProcessSketch';
import { Waterfall } from './Waterfall';
import './style.css';

const format = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const scientific = new Intl.NumberFormat('de-DE', { notation: 'scientific', maximumFractionDigits: 1 });
const number = (value: number) => (value !== 0 && Math.abs(value) < 0.1 ? scientific : format).format(value);
const displayVolume = (value: number) => `${number(value)} ml`;
const tolerance = 1e-8;

function NumberField({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (value: number) => void;
}) {
  return <label>{label}
    <input type="number" value={Number.isNaN(value) ? '' : value} min={min} max={max} step="any"
      onChange={event => onChange(event.currentTarget.valueAsNumber)} />
  </label>;
}

function CylinderFields({ name, cylinder, onChange, children }: {
  name: string; cylinder: Cylinder; children?: ReactNode; onChange: (cylinder: Cylinder) => void;
}) {
  const fields = [
    { key: 'capacity', label: 'Fassungsvermögen [ml]', min: 1, max: 20000 },
    { key: 'diameter', label: 'Innen-Ø [mm]', min: 10, max: 500 },
    { key: 'wallFilm', label: 'Wandrest s [mm]', min: 0, max: 250 },
    { key: 'bottomRest', label: 'Gesamter Bodenrest B [mm]', min: 0, max: 200 },
  ] as const;

  return <fieldset>
    <legend>{name}</legend>
    <div className="loss-fields">
      {fields.map(({ key, ...field }) => <NumberField key={key} {...field} value={cylinder[key]}
        onChange={value => onChange({ ...cylinder, [key]: value })} />)}
      {children}
    </div>
  </fieldset>;
}

function validCylinder(cylinder: Cylinder) {
  const { diameter, capacity, wallFilm, bottomRest } = cylinder;
  return diameter >= 10 && diameter <= 500 && capacity >= 1 && capacity <= 20000
    && wallFilm >= 0 && wallFilm <= 250 && bottomRest >= 0 && bottomRest <= 200;
}

export default function LackierverlusteApp() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [history, setHistory] = useState<{ batch: Batch; total: Batch }[]>([]);
  const last = history.at(-1);
  const total = last?.total ?? emptyBatch;
  const { pail, mixingCup, sprayCup, useMixingCup } = settings;
  const firstCup = useMixingCup ? mixingCup : sprayCup;
  const valid = validCylinder(pail) && validCylinder(sprayCup) && (!useMixingCup || validCylinder(mixingCup))
    && settings.transferEfficiency >= 0 && settings.transferEfficiency <= 100;
  const pailRest = valid ? retainedVolume(pail.capacity, pail) : 0;
  const available = valid ? Math.max(0, pail.capacity - pailRest - total.withdrawn) : 0;
  const limit = valid ? maxChargeHeight(settings) : 0;
  const canFill = valid && settings.fillHeight >= 1 && settings.fillHeight <= limit + tolerance;
  const nextBatch = canFill && available > tolerance ? calculateBatch(available, settings) : undefined;

  function addCup() {
    if (!canFill) return;
    setHistory(previous => {
      const previousTotal = previous.at(-1)?.total ?? emptyBatch;
      const remaining = pail.capacity - pailRest - previousTotal.withdrawn;
      if (remaining <= tolerance) return previous;
      const batch = calculateBatch(remaining, settings);
      return [...previous, { batch, total: addBatches(previousTotal, batch) }];
    });
  }

  const rows = [
    { label: 'Entnahme aus Eimer', key: 'withdrawn' },
    ...(useMixingCup ? [{ label: 'Rest im Mischbecher', key: 'mixingRest' as const }] : []),
    { label: 'Einfüllung in RPS-Becher', key: 'sprayCupInput' },
    { label: 'Rest im RPS-Becher', key: 'sprayCupRest' },
    { label: 'Overspray', key: 'overspray' },
    { label: 'Auftrag auf Werkstück', key: 'deposited' },
  ] satisfies { label: string; key: keyof Batch }[];

  const chargeHeightField = <div>
    <NumberField label="Sollfüllhöhe [mm]" value={settings.fillHeight} min={1} max={Math.max(1, limit)}
      onChange={value => setSettings({ ...settings, fillHeight: value })} />
    {valid && limit >= 1 && <small>Max. {number(Math.floor((limit + tolerance) * 10) / 10)} mm</small>}
  </div>;
  const sketchSettings = {
    ...settings,
    pail: validCylinder(pail) ? pail : defaults.pail,
    mixingCup: validCylinder(mixingCup) ? mixingCup : defaults.mixingCup,
    sprayCup: validCylinder(sprayCup) ? sprayCup : defaults.sprayCup,
    transferEfficiency: Number.isFinite(settings.transferEfficiency)
      ? Math.max(0, Math.min(100, settings.transferEfficiency)) : defaults.transferEfficiency,
  };

  return <>
    <h1>Lackierverluste</h1>
    <details className="program-description">
      <summary>Programmbeschreibung</summary>
      <p>Verfolge den Lack vom Eimer über einen optionalen Mischbecher und den RPS-Becher bis zum Werkstück. Jeder Klick simuliert eine Charge mit frischen Bechern. Der letzte Becher kann eine Teilfüllung sein.</p>
      <h3>Geometrische Bilanz</h3>
      <p>Alle Behälter sind idealisierte Zylinder. Aus dem Innendurchmesser <i>D</i> und dem Fassungsvermögen ergibt sich die Innenhöhe. <i>s</i> ist die radiale Wandrestfilmdicke und <i>B</i> die gesamte axiale Bodenresthöhe. Der Wandrest wird oberhalb der Bodenzone bilanziert.</p>
      <div className="display-formula">
        <MathFormula label="Restvolumen ist das Minimum aus Einfüllvolumen und der Summe aus Boden- und Wandrest"
          markup="<msub><mi>V</mi><mtext>Rest</mtext></msub><mo>=</mo><mi>min</mi><mo>(</mo><msub><mi>V</mi><mtext>ein</mtext></msub><mo>,</mo><mi>A</mi><mo>·</mo><msub><mi>h</mi><mtext>Boden</mtext></msub><mo>+</mo><mo>(</mo><mi>A</mi><mo>−</mo><msub><mi>A</mi><mtext>frei</mtext></msub><mo>)</mo><mo>·</mo><mo>(</mo><msub><mi>H</mi><mtext>benetzt</mtext></msub><mo>−</mo><msub><mi>h</mi><mtext>Boden</mtext></msub><mo>)</mo><mo>)</mo>" />
      </div>
      <div className="display-formula">
        <MathFormula label="Querschnitte und wirksame Bodenresthöhe"
          markup="<mi>A</mi><mo>=</mo><mfrac><mrow><mi>π</mi><mo>·</mo><msup><mi>D</mi><mn>2</mn></msup></mrow><mn>4</mn></mfrac><mo>,</mo><mspace width='0.5em'/><msub><mi>A</mi><mtext>frei</mtext></msub><mo>=</mo><mfrac><mrow><mi>π</mi><mo>·</mo><msup><mrow><mi>max</mi><mo>(</mo><mn>0</mn><mo>,</mo><mi>D</mi><mo>−</mo><mn>2</mn><mo>·</mo><mi>s</mi><mo>)</mo></mrow><mn>2</mn></msup></mrow><mn>4</mn></mfrac><mo>,</mo><mspace width='0.5em'/><msub><mi>h</mi><mtext>Boden</mtext></msub><mo>=</mo><mi>min</mi><mo>(</mo><mi>B</mi><mo>,</mo><msub><mi>H</mi><mtext>benetzt</mtext></msub><mo>)</mo>" />
      </div>
      <h3>Modellannahmen und Grenzen</h3>
      <p>Im Eimer gilt die Anfangsfüllhöhe, im Mischbecher die tatsächliche Füllhöhe. Durch das Umdrehen auf der Pistole gilt die gesamte Innenhöhe des RPS-Bechers als benetzt. Sein Bodenrest liegt am ursprünglichen Becherboden, der beim Spritzen oben ist. Der Wandfilm umschließt den Becher über die gesamte Innenhöhe. Für Auslauf, Deckel und Sieb wird kein eigener Rückstand angesetzt. Geometrie und Restdicken sind Beispielwerte. Der Auftragswirkungsgrad bezieht sich auf die versprühte Menge.</p>
    </details>
    <section className="loss-app">
      <h2>Prozess und Chargenbilanz</h2>
      <fieldset disabled={history.length > 0} className="loss-settings">
        <legend>Prozessparameter</legend>
        <label className="loss-checkbox">
          <input type="checkbox" checked={useMixingCup}
            onChange={event => setSettings({ ...settings, useMixingCup: event.currentTarget.checked })} />
          Mit Mischbecher
        </label>
        <ProcessSketch settings={sketchSettings} available={available} pailRest={pailRest} batch={last?.batch}
          preview={nextBatch} format={number} settingsContent={{
            pail: <CylinderFields name="Maße Lackeimer" cylinder={pail}
              onChange={value => setSettings({ ...settings, pail: value })} />,
            mixingCup: <CylinderFields name="Maße Mischbecher" cylinder={mixingCup}
              onChange={value => setSettings({ ...settings, mixingCup: value })}>{chargeHeightField}</CylinderFields>,
            sprayCup: <CylinderFields name="Maße RPS-Becher" cylinder={sprayCup}
              onChange={value => setSettings({ ...settings, sprayCup: value })}>{!useMixingCup && chargeHeightField}</CylinderFields>,
            application: <NumberField label="Auftragswirkungsgrad [%]" value={settings.transferEfficiency} min={0} max={100}
              onChange={value => setSettings({ ...settings, transferEfficiency: value })} />,
          }} />
      </fieldset>
      <div className="loss-actions">
        <button type="button" disabled={!nextBatch} onClick={addCup}>Nächster Becher</button>
        <button type="button" disabled={!last} onClick={() => setHistory(previous => previous.slice(0, -1))}>Letzten Becher rückgängig</button>
        <button type="button" disabled={!last} onClick={() => setHistory([])}>Eimer zurücksetzen</button>
      </div>
      {valid && <p role="status">
        {history.length} {history.length === 1 ? 'Charge' : 'Chargen'} verarbeitet. Entnehmbarer Vorrat: <strong>{displayVolume(available > tolerance ? available : 0)}</strong>.
        {' '}Eimerrest: <strong>{displayVolume(pailRest)}</strong>.
        {available <= tolerance && ' Der Eimer ist bis auf den geometrischen Rest entleert.'}
      </p>}
      {nextBatch && <p>Nächste Charge: {displayVolume(nextBatch.withdrawn)} aus dem Eimer
        {nextBatch.withdrawn + tolerance < volumeAt(settings.fillHeight, firstCup) && ' (letzte Teilfüllung)'}.
        {' '}Füllhöhe im RPS-Becher: {number(fillHeight(nextBatch.sprayCupInput, sprayCup))} mm.
      </p>}
      {last && <p>Letzte Charge: {number(fillHeight(last.batch.sprayCupInput, sprayCup))} mm Füllhöhe im RPS-Becher.</p>}
      {history.length > 0 && <p>Für neue Einstellungen den Eimer zurücksetzen oder alle Chargen rückgängig machen.</p>}
      {!valid && <p role="alert">Bitte Behältermaße, Restdicken und AWG innerhalb der Feldgrenzen eingeben.</p>}
      {valid && !canFill && <p role="alert">Bitte Geometrie und Sollfüllhöhe prüfen. Die Sollfüllhöhe muss mindestens 1 mm betragen und beide Becherkapazitäten berücksichtigen.</p>}
      {valid && <Waterfall capacity={pail.capacity} available={available} pailRest={pailRest}
        batch={last?.batch} total={total} useMixingCup={useMixingCup} format={number} />}
      <div className="loss-table">
        <table>
          <caption>Lackvolumina je Charge und über alle verarbeiteten Chargen</caption>
          <thead><tr><th scope="col">Bilanzgröße</th><th scope="col">Letzte Charge</th><th scope="col">Kumuliert</th></tr></thead>
          <tbody>{rows.map(({ label, key }) => <tr key={key}>
            <th scope="row">{label}</th><td>{last ? displayVolume(last.batch[key]) : '—'}</td><td>{displayVolume(total[key])}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {valid && <p>Materialnutzung bezogen auf den anfänglichen Eimerinhalt: <strong>{number(100 * total.deposited / pail.capacity)} %</strong>.</p>}
    </section>
    <SupportFooter appName="Lackierverluste" />
  </>;
}
