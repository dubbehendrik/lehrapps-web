import { Link, useLocation } from 'react-router-dom';
import { appTags } from '../appRegistry';
import { filterQuery, filteredApps, readAppFilter } from '../lib/appNavigation';
import { SupportFooter } from './SupportFooter';

export function AppOverview() {
  const location = useLocation();
  const filter = readAppFilter(location.search);
  const apps = filteredApps(filter);
  return <>
    <section className="overview-intro" aria-label="Über die Lehr-Apps">
      <p>Interaktive Programme basierend auf Inhalten aus den Vorlesungen Applikationstechnik, Anlagentechnik sowie der Verfahrenstechnik der Oberflächenbeschichtung – inklusive des zugehörigen Laborpraktikums.</p>
    </section>
    <section className="app-directory" aria-label="Programme">
      <p className="directory-count" role="status">{apps.length} {apps.length === 1 ? 'Programm' : 'Programme'} · {filter.tags.length ? (filter.mode === 'AND' ? 'Alle gewählten Hashtags' : 'Mindestens ein gewählter Hashtag') : 'Alle Programme'}</p>
      {apps.length === 0 && <p>Keine Programme mit dieser Hashtag-Kombination. Entferne einen Hashtag oder schalte auf OR um.</p>}
      <ul className="app-list">
        {apps.map(app => <li key={app.path} className="app-list-row">
          <div className="app-list-description">
            <h2>{app.name}</h2>
            <p>{app.description}</p>
            <p className="app-assigned-tags">{appTags.filter(tag => app.tags.includes(tag.id)).map(tag => '#' + tag.label).join(' · ')}</p>
          </div>
          <Link className="button-link app-open" to={app.path + filterQuery(filter)} aria-label={`${app.name} öffnen`}>Öffnen</Link>
        </li>)}
      </ul>
    </section>
    <SupportFooter appName="Lehr-Apps" />
  </>;
}
