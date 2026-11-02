import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/components/Chart', () => ({ Chart: () => null }));
vi.mock('plotly.js-basic-dist-min', () => ({ default: {} }));
vi.mock('plotly.js-cartesian-dist-min', () => ({ default: {} }));
vi.mock('plotly.js-gl3d-dist-min', () => ({ default: {} }));
vi.mock('react-plotly.js/factory', () => ({ default: () => () => null }));
vi.mock('../src/apps/roboter-bahnplanung/MapView', () => ({ default: () => null }));
const apps = import.meta.glob<{ default: ComponentType }>('../src/apps/*/App.tsx');
describe('shared app entry layout', () => {
  beforeEach(() => vi.stubGlobal('window', { innerWidth: 1440 }));
  afterEach(() => vi.unstubAllGlobals());
  it.each(Object.entries(apps))('%s starts with a title and a collapsed program description', async (_path, load) => {
    const { default: App } = await load();
    const html = renderToStaticMarkup(createElement(App));
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
    const afterTitle=html.slice(html.indexOf('</h1>')+5);
    expect(afterTitle).toMatch(/^\s*<details[^>]*class="[^"]*\bprogram-description\b[^"]*"[^>]*>\s*<summary>Programmbeschreibung<\/summary>/);
    const details=afterTitle.match(/^\s*<details[^>]*>/)![0];
    expect(details).not.toMatch(/\sopen(?:=|\s|>)/);
  });
});
