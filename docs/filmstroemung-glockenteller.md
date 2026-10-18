# Filmströmung auf Glockenteller

Route: `/filmstroemung-glockenteller`, Kategorie Vorlesung.

## Referenzen und Korrekturen

Fachliche Ausgangspunkte: Vorlesung „05 Hochrotationszerstäuber“, Aufgabe 5.4.1, Folien 38–51, und hochgeladenes `schichtdicke_geschwindigkeit.py`.

Die Vorlesungsnäherung reproduziert die Fixpunktgleichung des Python-Skripts. Der ursprüngliche Plot multipliziert die Newtonsche Viskosität mit 100 statt 1000 und stellt dadurch 250 mPa·s als 25 mPa·s dar. Dies wird nicht übernommen. Die App verwendet 250 ml/min als einstellbaren Default; das Skript verwendet 150 ml/min. Das Radiusintervall reicht bis zum tatsächlichen Glockenrand. Konvergenz: maximale relative Filmdickenänderung < 1e-6, höchstens 200 Iterationen.

Referenzrechnung des ursprünglichen Skripts mit NumPy, 150 ml/min und dessen originalem Radiusfeld (2,75 bis 24,65375 mm): Filmdicke innen 41,6282953205 µm, außen 7,7357527667 µm, äußere Ersatzviskosität 6,1610790712 mPa·s. Der Test prüft dieselben Radiusendpunkte mit dem neuen Solver.

Default mit 250 ml/min bei r=27,5 mm: Newtonsche Filmdicke 29,3030911381 µm, konvergierte Vorlesungsnäherung 8,0116185635 µm und 5,1092892946 mPa·s.

## Konsistentes Potenzgesetzmodell

Lokales Dünnfilmmodell mit A = rho omega² r sin(beta), q = Q/(2 pi r), tau(y)=A(h-y). Keine Haftgleitung, schubspannungsfreie Oberfläche und vernachlässigte meridionale Trägheit.

Aus du/dy = [A(h-y)/k]^(1/p) folgt

- u_max = p/(p+1) (A/k)^(1/p) h^((p+1)/p)
- q = p/(2p+1) (A/k)^(1/p) h^((2p+1)/p)
- u_max/u_mean = (2p+1)/(p+1)
- gamma_wall = (1+1/p) u_max/h

Die Scherrate der Vergleichsplots ist bei allen Modellen ausdrücklich die charakteristische Scherrate u_max/h. Beim Potenzgesetzmodell wird die dargestellte Viskosität an dieser Scherrate ausgewertet. Sie ist keine über den Film konstante lokale Materialeigenschaft. Die Vorlesungsnäherung verwendet dagegen die aus dem vorherigen Iterationsstand bestimmte Ersatzviskosität. Diese Unterscheidung ist für die Teilschritte wesentlich.

Automatisierte Prüfungen: Vorlesungswerte, Original-Python-Referenzfall, Newtonscher Grenzfall p=1, Massenbilanz, integrierte Potenzgesetzbeziehung, Startwertunabhängigkeit, Iterationsgrenze und ungültige Eingaben.
