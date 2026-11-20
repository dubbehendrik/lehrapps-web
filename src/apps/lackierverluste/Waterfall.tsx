import { useState } from 'react';
import type { Batch } from './logic';

type Step = { label: string; value: number; kind: 'start' | 'stock' | 'loss' | 'result' };

export function Waterfall({ capacity, available, pailRest, batch, total, useMixingCup, format }: {
  capacity: number; available: number; pailRest: number; batch?: Batch; total: Batch;
  useMixingCup: boolean; format: (value: number) => string;
}) {
  const [view, setView] = useState<'pail' | 'batch'>('pail');
  const isPail = view === 'pail';
  const values = isPail ? total : batch;

  return <section aria-labelledby="loss-waterfall-heading">
    <h3 id="loss-waterfall-heading">Wasserfalldiagramm</h3>
    <div className="loss-actions" role="group" aria-label="Bilanzansicht">
      <button type="button" aria-pressed={!isPail} onClick={() => setView('batch')}>Letzte Charge</button>
      <button type="button" aria-pressed={isPail} onClick={() => setView('pail')}>Gesamter Eimer</button>
    </div>
    {values ? <WaterfallBars {...{ capacity, available, pailRest, useMixingCup, format, isPail, values }} />
      : <p>Verarbeite einen Becher, um die Bilanz der letzten Charge anzuzeigen.</p>}
  </section>;
}

function WaterfallBars({ capacity, available, pailRest, values, useMixingCup, isPail, format }: {
  capacity: number; available: number; pailRest: number; values: Batch;
  useMixingCup: boolean; isPail: boolean; format: (value: number) => string;
}) {
  const initial = isPail ? capacity : values.withdrawn;
  const steps: Step[] = [{ label: isPail ? 'Anfangsinhalt' : 'Eimerentnahme', value: initial, kind: 'start' }];
  if (isPail) steps.push(
    { label: 'Entnehmbarer Vorrat', value: available, kind: 'stock' },
    { label: 'Eimerrest', value: pailRest, kind: 'loss' },
  );
  if (useMixingCup) steps.push({ label: 'Mischbecherrest', value: values.mixingRest, kind: 'loss' });
  steps.push(
    { label: 'RPS-Becherrest', value: values.sprayCupRest, kind: 'loss' },
    { label: 'Overspray', value: values.overspray, kind: 'loss' },
    { label: 'Werkstückauftrag', value: values.deposited, kind: 'result' },
  );

  let balance = initial;
  const relative = (value: number) => `${100 * value / initial}%`;
  return <figure className="loss-waterfall">
    <figcaption>Lackvolumen [ml]</figcaption>
    <ol>
      {steps.map(({ label, value, kind }, index) => {
        const deduction = kind === 'stock' || kind === 'loss';
        const offset = deduction ? Math.max(0, balance - value) : 0;
        if (deduction) balance = offset;
        const connector = index > 0 && kind !== 'result';
        return <li key={label}>
          <span>{label}</span>
          <span className="loss-waterfall-track" aria-hidden="true">
            {connector && <i className="loss-waterfall-connector" style={{ left: relative(offset + value) }} />}
            <i className={`loss-waterfall-bar loss-waterfall-${kind}`} style={{ left: relative(offset), width: relative(value) }} />
          </span>
          <strong>{deduction && value > 0 ? '−' : ''}{format(value)}</strong>
        </li>;
      })}
    </ol>
    <div className="loss-waterfall-axis" aria-hidden="true"><span>0</span><span>{format(initial / 2)}</span><span>{format(initial)}</span></div>
  </figure>;
}
