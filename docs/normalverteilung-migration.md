# Migration der Standardnormalverteilung

## Autoritative Quelle

Repository: https://github.com/dubbehendrik/Standardnormalverteilung

Datei `streamlit_standardnormalverteilung_app.py`, Blob-SHA `88277de6917fea74ec68180b52dbcb91345e421d`; analysiert am 08.10.2026. Vollständiger Baum geprüft: eine Python-App, Logo, README, requirements, drei Issue-Vorlagen. Keine weiteren fachlichen Module. requirements enthält Streamlit, pandas, NumPy, matplotlib, scipy und openpyxl; pandas und openpyxl werden von der App nicht verwendet. Bestehendes Repository unverändert.

## Vollständiger Funktionsumfang

| Element | Referenz |
|---|---|
| Verteilung | Z ~ N(0,1), dimensionslos; keine freien Parameter μ/σ |
| Dichte | exp(−z²/2)/sqrt(2π) |
| Verteilungsfunktion | scipy.special.ndtr |
| Bereichswahrscheinlichkeit | ndtr(b) − ndtr(a) |
| Eingaben | a und b, Zahlenfelder, min −6, max 6, Schritt 0,01 |
| Defaults | a = −1,96; b = 1,96 |
| Slider | gemeinsamer Bereichsslider; callbacks synchronisieren a, b und Zahlenfelder |
| Zustände | a_input, b_input, a, b, slider_vals |
| Raster | np.arange(−6,6,0.001), 12000 Punkte, Endpunkt ausgeschlossen |
| Dichteplot | blaue Kurve, grüne Fläche, gestrichelte vertikale Linien a/b, Raster, Achsen z/φ(z) |
| CDF-Plot | blaue Kurve, Bereich −0,05 bis 1,05, horizontale/vertikale Hilfslinien, Grenzpunkte, Beschriftung vier Nachkommastellen; Wendepunkt (0;0,5) |
| Ausgabe | P(a≤Z≤b), Φ(b)−Φ(a), Zahlen und Ergebnis vier Nachkommastellen, Grenzen zwei Nachkommastellen |
| Hinweise | einklappbar, Dichte-, CDF- und Intervallformeln, Bedienanleitung |
| Branding | Titel, HSE-Logo.jpg |
| Support | Fehler- und Feature-Links auf GitHub-Issue-Vorlagen |
| Footer | Demonstrations-/Lehrzweck, Gewähr-/Haftungshinweis, Verbot kommerzieller Verwendung, Mailkontakt |

Kein CSV-Export, Datenupload, frei wählbare Normalverteilung oder inverses Quantil in der Referenz. Keine solchen Funktionen hinzugefügt. Plotly ermöglicht den üblichen Diagrammexport.

## Sonderfälle und bewusste Änderungen

- a=b: Wahrscheinlichkeit null; Markierungen können zusammenfallen.
- a>b: Referenz besitzt keine fachliche Validierung; die Formel ergibt eine negative Zahl. Neue App zeigt Fehler und unterdrückt Ergebnis/Intervallmarkierung.
- Leere oder nicht endliche Eingaben und Grenzen außerhalb ±6: neue App zeigt konkrete Fehlermeldungen.
- Schrittweite 0,01 entspricht der Eingabebedienung, erzwingt aber keine Rundung der fachlichen Rechnung.
- Sehr kleine Intervalle: exakte Endpunkte für die Flächenzeichnung statt bloßer Rastermaske.
- Endpunkt +6 im Webdiagramm ergänzt; Rechnung unverändert rasterunabhängig.
- Slider mit zwei nativen, überlagerten Griffen und getrennten Tastaturfokussen; beide teilen denselben React-Zustand mit Zahlenfeldern. Vertauschte Grenzen werden nicht stillschweigend sortiert.
- Deutsche Dezimaldarstellung, zusätzlich Prozentwert. Formeln ohne zusätzliche Math-Rendering-Bibliothek als Unicode/lesbarer Text.
- Feedbacklinks zeigen auf das neue Repository; Original bleibt Referenz/Fallback.
- Footer lesbar statt extrem kleiner Schrift.

## Entscheidungen

Node 24 LTS; gemeinsame exakt versionierte npm-Abhängigkeiten. React Router erzeugt Routen aus appRegistry. Lazy App-Import verhindert Plotly-Laden vor Auswahl der App. Plotly-Basic-Bundle unterstützt die benötigten Scatterplots und ist kleiner als das vollständige Paket. Keine UI-/State-Bibliothek, kein Server. App-spezifische Hilfsfunktionen bleiben in logic.ts; keine spekulative gemeinsame Mathematikbibliothek. Keine types.ts nötig, weil keine eigenen komplexen Datentypen anfallen.

CDF: positive konvergente Reihe für das Integral von 0 bis |z|, skaliert mit φ(z). Gültigkeitsbereich explizit ±6, Vergleich gegen SciPy mit absoluter Toleranz 2e−14 (CDF), 3e−14 (Intervall). Keine Rundung vor Ausgabe. Für spätere allgemeine Normalverteilungen muss der Definitionsbereich neu beurteilt werden.

## Referenzfälle

Die unveränderte Python-Datei wird durch scripts/generate-references.py mit einem headless Streamlit-Adapter ausgeführt. Der Adapter ersetzt nur UI-Aufrufe, führt Zahlenfeld-/Slider-Callbacks aus und erfasst tatsächliche SciPy-Ergebnisse. Originalcode rechnet und erzeugt seine matplotlib-Grafiken. 11 Intervalle, beide Eingabepfade, insgesamt 22 Fälle. SciPy 1.17.0.

| Intervall | Erwartete Wahrscheinlichkeit, gerundet |
|---|---:|
| [−1,96;1,96] | 0,950004209703559 |
| [−1;1] | 0,682689492137086 |
| [0;1] | 0,341344746068543 |
| [−6;6] | 0,999999998026825 |
| [−6;0] und [0;6] | 0,499999999013412 |
| [0;0] und [2;2] | 0 |

Zusätzlich [1;1,01], [5,99;6], [−6;−5,99]; vollständige ungerundete Werte in tests/references.json.

## Prüfung

33 Vitest-Tests bestanden: 22 Python-Referenzen, Defaults, φ(0), Φ(0), Symmetrie/Monotonie/Wertebereich über 1201 z-Werte, identische Grenzen, vertauschte/unzulässige Grenzen, exakte Diagrammendpunkte und begrenzte Rastergröße. TypeScript-Prüfung und Vite-Produktionsbuild erfolgreich. Plotly-App-Bundle ca. 388 kB gzip; verbleibende Vite-Größenwarnung ist dokumentiert.

Das Repository dubbehendrik/lehrapps-web wurde über die GitHub-Weboberfläche angelegt; der geprüfte Stand wird über den Connector übertragen. Die Cloudflare-Verknüpfung und das Deployment sind noch offen. Das bestehende Streamlit-Repository bleibt unverändert.

Browserprüfung des Produktionsbuilds: Zahlenfelder, Tastatur-Slider-Synchronisierung, leere/gleiche/vertauschte Grenzen, Weiterleitung von /, Neuladen der App-URL, keine JavaScript-Seitenfehler. Desktop 1440 px, Tablet 768 px, Smartphone 390 px; Screenshots visuell geprüft. Entdeckte Layoutüberlagerung und horizontaler Überlauf wurden korrigiert. Der Wendepunkt wird im erklärenden Diagrammtext statt einer separaten Plotlegende bezeichnet. Grenzwerttexte nahe Φ=1 stehen unter dem Punkt, um Abschneiden zu vermeiden.
