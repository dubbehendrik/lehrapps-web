# Gegenstromkaskade

Route: `/gegenstromkaskade`. Stationäres Idealmodell einer Gegenstrom-Spülkaskade mit einer bis acht Stufen. Fachliche Vorlage: Übungsblatt SoSe2026, Aufgabe 1 Gegenstrom Spülkaskade, und zugehörige handschriftliche Lösung, Seiten 1–5. Keine Python-Migration; neue Umsetzung der dokumentierten Bilanzen. Die Originalunterlagen bleiben unverändert.

## Eingaben und Modellgrenzen

Oberfläche in m² je Bauteil/Charge, spezifische Verschleppung in ml/m², Durchsatz in 1/h, Konzentrationen in g/L. Die Wahl Bauteil/Charge ändert nur die Bezugsgrößenbeschriftung, keine Zahlen. Oberfläche und Durchsatz müssen zusammenpassen. Masse, Beckenvolumen, Verweilzeit und Transportzeit sind keine Parameter dieses stationären Modells. Positive Verschleppung und positive Eingangskonzentration sind erforderlich. Wasserstrom und Frischwasserkonzentration dürfen null sein.

Alle Becken werden als ideal durchmischt betrachtet. Der ausgetragene Film hat die Konzentration des jeweiligen Beckens. Gleicher Verschleppungsstrom an allen Übergängen, gleiche Dichte, inkompressible Flüssigkeit, keine Verdunstung/Reaktion oder sonstige Verluste. Schmutz wird mit einem Flüssigkeitsfilm eingeschleppt; eine unabhängige Ablösekinetik haftender Verschmutzung wird nicht simuliert.

Die Gesamtvolumenbilanz liefert gleiche Überlaufströme in allen Stufen: Frischwasserstrom = Überlaufstrom = Abwasserstrom. Das Abwasser aus Stufe 1 ist vom Flüssigkeitsfilm nach der letzten Stufe zu unterscheiden.

## Gleichungen

D = A × vA × Durchsatz / 60000 in L/min.
W = Frischwasserstrom in L/min; R = W/D.
Für Stufe i: D*c_(i-1) + W*c_(i+1) - (D+W)*c_i = 0.
Randwerte: c_0 = Eingangskonzentration; c_(N+1) = Frischwasserkonzentration cf.
S_j = Summe von R^k für k=0 bis j.
c_i = cf + (c0-cf)*S_(N-i)/S_N.
Bei cf=0: Sk = c0/cN = S_N.
Bei cf>0 bleibt Sk als c0/cN definiert, also nicht als (c0-cf)/(cN-cf).

Ein endliches Ziel mit Sk>1 ist nur für c0/Sk > cf erreichbar. Bei Gleichheit ist ein unendlicher Wasserstrom erforderlich. Sk=1 erfordert minimal W=0. Im vorgegebenen Wasserstrommodus kann auch cf>=c0 untersucht werden; das Wasser verschlechtert dann gegebenenfalls die Spülwirkung.

Der Solver verwendet monotone Bisektion, keine kubische Lösungsformel. Geometrische Summen werden ohne Division durch R-1 berechnet und für R>1 über inverse Potenzen stabilisiert. Der Sonderfall R=1 ergibt das lineare Profil cf+(c0-cf)*(N-i+1)/(N+1).

Näherung bei Sk>1 und erreichbarem Ziel: R≈[(c0-cf)/(c0/Sk-cf)]^(1/N). Bei cf=0 entspricht dies Sk^(1/N). Die Näherung überschätzt den Wasserbedarf; sinnvoll nur bei großem R, nicht automatisch bei großem Sk und beliebig vielen Stufen.

## Referenzfälle

Aufgabenwerte: 20 m²/Charge, 80 ml/m², 60 Chargen/h, c0=50 g/L, cf=0, Sk=800.
Verschleppung: 1,6 L/Charge und 1,6 L/min.

| Stufen | R exakt | W exakt L/min |
|---|---:|---:|
| 1 | 799 | 1278,4 |
| 2 | 27,771009886454358 | 44,43361581832698 |
| 3 | 8,923032767999825 | 14,276852428799721 |
| 4 | 5,032129588526024 | 8,051407341641639 |

Drei Stufen: c1=5,596471659174902; c2=0,620189547999989; c3=0,0625 g/L. Näherung W=14,853084267560892 L/min, etwa 4,04 % über der exakten Lösung. Die handschriftliche Lösung rundet auf 14,9 L/min. Die Rechnung setzt 60 Chargen/h voraus; diese Durchsatzannahme folgt nicht aus der Verweilzeit allein.

Die auf Seite 6 vorgeschlagene Nullstelle R=1-Sk ist im Allgemeinen falsch und wird nicht übernommen.

## Qualitätssicherung

`tests/gegenstromkaskade.test.ts`: Aufgabenreferenz, unabhängige ein- und zweistufige Lösungen, lokaler und globaler Bilanzschluss für N=1,2,3,8 und R=0,0.1,1±1e-9,1,10,1000 mit belastetem Frischwasser, Nullwasser, unerreichbare Ziele einschließlich asymptotischer Grenze, Durchsatzskalierung, monotone Stufenvergleiche, Eingabevalidierung, sehr große Spülverhältnisse. Vollständiger Projektbuild umfasst Vitest und TypeScript-Prüfung.

Browser-/Tablet-Sichtprüfung wurde in dieser Sitzung nicht durchgeführt; fachliche und didaktische Abnahme durch den Lehrenden steht aus. Der gemeinsame Footer verwendet deshalb `reviewed={false}`.

## Bedienung

+/− fügt am sauberen Ende Stufen hinzu oder entfernt sie. Der Frischwasserzulauf liegt stets an der letzten Stufe. Beim Wechsel in den Wasserstrommodus wird der aktuell berechnete Wasserstrom übernommen. Modus Ziel: Stufenvergleich bei gleichem Sk. Modus Wasserstrom: Stufenvergleich bei gleichem W. Klick oder Enter/Leertaste auf ein Becken wählt die Stufenbilanz; zusätzlich sind alle Stufen per Tabellenbutton und Bilanznavigation erreichbar. Alle Schaubildwerte stehen auch in Tabellen. Mehrstufige Fließbilder können horizontal gescrollt werden, statt Schrift auf Tablets unleserlich zu verkleinern. CSV enthält vollständige Eingaben und Ergebnisse mit deutschen Dezimalzeichen. Diagramme können über Plotly als PNG exportiert werden.
