# lehrapps-web

Gemeinsame, rein browserbasierte Lehr-Apps mit React, TypeScript, Vite und Plotly. Apps: `/normalverteilung` und `/strahlbreite`.

## Lokal starten

Node.js 24 LTS, npm.

```sh
npm ci
npm run dev
```

`npm run build` führt zuerst Vitest und TypeScript-Prüfung aus und erstellt nur bei Erfolg `dist/`. `npm run preview` zeigt den Produktionsbuild. Abhängigkeiten sind exakt versioniert; `package-lock.json` ist verbindlich.

## Struktur

- `src/appRegistry.ts`: Namen, Routen und lazy geladene App-Komponenten; einzige Registrierung.
- `src/apps/normalverteilung/App.tsx`: Eingaben und Ergebnisse.
- `src/apps/normalverteilung/logic.ts`: unabhängige mathematische Funktionen und Validierung.
- `src/components/Chart.tsx`: gemeinsame responsive Plotly-Darstellung.
- `src/components/SupportFooter.tsx`: gemeinsames Feedback und Nutzungshinweise.
- `src/apps/strahlbreite/`: UI, Logik, Datentypen und Originalbeispiele.
- `docs/strahlbreite/migration.md`: fachliche Definitionen und Prüfprotokoll.
- `scripts/generate-strahlbreite-references.py`: SciPy-Referenzen für Strahlbreite.
- `src/lib/fitpack.ts`: browserbasierter kubischer FITPACK-Spline.
- `src/styles/global.css`: gemeinsame Gestaltung.
- `tests/`: mathematische Tests und Python-Referenzwerte.
- `public/`: Hochschullogo und SPA-Fallback.
- `docs/normalverteilung-migration.md`: vollständige Analyse, Entscheidungen und Prüfprotokoll.
- `docs/streamlit-reference.py`: unveränderte fachliche Referenz; wird nicht im Browser ausgeliefert.
- `scripts/generate-references.py`: reproduzierbare Python-Referenzgenerierung.

## Cloudflare Pages

GitHub-Repository `dubbehendrik/lehrapps-web`, Produktionsbranch `main`, Root-Verzeichnis Repository-Wurzel, Build-Befehl `npm run build`, Ausgabe `dist`, Umgebungsvariable `NODE_VERSION=24`. `public/_redirects` ermöglicht direkten Aufruf und Neuladen aller App-Routen. Der Build selbst blockiert Veröffentlichung bei fehlgeschlagenen Tests, unabhängig vom separat laufenden GitHub-Workflow.

Offizielle Dokumentation: https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/ und https://developers.cloudflare.com/pages/configuration/serving-pages/

## Versionsverwaltung

Repository: https://github.com/dubbehendrik/lehrapps-web

```sh
git clone https://github.com/dubbehendrik/lehrapps-web.git
cd lehrapps-web
npm ci
npm run dev
```

`main` ist der Produktionsbranch. Größere Änderungen auf Feature-Branches entwickeln. Rücknahme durch `git revert` des betreffenden Commits, anschließend Push. Keine neue Lizenz erteilt: Nutzungshinweis der Referenz-App bleibt erhalten.

Die bestehenden Streamlit-Repositories bleiben unverändert als Referenz und Fallback. Cloudflare Pages ist mit GitHub verbunden: https://lehrapps-web.pages.dev/normalverteilung und https://lehrapps-web.pages.dev/strahlbreite. Produktionsdeployments werden durch Änderungen an `main` ausgelöst.

## Lackverbrauchsrechnung

Route `/lackverbrauchsrechnung`: Materialbilanz, Produktionsplanung, Szenarienvergleich und CSV/Excel/PNG/SVG. Fachliche Referenz und Prüfung: [Migrationsdokumentation](docs/lackverbrauchsrechnung/migration.md).
