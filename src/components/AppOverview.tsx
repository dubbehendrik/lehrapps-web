import { Link } from 'react-router-dom';
import { appRegistry } from '../appRegistry';
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
        <ul className="app-grid">
          {appRegistry.map(app => (
            <li key={app.path}>
              <Link className="app-card" to={app.path}>
                <h2>{app.name}</h2>
                <p>{app.description}</p>
                <span className="app-card-action">App öffnen <span aria-hidden="true">→</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <SupportFooter appName="Lehr-Apps" />
    </>
  );
}
