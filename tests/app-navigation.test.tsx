import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { categoryForLocation, appsForCategory } from '../src/lib/appNavigation';
import { appCategories, appRegistry } from '../src/appRegistry';
import { SiteHeader } from '../src/components/SiteHeader';
import { AppOverview } from '../src/components/AppOverview';

const page = (url: string) => renderToStaticMarkup(<MemoryRouter initialEntries={[url]}><SiteHeader/><AppOverview/></MemoryRouter>);
describe('shared category navigation', () => {
  it('starts in Labor and recovers invalid category queries', () => {
    expect(categoryForLocation('/', '')).toBe('labor');
    expect(categoryForLocation('/', '?fokus=unknown')).toBe('labor');
  });
  it.each(appRegistry)('highlights the category for a direct visit to $path', app => {
    expect(categoryForLocation(app.path, '?fokus=wrong')).toBe(app.category);
    expect(categoryForLocation(app.path.toLowerCase()+'/', '')).toBe(app.category);
  });
  it('routes both planning demos into automation', () => {
    expect(appsForCategory('automatisierung').map(app => app.path)).toEqual(['/roboter-bahnplanung','/bls-bahnplanung']);
  });
  it.each(appCategories)('shows exactly the selected $label list', category => {
    const html = page('/?fokus='+category.id);
    const matches = [...html.matchAll(/<h2><a href="([^"]+)"/g)].map(match => match[1]);
    expect(matches).toEqual(appsForCategory(category.id).map(app=>app.path));
    expect(html).toContain('Fokus: '+category.label);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).not.toContain('Software Downloads');
    expect(html).not.toContain('app-card');
  });
  it('keeps category selection links available from within an app', () => {
    const html=renderToStaticMarkup(<MemoryRouter initialEntries={['/bls-bahnplanung']}><SiteHeader/></MemoryRouter>);
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/\?fokus=automatisierung"/);
    expect(html.match(/<a /g)).toHaveLength(4);
    expect(html).toContain('<p class="site-name">Lehr-Apps</p>');
  });
});
