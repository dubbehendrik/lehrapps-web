import { Link } from 'react-router-dom';
import { appCategories, appRegistry } from '../appRegistry';
import { SupportFooter } from './SupportFooter';

export function AppOverview() {
  return (
    <>
      <section className="overview-intro" aria-labelledby="overview-title">
        <p className="eyebrow">Hochschule Esslingen · Interaktive Lehre</p>
        <h1 id="overview-title">Lehr-Apps</h1>
        <p>Interaktive Programme basierend auf Inhalten aus den Vorlesungen Applikationstechnik, Anlagentechnik sowie der Verfahrenstechnik der Oberflächenbeschichtung – inklusive des zugehörigen Laborpraktikums.</p>
      </section>
      <section aria-label="Verfügbare Lehr-Apps">
        {appCategories.map(category => {
          const apps = appRegistry
            .filter(app => app.category === category.id)
            .sort((a, b) => a.overviewOrder - b.overviewOrder);
          return (
            <details key={category.id} className={`app-category app-category-${category.id}`} open>
              <summary><h2>{category.label}</h2><span className="category-count">{apps.length} {apps.length === 1 ? 'App' : 'Apps'}</span></summary>
              <ul className="app-grid">
                {apps.map(app => (
                  <li key={app.path}>
                    <Link className="app-card" to={app.path}>
                      <h3>{app.name}</h3>
                      <p>{app.description}</p>
                      <span className="app-card-action">App öffnen <span aria-hidden="true">→</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </section>
      <SupportFooter appName="Lehr-Apps" />
    </>
  );
}
