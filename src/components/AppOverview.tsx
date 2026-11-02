import { Link, useLocation } from 'react-router-dom';
import { appCategories } from '../appRegistry';
import { appsForCategory, categoryForLocation } from '../lib/appNavigation';
import { SupportFooter } from './SupportFooter';

export function AppOverview() {
  const location = useLocation();
  const categoryId = categoryForLocation(location.pathname, location.search);
  const category = appCategories.find(entry => entry.id === categoryId)!;
  const apps = appsForCategory(categoryId);
  return <>
    <section className="overview-intro" aria-label="Über die Lehr-Apps">
      <p>Interaktive Programme basierend auf Inhalten aus den Vorlesungen Applikationstechnik, Anlagentechnik sowie der Verfahrenstechnik der Oberflächenbeschichtung – inklusive des zugehörigen Laborpraktikums.</p>
    </section>
    <section className={`app-directory app-directory-${category.id}`} aria-labelledby="category-title">
      <h1 id="category-title">Fokus: {category.label}</h1>
      <p className="directory-count">{apps.length} {apps.length === 1 ? 'App' : 'Apps'}</p>
      <ul className="app-list">
        {apps.map(app => <li key={app.path}>
          <h2><Link to={app.path}>{app.name}<span aria-hidden="true"> →</span></Link></h2>
          <p>{app.description}</p>
        </li>)}
      </ul>
    </section>
    <SupportFooter appName="Lehr-Apps" />
  </>;
}
