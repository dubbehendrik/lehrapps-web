import { createRoot } from 'react-dom/client';
import FlockInspector from '../apps/flock-inspector/App';
import '../styles/global.css';

createRoot(document.getElementById('root')!).render(<>
  <header className="site-header"><strong>Lehr-Apps · Offline</strong></header>
  <main>
    <p>Offline-Version · Stand {import.meta.env.VITE_OFFLINE_VERSION}. Bilder und Messwerte werden lokal verarbeitet. Projekte bitte als ZIP speichern; beim Schließen geht der ungespeicherte Stand verloren.</p>
    <FlockInspector />
  </main>
</>);
