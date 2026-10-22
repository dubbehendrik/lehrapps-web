import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/components/Chart', () => ({ Chart: () => null }));
import { Diagram } from '../src/apps/vorbehandlungsverfahren/Diagram';
import { EnergyTerm } from '../src/apps/vorbehandlungsverfahren/App';
import { DEFAULTS, calculate } from '../src/apps/vorbehandlungsverfahren/logic';

describe('Vorbehandlung: Darstellung der Bilanz und Geometrie', () => {
 it('zeigt die Verdunstungszahlenwertgleichung im Energiebeitrag selbst', () => {
  const html=renderToStaticMarkup(createElement(EnergyTerm,{index:2}));
  expect(html).toContain('Verdunstungsmassenstromdichte');
  expect(html).toContain('3,07');
  expect(html).toContain('−5');
  expect(html).toContain('kg/(m² h)');
  expect(html).toContain('Verdunstungsmassenstrom:');
 });
 it('zeichnet nur ein Werkstück und verknüpft die Verschleppung mit dem Austauchpfad', () => {
  const html=renderToStaticMarkup(createElement(Diagram,{p:DEFAULTS,r:calculate(DEFAULTS,'dip')}));
  expect(html.match(/fill="#d7dcdf"/g)).toHaveLength(1);
  expect(html).toContain('M850 285H1130');
  expect(html).toContain('M850 475V130');
  expect(html).toContain('Wasseroberfläche:');
  expect(html).not.toContain('Q130'); // no wave path
 });
 it('verteilt die Düsen auf vier Seiten und führt den Umlauf oben an den Ring', () => {
  const r=calculate(DEFAULTS,'spray');
  const html=renderToStaticMarkup(createElement(Diagram,{p:DEFAULTS,r}));
  for(let side=0;side<4;side++)expect(html).toContain('data-nozzle-side="'+side+'"');
  // Both overview and detail show the default's calculated 10 nozzles.
  expect(html.match(/data-nozzle-side=/g)).toHaveLength(2*r.nozzlesPerRing);
  expect(html).toContain('M650 665H900V300H455V325');
  expect(html).toContain('stroke-width="5"');
  expect(html).toContain('marker-start=');
  expect(html).toContain('marker-end=');
  expect(html).not.toMatch(/NaN|Infinity/);
 });
 it('bleibt für einen Ring und eine sehr große Düsenanzahl endlich und begrenzt', () => {
  const p={...DEFAULTS,ringSpacing:20,nozzleSpacing:.01};
  const html=renderToStaticMarkup(createElement(Diagram,{p,r:calculate(p,'spray')}));
  expect(html).not.toMatch(/NaN|Infinity/);
  expect(html.match(/data-nozzle-side=/g)).toHaveLength(80);
 });
});
