import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/components/Chart',()=>({Chart:()=>null}));
vi.mock('../src/apps/roboter-bahnplanung/MapView',()=>({default:()=>null}));
import App from '../src/apps/roboter-bahnplanung/App';
import ProgramFormulas from '../src/apps/roboter-bahnplanung/ProgramFormulas';
describe('Lackierdemo: Programminformation und Ansichtsfolge',()=>{
 it('startet mit eingeklappter Programmbeschreibung direkt unter dem Titel',()=>{
   const html=renderToStaticMarkup(createElement(App));
   const match=html.match(/<details class="rb-program-info"[^>]*>/);
   expect(match).not.toBeNull();expect(match![0]).not.toContain('open');
   expect(html.indexOf('rb-program-info')).toBeGreaterThan(html.indexOf('</h1>'));
   expect(html.indexOf('rb-program-info')).toBeLessThan(html.indexOf('rb-steps'));
   expect(html.indexOf('Blech &amp; Bahn · 2D')).toBeLessThan(html.indexOf('Schichtwachstum · 3D'));
   expect(html.indexOf('Schichtwachstum · 3D')).toBeLessThan(html.indexOf('Roboter &amp; Auftrag · 3D'));
 });
 it('setzt Formeln mit echten Integralgrenzen, Brüchen und Indizes',()=>{
   const html=renderToStaticMarkup(createElement(ProgramFormulas));
   expect(html.match(/<math /g)).toHaveLength(5);expect(html).toContain('<mfrac>');expect(html).toContain('<msubsup>');expect(html).toContain('<msub>');expect(html).toContain('<msqrt>');
 });
});
