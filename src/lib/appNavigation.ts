import { appCategories, appRegistry } from '../appRegistry';

export function categoryForLocation(pathname: string, search: string) {
  const path = pathname.replace(/\/$/, '').toLowerCase();
  const app = appRegistry.find(entry => entry.path.toLowerCase() === path);
  if (app) return app.category;
  const requested = new URLSearchParams(search).get('fokus');
  return appCategories.find(category => category.id === requested)?.id ?? 'labor';
}

export function appsForCategory(category: string) {
  return appRegistry.filter(app => app.category === category)
    .sort((a, b) => a.overviewOrder - b.overviewOrder);
}
