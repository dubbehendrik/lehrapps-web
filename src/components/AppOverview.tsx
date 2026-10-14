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
            <details key={category.id} className={`app-category app-category-${category.id}`}>
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
      <section className="app-category" aria-labelledby="labor-downloads-title">
        <h2 id="labor-downloads-title">Programme für den Laborrechner</h2>
        <ul className="app-grid">
          <li>
            <a className="app-card" href="https://github.com/dubbehendrik/schichtdicken-messtisch/releases/latest" target="_blank" rel="noopener noreferrer">
              <h3>Roboterschichtdicken Messtisch</h3>
              <p>Windows-Anwendung zur robotergestützten Schichtdickenmessung mit DOBOT Magician und MEGA-CHECK DX. Programmplanung, Einlernen, Messarchiv und Excel-Export.</p>
              <span className="app-card-action">Aktuellen Windows-Installer auf GitHub laden →</span>
              <p>Laborversion · GitHub-Anmeldung und Repository-Zugriff erforderlich.</p>
            </a>
            <p><a href="https://github.com/dubbehendrik/schichtdicken-messtisch" target="_blank" rel="noopener noreferrer">Quellcode und Dokumentation im Repository</a></p>
          </li>
        </ul>
      </section>
      <SupportFooter appName="Lehr-Apps" />
    </>
  );
}
