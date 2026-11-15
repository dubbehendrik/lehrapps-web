import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { readAppFilter, filterQuery, toggleTag, filteredApps } from '../src/lib/appNavigation';
import { appTags, appRegistry } from '../src/appRegistry';
import { SiteHeader } from '../src/components/SiteHeader';
import { AppOverview } from '../src/components/AppOverview';
import assignments from './fixtures/app-tags.json';
const page = (url: string) => renderToStaticMarkup(<MemoryRouter initialEntries={[url]}><SiteHeader/><AppOverview/></MemoryRouter>);
describe('hashtag directory', () => {
  it('uses AND by default and shows every app without filters', () => {
    expect(readAppFilter('')).toEqual({tags:[],mode:'AND'});
    expect(filteredApps(readAppFilter(''))).toHaveLength(appRegistry.length);
  });
  it('preserves the exact user-approved assignments for every app', () => {
    expect(Object.keys(assignments).sort()).toEqual(appRegistry.map(app=>app.name).sort());
    for(const app of appRegistry) expect(app.tags).toEqual(assignments[app.name as keyof typeof assignments]);
  });
  it('requires both tags in AND but accepts either in OR', () => {
    const filter={tags:['labor','mathematik'],mode:'AND' as const};
    expect(filteredApps(filter).map(app=>app.name)).toEqual(['Bayes’sche Optimierung']);
    const names=filteredApps({...filter,mode:'OR'}).map(app=>app.name);
    expect(names).toContain('Flock-Inspector');expect(names).toContain('Normalverteilung');
    expect(names).not.toContain('Zerfallsarten');
  });
  it('handles empty intersections', () => expect(filteredApps({tags:['labor','automatisierung'],mode:'AND'})).toEqual([]));
  it('sorts filtered results alphabetically using German collation', () => {
    const names=filteredApps({tags:[],mode:'AND'}).map(app=>app.name);
    expect(names).toEqual([...names].sort((a,b)=>a.localeCompare(b,'de')));
    expect(names.indexOf('Lackverbrauchsrechnung')).toBeLessThan(names.indexOf('Laminar-Turbulent Übergang (schematisch)'));
  });
  it('ignores invalid tags and modes and deduplicates URL parameters', () => {
    expect(readAppFilter('?tag=unknown&tag=labor&tag=labor&mode=wrong')).toEqual({tags:['labor'],mode:'AND'});
    expect(readAppFilter('?fokus=vorlesung')).toEqual({tags:['vorlesung'],mode:'AND'});
    expect(readAppFilter('?tag=mathematik&fokus=labor')).toEqual({tags:['mathematik'],mode:'AND'});
  });
  it('round-trips filters, toggles tags off, and retains OR with no selected tags', () => {
    const filter={tags:['labor','mathematik'],mode:'OR' as const};
    expect(readAppFilter(filterQuery(filter))).toEqual(filter);
    expect(toggleTag(filter,'labor').tags).toEqual(['mathematik']);
    expect(toggleTag(filter,'unknown')).toEqual(filter);
    expect(readAppFilter(filterQuery({tags:[],mode:'OR'}))).toEqual({tags:[],mode:'OR'});
  });
  it.each(appTags)('renders only matching apps for $label', tag => {
    const html=page('/?tag='+tag.id);
    for(const app of appRegistry) expect(html.includes('aria-label="'+app.name+' öffnen"')).toBe(app.tags.includes(tag.id));
    expect(html).not.toContain('Fokus:');expect(html).not.toContain('app-card');
  });
  it('preserves filters in the app opening link', () => {
    const html=page('/?tag=labor&tag=mathematik&mode=OR');
    expect(html).toContain('/bayes-optimierung?tag=labor&amp;tag=mathematik&amp;mode=OR');
    expect(html).toContain('Öffnen</a>');
  });
  it('renders seven independently pressed filters and the mode toggle on an app page', () => {
    const html=renderToStaticMarkup(<MemoryRouter initialEntries={['/bls-bahnplanung?tag=vorlesung&mode=OR']}><SiteHeader/></MemoryRouter>);
    expect(html.match(/<button /g)).toHaveLength(8);
    expect(html).toContain('Filterverknüpfung: OR. Auf AND umschalten');
    expect(html).toContain('#Mathematik &amp; Statistik');
    expect(html).toContain('<p class="site-name">Lehr-Apps</p>');
  });
});
