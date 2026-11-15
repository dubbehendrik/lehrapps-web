import { appTags, appRegistry } from '../appRegistry';
export type FilterMode = 'AND' | 'OR';
export interface AppFilter { tags: string[]; mode: FilterMode }
const valid = new Set<string>(appTags.map(tag => tag.id));

export function readAppFilter(search: string): AppFilter {
  const query = new URLSearchParams(search);
  const requested = query.has('tag') ? query.getAll('tag') : [query.get('fokus') ?? ''];
  return { tags: [...new Set(requested.filter(tag => valid.has(tag)))], mode: query.get('mode') === 'OR' ? 'OR' : 'AND' };
}
export function filterQuery(filter: AppFilter) {
  const query = new URLSearchParams();
  for (const tag of appTags) if (filter.tags.includes(tag.id)) query.append('tag', tag.id);
  if (filter.mode === 'OR') query.set('mode', 'OR');
  return query.size ? '?' + query.toString() : '';
}
export function toggleTag(filter: AppFilter, tag: string): AppFilter {
  if (!valid.has(tag)) return filter;
  return { ...filter, tags: filter.tags.includes(tag) ? filter.tags.filter(value => value !== tag) : [...filter.tags, tag] };
}
export function filteredApps(filter: AppFilter) {
  return appRegistry.filter(app => !filter.tags.length || (filter.mode === 'AND'
    ? filter.tags.every(tag => app.tags.includes(tag))
    : filter.tags.some(tag => app.tags.includes(tag))))
    .sort((a,b) => a.name.localeCompare(b.name, 'de'));
}
