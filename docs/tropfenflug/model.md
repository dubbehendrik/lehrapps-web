# Tropfenflug am Hochrotationszerstäuber

Route `/tropfenflug`, Kategorie **Fokus: Vorlesung**. Reines Browsermodell mit separatem Web Worker, keine neuen Abhängigkeiten. Die Berechnung wird ausdrücklich gestartet. Parameter- und Konturänderungen beenden laufende Berechnungen; das bisherige Ergebnis bleibt als vollständiger markierter Snapshot erhalten. Nur Aktualisieren ersetzt Felder, Geometrie, Flugbahn und Exportparameter gemeinsam. Die Zeitposition bleibt bei Entwurfsänderungen erhalten.

## Umfang

Ein bereits gebildeter Tropfen wird als starre Kugel mit konstanter Masse, Größe und Ladung verfolgt. Berechnet werden drei Orts- und Geschwindigkeitskomponenten. Die Hauptansicht projiziert auf x/y. Alle Hindernisse, das Luftfeld und das elektrische Feld sind in z invariant. Das ist eine extrudierte 2D-Näherung, keine räumliche Glockengeometrie. Externe Elektroden sind nach rechts gerichtete extrudierte Nadelkonturen mit 30 mm Gesamtlänge, 3 mm Schaftdurchmesser und getrennt einstellbarem Kreisbogenspitzenradius von 0,1 bis 0,3 mm. Das ist eine 2D-Idealisierung und kein rotationssymmetrischer 3D-Nadelkopf. Die Gesamtabmessungen beeinflussen das Feld zusätzlich zum Spitzenradius; Coronaionisation wird nicht berechnet.

Kontaktaufladung: Glocke auf U, Werkstück auf 0 V. Außenaufladung: Glocke und Werkstück auf 0 V, zwei Elektroden auf U. Keine Coronaaufladung während der Flugphase, keine Raumladung, kein Ionenwind. Elektrostatik aus: E = 0. Die Ladung kann separat eingestellt werden und wird dann dynamisch unwirksam.

Anfangsgeschwindigkeit: ωR mit Übernahmefaktor plus vorgegebene meridionale Komponente (45° axial/radial). Am oberen Rand liegt die Tangentialgeschwindigkeit in z-Richtung. Der Start befindet sich 3 mm vor der Kante. Keine zusätzliche Zentrifugalkraft nach der Ablösung. Viskosität und Lackvolumenstrom sind keine Eingaben, weil die Zerstäubung nicht berechnet wird.

## Felder

Elektrisches Potential: offene zweidimensionale Randelementmethode. Auf den Leiteroberflächen gelten vorgeschriebene Potentiale. Es gibt keinen auf Erde gesetzten Bildrand. Zusätzlich wird die Gesamtladung pro Tiefenlänge auf null gesetzt und das konstante Fernpotential als zusätzliche Unbekannte bestimmt. Das ist eine explizite neutrale 2D-Fernfeldannahme; kein Anspruch auf ein dreidimensionales Kabinenfeld. Die Quellen sind konstante Randladungssegmente mit analytisch integrierten logarithmischen Potential- und Feldkernen. Die Integrationskonstante des logarithmischen Bezugslängenmaßes fällt wegen der Neutralitätsbedingung heraus. Ein dichtes pivotiertes lineares System bestimmt Randladungen und Fernpotential. Die elektrische Kraft und Feldlinien werden direkt aus den Randsegmenten ausgewertet, unabhängig vom Farbkarten-/Luftgitter. Maximale Segmentlänge 6 mm, fein 3 mm. Die Spitze erhält immer 20 kleine Kreisbogenabschnitte. Die Farbkarte zeigt im sichtbaren Gitter abgetastete Werte und keine garantierte Spitzen-Maximalfeldstärke.

Luft: **gleichmäßige Anströmung mit idealisierter Bauteilumströmung**. Potentialströmung, stationär, inkompressibel, reibungsfrei und wirbelfrei. Am äußeren Rand wird Φ = U∞x vorgegeben. Festkörperflächen sind undurchlässig (homogene Neumannbedingung), tangential gleitend. Insbesondere keine Ablösung, keine Wirbel hinter Kanten und keine realistische Rezirkulation in U-Profilen/Taschen. Keine quantitative Prognose von Taschenbelüftung, Umgriff oder Auftragswirkungsgrad.

EcoBell2 SL dient als schematische Referenz. Dürr dokumentiert mehrere Glocken und Lenkluftringe. Ohne konkrete Düsenflächen/-geometrie keine Umrechnung von Nl/min in Flugraumgeschwindigkeit. Die eingestellten 10 m/s sind eine effektive didaktische Annahme, keine EcoBell2-Messung.

## Numerik

Gebiet x = −0,1…0,55 m, y und z = ±0,25 m. Zeichenbereich x = 0,08…0,45 m und y = ±0,15 m. Einheitlich 5 mm Raster, optional 2,5 mm. SOR mit lokalem normiertem Defekt < 10⁻⁷, spätestens nach 6.500 Iterationen; Ergebnisse mit Defekt > 10⁻⁶ werden zurückgewiesen. Der Defekt beschreibt algebraische Konvergenz, nicht die räumliche Genauigkeit. Die SOR-Rechnung gilt nur für das Luftpotential; elektrische Konvergenz wird über den Potentialdefekt an den Randsegment-Mittelpunkten geprüft. Luft-Neumannflächen werden aus dem Nachbarstencil entfernt. Fluidknoten werden für die Luftgeschwindigkeit bilinear gewichtet interpoliert. Die dünnen Nadeln sind im Luftgitter nur grob erfasst; deren Elektrostatik und Kollisionskontur sind unabhängig davon aufgelöst.

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

Browserprüfung: Kontakt, Außenaufladung, Elektrostatik aus, Animation/Pause, Vorlagenwechsel, Desktop/Tablet/Mobil, horizontale Überläufe und JavaScript-Fehler. Kraftpfeile teilen sich einen über die gesamte Flugphase festen linearen Maßstab; eine Änderung der angezeigten Kräfte ändert ihn ebenfalls nicht. Die Gewichtskraft bleibt deshalb auch grafisch konstant. Einzelvergrößerung verwendet eigene, je Kraft zeitlich feste Maßstäbe und ist ausdrücklich markiert. Alle Indizes werden tiefgestellt, elektrische Kraft F mit Index el, Resultierende standardmäßig sichtbar. Senkrechte gestrichelte Bezugslinie x=0. Erdungssymbol hängt an der tatsächlichen rechten Außenkontur. Schwerkraftregler und Aktualisieren befinden sich rechts oben beziehungsweise direkt an der Abbildung; der Zeitregler folgt unmittelbar dem SVG. CSV enthält ungerundete Vektoren sowie Parameter/Kontur und Modellhinweise; JSON speichert das Szenario.

## Korrekturstand: offene Elektrostatik und Abschirmung

Zusätzliche Vorlage **Abschirmtasche (Vorlesung)** nach der übergebenen Skizze mit nach innen gezogener Unterkante. Offene Taschen bleiben teilweise feldbehaftet. Ein optionaler horizontaler Feldprüfverlauf zeigt das Abklingen in der Tasche; Metallabschnitte sind ausgespart. Die Feldlinienanzahl ist einstellbar, ihre Liniendichte ist illustrativ und kein quantitatives Feldmaß. Die Farbkarte besitzt eine numerisch beschriftete logarithmische Skala.

`tests/tropfenflug-electrostatics.test.ts` vergleicht mit der analytischen Lösung zweier gleich großer paralleler Zylinder, prüft verschwindende Gesamtladung und abfallendes Fernfeld, Abschirmung in einem geschlossenen geerdeten Hohlraum ohne innere Ladungen (<0,2 % der äußeren Prüffeldstärke), Feldabnahme in der offenen Tasche auf zwei Panelauflösungen und stärkere Spitzenfelder bei kleinerem Spitzenradius.

`tests/tropfenflug-display.test.ts` prüft die konstante Gewichtspfeillänge bei zeitlich veränderlichem Widerstand sowohl mit gemeinsamem als auch mit individuellem Maßstab. Browserregressionen prüfen das Erhalten des Ergebnisses und der Zeitposition, explizites Aktualisieren, geänderte Schwerkraft, Nadelradius, Abschirmtasche, Feldprobe, Snapshot-Exporte und Tablet-/Mobilbreiten.

Grundlage zur Wahl der 2D-Fernfeldbedingung: https://doc.comsol.com/5.4/doc/com.comsol.help.acdc/acdc_ug_electric_fields.07.031.html . Diese Dokumentation ist eine methodische Referenz, die App verwendet keine COMSOL-Komponente.
