# Tropfenflug am Hochrotationszerstäuber — reines 2D-Lehrmodell

Route `/tropfenflug`, Kategorie **Fokus: Vorlesung**. React/TypeScript, separate Berechnungslogik und Web Worker, keine neue Abhängigkeit. Exportschema `tropfenflug-v3-2d`.

## Bewegung und Anfangsbedingungen

Nur x/y, keine Tiefenkoordinate oder Tiefengeschwindigkeit. Ein bereits gebildeter kugelförmiger Tropfen mit konstantem Durchmesser und konstanter Masse wird bis zum ersten Kontakt, sichtbaren Gebietsaustritt oder Zeitlimit verfolgt. Newtonsche Trägheit, Luftwiderstand, elektrische Kraft und Gewichtskraft. Keine Zerstäubung, Deformation, Verdunstung, Filmaufbau, Rückwirkung auf Luft oder Tropfenwechselwirkungen. Keine zusätzliche Zentrifugalkraft nach dem Ablösen.

**Bewusste 2D-Idealisierung:** v₀,y = ±k_v ωR, also der volle übernommene Betrag der Umfangsgeschwindigkeit am oberen Rand nach oben, am unteren nach unten. Das ist keine exakte Projektion einer räumlichen Tangentialbahn. Es stellt das schnelle Entfernen vom Glockenrand anschaulich dar. Beispiel 55 mm und 60.000 min⁻¹: 172,7876 m/s vor Übernahmefaktor. Eine separat vorgegebene kleine axiale Startgeschwindigkeit (Default 1 m/s) zeigt nach rechts zum Werkstück. Start 3 mm vor der Glocke, y = ±R.

Drehzahl und Übernahmefaktor sind damit direkt in der sichtbaren Ebene wirksam. Es gibt keine unsichtbare Tiefengrenze. Große Tropfen besitzen bei gegebenem Durchmesser/Dichte eine andere Relaxationszeit; sie werden nicht auf Stromlinien gezwungen. Eine große Luftgeschwindigkeit garantiert keinen Aufprall, denn Luftwiderstand wirkt entlang der lokalen Relativgeschwindigkeit.

## Elektrisches Feld

Kontaktaufladung: Glocke auf U, Werkstück auf 0 V. Außenaufladung: Glocke und Werkstück auf 0 V, beide Nadelelektroden auf U. Elektrostatische Berechnung als offene neutrale 2D-Randelementmethode, ohne geerdete Bildränder. Leiterpotentiale werden vorgeschrieben, Gesamtladung pro Tiefenlänge null; das konstante Fernpotential wird als zusätzliche Unbekannte bestimmt. Keine Behauptung eines dreidimensionalen Kabinenfelds. Keine Ionenraumladung, keine Coronaentladung, keine Bildkraft des einzelnen Tropfens, kein Ionenwind.

Konstante Randladungssegmente mit analytisch integrierten logarithmischen Potential-/Feldkernen, dichtes pivotiertes Gleichungssystem. Maximale Segmentlänge 6 mm, fein 3 mm. Rechts gerichtete Nadelkonturen: 30 mm Gesamtlänge, 3 mm Schaftdurchmesser, separat einstellbarer Spitzenradius 0,1…0,3 mm (Default 0,2 mm), lokal 20 feine Kreisbogenabschnitte. Die neue Voreinstellung setzt den Schaftbeginn auf x = −40 mm und damit die Spitze auf x = −10 mm, hinter die Austrittsebene. So schneiden die Nadeln nicht den idealisierten senkrechten Startpfad. Dies ist eine schematische Lehrgeometrie, keine vermessene EcoBell2-Anordnung; Positionen bleiben einstellbar und echte Schnittkontakte werden weiter erkannt. Die Spitze und die gesamte Elektrode beeinflussen das Feld. Das ist ein 2D-Querschnitt, keine rotationssymmetrische 3D-Nadel.

Elektrische Kraft und Feldlinien werden direkt aus der Randelementlösung ausgewertet. Die Farbkarte tastet das Feld auf dem Luftgitter ab und liefert keine garantierte maximale Spitzenfeldstärke. Die elektrische Konvergenzprüfung beschreibt nur den algebraischen Potentialdefekt an den Segmentmittelpunkten, nicht den Diskretisierungsfehler.

## Effektive Aufladung

Zielladung direkt in pC oder als Anteil von q_R = 8π√(ε₀σr³). Standard 5 % von q_R. Bei d = 30 µm und σ = 30 mN/m: q_R ≈ 0,753 pC, |q_Ziel| ≈ 0,038 pC. Für Kontaktaufladung etwa 1–8 % als Literaturorientierung, kein universeller technischer Bereich. Für Außenaufladung sind 5 % ein frei gewähltes Vergleichsszenario. Keine automatische Skalierung des Ladungsbetrags mit U; im Anteilmodus folgt das Vorzeichen der Spannung. Oberhalb der Rayleigh-Grenze erscheint ein Stabilitätshinweis.

- Kontaktaufladung: Zielladung ab Start.
- Außenaufladung: q(s) = q₀ + (q_Ziel − q₀) min(s/L_q, 1). q₀ ist ein einstellbarer Startanteil (Default 0 %), L_q eine einstellbare Strecke (Default 50 mm). s ist ausschließlich der innerhalb der effektiven Zone zurückgelegte Weg, einschließlich senkrechter Bewegung. Keine horizontale Projektion und kein Rücksetzen/Entladen beim Verlassen. Die Wegvariable wird als fünfte Zustandskomponente mitintegriert; sie ist keine räumliche Koordinate.
- Elektrostatik aus: E = 0, q = 0, elektrische Kraft null.

Effektive Zone, relativ zur Elektrodenposition: x von x_E − 20 mm bis x_E + 150 mm, |y| ≤ Elektrodenabstand zur Achse + 30 mm. Die Lage ist als Lehrannahme festgelegt und in der Grafik zuschaltbar. Diese Wegregel ersetzt keine Corona- oder Ionentransportrechnung und ist nicht experimentell kalibriert. Sie vermeidet die vorherige Annahme einer vollständigen Ladung direkt am geerdeten Glockenrand, ohne Rückabscheidungen künstlich auszuschließen. Aktuelle Ladung wird am Zeitpunkt angezeigt und mit q(t)/Zonenweg im CSV exportiert.

## Luftströmung

Gleichmäßige Anströmung mit idealisierter Bauteilumströmung: stationäre, inkompressible, reibungsfreie und wirbelfreie Potentialströmung. Außenrand Φ = U∞x, Festkörperflächen undurchlässig, tangentiales Gleiten erlaubt. Keine Ablösung, Nachlaufwirbel oder realistische Rezirkulation in offenen Taschen. Kein quantitativer Auftragswirkungsgrad oder belastbare Umgriffprognose. EcoBell2 dient als schematische Referenz. Eingabe ist die effektive Luftgeschwindigkeit im Flugraum, ohne Umrechnung aus Nl/min.

Luftgitter 5 mm, optional 2,5 mm. SOR, normierter lokaler Defekt <10⁻⁷, spätestens 6.500 Iterationen; >10⁻⁶ wird zurückgewiesen. Fluidknoten bilinear interpoliert; enge Spalte und die dünnen Nadeln sind in der Luft nur grob erfasst. Luftstromlinienanzahl separat einstellbar. Alternative Farbkarten für |u_L| (linear, m/s) oder |E| (logarithmisch, kV/m) mit numerischer Skala; die Luftkarte zeigt nicht die Tropfengeschwindigkeit.

## Integration und Kontakte

RK4 mit dt ≤ 0,15 ms, dt ≤ 0,15 Widerstandsrelaxationszeit und Weg ≤ 0,15 Gitterweiten. Während aktiver Aufladung zusätzlich Weg ≤ 0,1 Aufladestreckenlängen pro Schritt. Schiller–Naumann für Re < 1.000, darüber c_D = 0,44. Luftdichte 1,204 kg/m³, Viskosität 1,81·10⁻⁵ Pa·s. Keine Auftriebs-/Historien-/Zusatzmassenkräfte.

Sichtbarer Flugraum x = −100…550 mm, y = ±250 mm. Zeichenbereich x = 80…450 mm, y = ±150 mm. Polygone mit quadratischen Eckübergängen, Trimmlänge höchstens 25 % der jeweiligen Nachbarkante; keine exakten Kreisradien. Die gleiche Kontur dient Darstellung, Rasterisierung und segmentweiser erster Kollisionsprüfung. Kontakte behandeln den Tropfenmittelpunkt als Punkt. Die früheste Kollision oder Randüberschreitung beendet die Rechnung. Randseite wird explizit gespeichert. Zeitlimit (Default 150 ms, 10…500 ms) ist kein automatischer Vorbeiflug.

Status trennt den angezeigten Animationszeitpunkt vom berechneten Endereignis mit dessen Zeitpunkt und gegebenenfalls Randseite. Kein unsichtbarer Gebietsaustritt, kein zusätzlicher Sprungknopf. Zeitlimit bei den Wiedergabefunktionen. Zeitschieber direkt unter der Abbildung.

## Kraftdarstellung und Snapshots

Gemeinsamer linearer Maßstab, zeitlich fest über die gesamte Flugphase. Mit „Maßstab an aktuellen Zeitpunkt anpassen“ wird ein neuer Referenzzeitpunkt gewählt, danach bleibt der Maßstab wieder fest. Zoom 0,1…1.000 wirkt nur visuell. Überlange Kraftpfeile werden mit Doppelstrich und „gekürzt“ markiert; die Zahlenwerte bleiben unverändert. Optional individuelle, je Kraft ebenfalls zeitlich feste Maßstäbe, ausdrücklich nicht zwischen Kräften vergleichbar. Die Gewichtspfeillänge bleibt bei festem Maßstab und Zoom konstant. Resultierende standardmäßig sichtbar; elektrische Kraft F_el, alle Indizes tiefgestellt.

Parameter-/Konturänderungen beenden laufende Berechnungen, erhalten aber den vollständigen letzten Ergebnisstand einschließlich Zeitposition. Erst Aktualisieren ersetzt Geometrie, Felder, Flugbahn und Exportparameter gemeinsam. CSV enthält ungerundete 2D-Vektoren, aktuelle Ladung und Zonenweg. JSON enthält das tatsächlich berechnete Szenario. Erdungssymbol an der Werkstückkontur, gestrichelte Bezugslinie x = 0, Schwerkraftrichtung rechts oben.

Zusätzliche Vorlage **Abschirmtasche (Vorlesung)** nach Lehrskizze mit nach innen gezogener Unterkante. Offene Taschen sind nicht vollständig feldfrei. Ein horizontaler Feldprüfverlauf zeigt das Abklingen zur Tiefe; Metallabschnitte sind ausgespart. Feldliniendichte ist illustrativ, keine quantitative Feldstärkemessung.

## Verifikation

- `tropfenflug.test.ts`: 2D-Austrittsrichtung und ωR-Referenz, Rayleigh/Masse, Stokes-Limit, analytische RK4-Ballistik und zeitliche Konvergenz, Konturvalidierung, dünne Wände, konkave Kollision, lineares Potential, Leiterpotentiale und Umströmung, Kräftebilanz, sichtbare Endzustände.
- `tropfenflug-refinement.test.ts`: rein elektrischer Plattenaufprall und Feld-/Flugzeitvergleich auf zwei Auflösungen; feines U-Profil mit Außenaufladung.
- `tropfenflug-electrostatics.test.ts`: analytische Zweizylinderlösung, offene Neutralität/Fernfeld, geschlossener geerdeter Hohlraum ohne innere Ladung, offene Abschirmtasche, stärkere lokale Felder bei kleinerer Nadelspitze.
- `tropfenflug-planar.test.ts`: Kontakt-/Außen-/Aus-Ladung, senkrechter Zonenweg und Erhalten außerhalb, ausschließlich sichtbare Randereignisse, gleiche normale Anfangsgeschwindigkeit kleiner/großer Tropfen in ruhender Luft (großer Tropfen trifft, kleiner stoppt), Trägheitsaufprall mit berechneter Bauteilumströmung auf zwei Gitterweiten, ungeladener Start und vollständiger sichtbarer Austritt bei Außenaufladung.
- `tropfenflug-display.test.ts`: zeitlich konstante Gewichtspfeillänge bei wechselndem Widerstand.

Numerische Verifikation ersetzt keine experimentelle Validierung dieses Lehrmodells.

## Quellen

- https://doi.org/10.1007/s11998-020-00352-1 — Anfangsbedingungen und Ladungsmodelle.
- https://doi.org/10.1016/j.ijmultiphaseflow.2024.104955 — Kontaktaufladung, bestimmte Bedingungen etwa 5–8 % Rayleigh bei 20 µm.
- https://doi.org/10.1002/ppsc.200601018 — Außenaufladung und vernachlässigte Corona-/Ioneneffekte.
- https://www.durr.com/fileadmin/durr.com/08_Special_Events/03_ready2integrate_2019/duerr-Station-Showcase-of-automated-bell-painting-system.pdf — EcoBell2-SL-Varianten.
- https://doi.org/10.3390/app12199652 — Potentialströmung und Grenzen bei Ablösung.
- https://doc.comsol.com/5.4/doc/com.comsol.help.acdc/acdc_ug_electric_fields.07.031.html — 2D-Fernfeldbedingungen, methodische Referenz; keine COMSOL-Komponente in der App.
