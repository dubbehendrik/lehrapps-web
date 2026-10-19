# Wärmeleitung im Stab

Route: `/waermeleitung-stab`. Neue 1D-Lehr-App; fachliche/didaktische Abnahme durch den Lehrenden steht aus.

## Modell

Konservative Finite Volumes für axialen Wärmetransport, konstante Eigenschaften je Segment, zellweise Mantelkonvektion zur gemeinsamen oder segmentweise vorgegebenen Umgebung. Querschnittstemperatur wird als einheitlich angenommen. Mindestens acht Zellen je Segment, etwa 160 insgesamt. Impliziter Euler mit 2.000 Schritten, 201 gespeicherten Zeitpunkten, Berechnung in einem Web Worker. Nicht als allgemeine Simulationssoftware gedacht.

Zwischen Zellen werden die beiden halben Leitungswiderstände und gegebenenfalls `R_K / min(A_left,A_right)` in Serie geschaltet. `R_K` bezeichnet ausdrücklich den FLÄCHENBEZOGENEN Kontaktwiderstand in m² K/W. Stirnkonvektion wird einschließlich des halben Zellenleitungswiderstands berücksichtigt. Neumann-Wärmestromdichten sind an beiden Enden nach außen positiv. Schulterkonvektion wirkt näherungsweise an der Randzelle des größeren Segments. Zusätzlicher makroskopischer Wärmeausbreitungswiderstand an Durchmessersprüngen wird nicht berechnet.

Stationär: Bei Temperaturankopplung tridiagonales lineares Gleichungssystem. Bei reinen Neumann-Rändern ohne Wärmeübergang wird die Nettozufuhr geprüft. Bei ausgeglichener Zufuhr bestimmt die erhaltene Anfangsenergie das Temperaturniveau, bei unausgeglichener Zufuhr gibt es kein stationäres Profil. Kein langes Zeitprofil wird als stationär ausgegeben.

Kontaktflächen-Temperaturen werden aus dem zellzentrierten Profil und den halben Leitungswiderständen rekonstruiert. Die Diagrammlinien werden je Segment getrennt, sodass ein Kontakt-Temperatursprung nicht geglättet wird. Die Anfangskurve zeigt den Zustand vor dem Anlegen der Randbedingungen.

## Bedienung

Programmbeschreibung anfangs geschlossen. Ein bis zwölf Segmente mit Hinzufügen/Entfernen. Beim Entfernen eines mittleren Segments wird die neue Nachbarschaft mit einem neuen perfekten Kontakt und adiabatischer Schulter verbunden. Beim Reduzieren auf ein Segment bleiben dessen effektive Anfangstemperatur und Mantelkoeffizient erhalten. Bei einem Segment werden die Schalter für segmentweise Vorgaben ausgeblendet. Verknüpfte End-/Schulterkoeffizienten folgen den jeweiligen Mantelwerten dynamisch.

Materialdaten sind gemeinsam mit der Quader-App in `src/lib/thermalMaterials.ts` hinterlegt. Die bisherigen Datensätze und Zahlen bleiben erhalten; Messing CuZn30 ergänzt die Auswahl. Aerogel bleibt als idealisierter Lehrdatensatz mit angenommener Wärmekapazität gekennzeichnet. Stoffwerte können durch Bearbeitung benutzerdefiniert werden.

Warnungen: Querschnitts-Biot-Zahl > 0,1; Durchmesserverhältnis > 1,5 (deutliche Warnung > 3); L/d < 3. Geometrieschwellen sind ausdrücklich heuristisch. Physikalisch unzulässige Temperaturen unter dem absoluten Nullpunkt sowie berechnete Temperaturen über 2.000 °C werden gesondert gemeldet.

## Referenzen und Validierung

Tests in `tests/waermeleitung-stab.test.ts`:

- Stationäre homogene Rippe mit Dirichlet links und adiabater Spitze: `T = T∞ + (Tw - T∞) cosh(m(L-x))/cosh(mL)`, `m² = 4α/(λd)`. Maximaler zugelassener Fehler im Referenzfall < 0,004 K.
- Instationärer isolierter Mantel mit Temperaturstufe links und adiabater Spitze: Fourierreihe mit `μ_n = (n + 1/2)π`, 80 Reihentermen. Vergleich bei 100 s, maximale Abweichung < 0,012 K (180 Zellen, 4.000 Schritte).
- Lineares Profil zwischen zwei festen Endtemperaturen.
- Material-/Querschnittswechsel mit Serienwiderstand und Kontakt-Temperatursprung.
- Temperaturstetigkeit bei perfektem Kontakt.
- Stirnkonvektion einschließlich Leitungswiderstand.
- Energieerhaltung im isolierten Mehrsegmentstab.
- Festtemperatur plus isolierte Spitze besitzt stationären Zustand.
- Unausgeglichene Neumann-Zufuhr: kein stationärer Zustand, Mitteltemperatur aus Energiebilanz.
- Ausgeglichene Neumann-Zufuhr: Gradient und energiebestimmtes Temperaturniveau.
- Vorzeichen an beiden Stirnflächen.
- Schulterwärmeverlust und verschwindende Schulter bei gleichen Durchmessern.
- Anfangsprofil vor dem Anlegen der Randbedingungen.
- Gitter-/Zeitschrittvergleich für den transienten Rippenfall.
- Grenzen, Modellhinweise, dynamische Koeffizienten, Segmententfernung und Moduswechsel.

Lokale Prüfung: 534 Tests bestanden, TypeScript-Prüfung bestanden, Vite-Produktionsbuild bestanden. Keine neuen Abhängigkeiten. Browser-/Desktop-/Tablet-Prüfung in dieser Sitzung nicht durchgeführt: Unterstützte Browsersteuerung war nicht verfügbar. Deshalb keine Aussage über eine bestandene visuelle oder interaktive Browserabnahme.

Materialquelle Messing: https://alloys.copper.org/alloy/C26000 (Raumtemperatur; gerundete SI-Werte: 121 W/(m K), 8530 kg/m³, 377 J/(kg K)). Kontaktorientierung: https://ntrs.nasa.gov/citations/20230013900. Alle weiteren Materialquellen stehen in der gemeinsamen Tabelle.


## Erweiterung: segmentweise Umgebungstemperatur (2026-10-19)

`Umgebungstemperatur je Segment` wird bei mehreren Segmenten angeboten. Beim Einschalten wird der gemeinsame Wert in alle Segmente übernommen; beim Zurückschalten dient der Wert des ersten Segments als gemeinsame Vorgabe. Neue Segmente übernehmen die effektive Umgebung des letzten Segments. Beim Reduzieren auf ein Segment bleibt dessen Umgebung erhalten.

Mantelkonvektion verwendet T∞ des jeweiligen Segments. Robin-Stirnflächen verwenden T∞ des zugehörigen Endsegments; Schulterkonvektion verwendet die Umgebung des größeren Segments (bei gleichen Durchmessern ist die Schulterfläche null). Dirichlet- und Neumann-Vorgaben bleiben davon unberührt. Numerische Quellen und rekonstruierte Stirntemperaturen verwenden dieselbe Zuordnung. Skizze, Formelerläuterungen und Segmenttabelle zeigen die lokalen Werte. Der CSV-Export enthält die zugehörige Umgebungstemperatur je Rechenzelle als zusätzliche Spalte.

Zusätzliche Referenzen: analytische zweiteilige Rippe mit zwei unterschiedlichen Umgebungen, Serienwiderstand mit verschiedenen Robin-Umgebungstemperaturen, Schulterkonvektion bei beiden möglichen größeren Segmenten, diskrete transiente Gesamtenergiebilanz, gemeinsamer Gleichgewichtszustand, Umschaltung/Entfernung und unzulässige Temperaturen.

Prüfung der Erweiterung: 714 Tests bestanden; TypeScript, Produktionsbuild und Offline-Paketbuild bestanden. Keine zusätzlichen Abhängigkeiten. Browserprüfung weiterhin nicht durchgeführt.
