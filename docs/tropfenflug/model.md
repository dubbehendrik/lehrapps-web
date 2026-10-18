# Tropfenflug am Hochrotationszerstäuber

Route `/tropfenflug`, Kategorie **Fokus: Vorlesung**. Reines Browsermodell mit separatem Web Worker, keine neuen Abhängigkeiten. Die Berechnung wird ausdrücklich gestartet. Parameter- und Konturänderungen beenden laufende Berechnungen und verwerfen alte Ergebnisse.

## Umfang

Ein bereits gebildeter Tropfen wird als starre Kugel mit konstanter Masse, Größe und Ladung verfolgt. Berechnet werden drei Orts- und Geschwindigkeitskomponenten. Die Hauptansicht projiziert auf x/y. Alle Hindernisse, das Luftfeld und das elektrische Feld sind in z invariant. Das ist eine extrudierte 2D-Näherung, keine räumliche Glockengeometrie. Auch externe Elektroden sind extrudierte Kreiskonturen.

Kontaktaufladung: Glocke auf U, Werkstück auf 0 V. Außenaufladung: Glocke und Werkstück auf 0 V, zwei Elektroden auf U. Keine Coronaaufladung während der Flugphase, keine Raumladung, kein Ionenwind. Elektrostatik aus: E = 0. Die Ladung kann separat eingestellt werden und wird dann dynamisch unwirksam.

Anfangsgeschwindigkeit: ωR mit Übernahmefaktor plus vorgegebene meridionale Komponente (45° axial/radial). Am oberen Rand liegt die Tangentialgeschwindigkeit in z-Richtung. Der Start befindet sich 3 mm vor der Kante. Keine zusätzliche Zentrifugalkraft nach der Ablösung. Viskosität und Lackvolumenstrom sind keine Eingaben, weil die Zerstäubung nicht berechnet wird.

## Felder

Elektrisches Potential: Laplacegleichung, Dirichlet auf Leitern und 0 V auf dem äußeren Gebietsrand. Der begrenzte geerdete Außenrand beeinflusst das Feld. Keine Behauptung einer offenen dreidimensionalen Feldlösung.

Luft: **gleichmäßige Anströmung mit idealisierter Bauteilumströmung**. Potentialströmung, stationär, inkompressibel, reibungsfrei und wirbelfrei. Am äußeren Rand wird Φ = U∞x vorgegeben. Festkörperflächen sind undurchlässig (homogene Neumannbedingung), tangential gleitend. Insbesondere keine Ablösung, keine Wirbel hinter Kanten und keine realistische Rezirkulation in U-Profilen/Taschen. Keine quantitative Prognose von Taschenbelüftung, Umgriff oder Auftragswirkungsgrad.

EcoBell2 SL dient als schematische Referenz. Dürr dokumentiert mehrere Glocken und Lenkluftringe. Ohne konkrete Düsenflächen/-geometrie keine Umrechnung von Nl/min in Flugraumgeschwindigkeit. Die eingestellten 10 m/s sind eine effektive didaktische Annahme, keine EcoBell2-Messung.

## Numerik

Gebiet x = −0,1…0,55 m, y und z = ±0,25 m. Zeichenbereich x = 0,08…0,45 m und y = ±0,15 m. Einheitlich 5 mm Raster, optional 2,5 mm. SOR mit lokalem normiertem Defekt < 10⁻⁷, spätestens nach 6.500 Iterationen; Ergebnisse mit Defekt > 10⁻⁶ werden zurückgewiesen. Der Defekt beschreibt algebraische Konvergenz, nicht die räumliche Genauigkeit. Leiterpotentiale sind im Festkörper fixiert, Luft-Neumannflächen werden aus dem Nachbarstencil entfernt. Fluidknoten werden bilinear gewichtet interpoliert.

RK4 mit dt ≤ 0,15 ms, dt ≤ 0,15 Widerstandsrelaxationszeit und Weg ≤ 0,15 Gitterweiten. Schiller–Naumann für Re < 1.000, darüber cD = 0,44. Luftdichte 1,204 kg/m³, dynamische Luftviskosität 1,81·10⁻⁵ Pa·s. Die starre Kugel ist eine Lehrannahme auch für den Flüssigkeitstropfen. Keine Verdunstung, Deformation, Sekundärzerstäubung, Auftrieb, Historienkräfte oder Rückwirkung auf die Luft.

Konturen werden über quadratische Eckübergänge abgerundet; Trimmlänge pro Nachbarkante höchstens 25 %. Kein exakter Kreisradius. Die gleiche Kontur dient der Rasterisierung, Darstellung und segmentweisen Kollisionsprüfung. Der Tropfenmittelpunkt wird für Kontakte als Punkt behandelt. Die früheste Kollision beendet die Integration; Gebietsaustritt und Zeitlimit sind getrennte Endzustände.

## Ladung und Quellen

qR = 8π√(ε₀σr³). Voreinstellung 5 % von qR, bei negativer Spannung negative Ladung. Bei d = 30 µm, σ = 30 mN/m: qR ≈ 0,753 pC und |q| ≈ 0,038 pC. Keine automatische Skalierung des Ladungsbetrags mit U. Oberfläche und Volumen sind alternative Ladungsmodelle in der Forschung; q ∝ d^(3/2) ist hier eine erklärte didaktische Wahl.

- https://doi.org/10.1007/s11998-020-00352-1 — unter den dortigen Bedingungen circa 1–2 % von qR.
- https://doi.org/10.1016/j.ijmultiphaseflow.2024.104955 — Kontaktaufladung, für bestimmte 20-µm-Tropfen circa 5–8 %.
- https://doi.org/10.1002/ppsc.200601018 — Außenaufladung und vernachlässigte Effekte.
- https://www.durr.com/fileadmin/durr.com/08_Special_Events/03_ready2integrate_2019/duerr-Station-Showcase-of-automated-bell-painting-system.pdf — EcoBell2-SL-Varianten.
- https://doi.org/10.3390/app12199652 — Potentialströmung und Grenzen bei Ablösung.

Die Orientierung 1–8 % gilt für Kontaktaufladung und ist kein universeller technischer Bereich. 5 % bei Außenaufladung ist ein frei gewähltes Vergleichsszenario, kein behaupteter Literaturwert. Manuelle Ladung ist möglich; Überschreiten der Rayleigh-Grenze wird markiert.

## Verifikation

`tests/tropfenflug.test.ts`: ωR-Referenz 172,7876 m/s für 55 mm / 60.000 min⁻¹, Richtungsprüfung, Rayleigh-/Massenskalierung, Stokes-Limit, ballistische RK4-Referenz, zeitliche Konvergenz, Konturvalidierung, dünne Wand und konkave Kollision, analytisches lineares Potential, Elektrodenpotentiale, Stauwirkung, Kräftebilanz, Tiefenabbremsung, Gebietsaustritt und Zeitlimit.

`tests/tropfenflug-refinement.test.ts`: rein elektrostatischer Plattenaufprall auf 5- und 2,5-mm-Gitter mit Vergleich von Auftreffpunkt, Flugzeit und Feld an einem festen Fluidpunkt, sowie feines Außenaufladungsfeld am U-Profil. Die Toleranz von 12 % ist eine Regressionstoleranz für diese Rasterlösung, keine allgemeine Genauigkeitsgarantie.

Browserprüfung: Kontakt, Außenaufladung, Elektrostatik aus, Animation/Pause, Vorlagenwechsel, Desktop/Tablet/Mobil, horizontale Überläufe und JavaScript-Fehler. Kraftpfeile teilen sich je Zeitpunkt einen linearen Maßstab; dieser passt sich an und wird angegeben. Einzelvergrößerung ist ausdrücklich markiert. CSV enthält ungerundete Vektoren sowie Parameter/Kontur und Modellhinweise; JSON speichert das Szenario.
