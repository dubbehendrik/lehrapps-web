# Temperaturverteilung

Route: `/Temperaturverteilung`; `/waermeleitung` leitet auf die neue Adresse weiter. Rein browserseitig, ohne Python-Server und ohne neue Abhängigkeiten.

## Modell

Homogener isotroper Quader, einheitliche Anfangstemperatur, konstante λ, ρ, cₚ.
Jede Außenfläche hat einen konstanten räumlich homogenen Wärmeübergangskoeffizienten α ≥ 0;
alle Flächen teilen dieselbe Umgebungstemperatur. Keine Strahlung, Kontaktstellen,
Phasenwechsel oder Wärmequellen. Eine konstante Stoffwertnäherung über 20–180 °C
ist ausdrücklich ein Lehrmodell, kein Werkstoffnachweis.

Dreidimensionale Übertemperatur als Produkt dreier 1-D-Eigenfunktionslösungen.
Das ist unter den Voraussetzungen ein separierbares analytisches Modell, kein
zeitintegrierter numerischer 3-D-Gittersolver. Asymmetrische Bedingungen benötigen
die volle Länge D; die Benutzerkennzahlen beziehen sich konsistent auf L=D/2:
Bi_full=2 Bi_display, Fo_full=Fo_display/4.

Für s∈[0,1], B₋=α₋D/λ, B₊=α₊D/λ:

- φₙ(s)=cos(qₙs−δₙ), δₙ=atan(B₋/qₙ).
- qₙ=nπ+atan(B₋/qₙ)+atan(B₊/qₙ), n≥0; monotone Gleichung, keine Tangenspolstellen.
- Cₙ=∫φₙ ds / ∫φₙ² ds; zeitlicher Faktor exp(−qₙ²Fo_full).
- Beide Flächen adiabatisch: konstanter Nullmodus, Faktor exakt 1.
- t=0: bekannte Anfangstemperatur exakt; keine endliche Reihe zum Anfangszustand.

Für n≥1 gilt qₙ≥nπ und |Cₙ|≤6/(nπ). Die abgebrochene Reihe wird über eine
konservative Gaußhüllkurve plus Integral abgeschätzt. Das Produkt der drei
Fehlerhüllen liefert eine gleichmäßige Abschätzung für das komplette Volumen,
nicht nur für einzelne Stichproben. Ziel ≤0,01 K; maximal 2048 Terme je Richtung.
Wenn dieses Ziel nicht erreichbar ist, wird der aktuelle Schnitt gekennzeichnet.
Unsichere Punkte in der Mittelpunktkurve werden ausgelassen. Keine nachträgliche
Temperaturbegrenzung, welche Konvergenzprobleme verdecken könnte.

## Darstellung und Exporte

Standard: 70×70×5 mm; T₀=180 °C; T∞=20 °C; α=10 W/(m² K); Ende 600 s.
Stahl/Edelstahl: ρ=7850 kg/m³, cₚ=477 J/(kg K); Aluminium: ρ=2700 kg/m³, cₚ=888 J/(kg K).
101×101×41 Auswertepunkte, ganzzahlig 11–201; die Punkte schließen beide Oberflächen ein.
Nur die gerade sichtbare Ebene wird materialisiert. Worker, begrenzter Eigenmoden-Cache,
gebündelte Regleraktualisierungen; eine Animation wartet auf die Berechnung.

Zentrierte Koordinaten, XY/XZ/YZ, kontinuierlich verschiebbare Ebenen. Die Karten
sind geometrisch maßstabsgerecht. Der kleine Quader hat eine orthografische isometrische Projektion mit einem gemeinsamen geometrischen Maßstab; die eingegebenen Seitenverhältnisse bleiben erhalten.
Farbfelder sind den nächstliegenden Auswertepunkten zugeordnet, keine FVM-Zellen.
Glättung: bilineare Interpolation der Temperaturmatrix, keine künstlichen Extrema.
Blau-Rot-Skala mit festen physikalischen Temperaturgrenzen min/max(T₀,T∞).
Alle sichtbaren Werte und Exporte in °C, keine dimensionslose Übertemperatur.

Klick/Touch: nächster Auswertepunkt im Farbfeldmodus; analytische Auswertung am
angeklickten Ort im geglätteten Modus. Alternativ Eingabe per Tastatur.
Excel: Parameter, Kennzahlen, aktueller Schnitt; ungerundete Zahlen mit Achsen und
Einheiten. PNG: exakt derselbe Zeichenweg wie die sichtbare Karte, inklusive
Schnittskizze und Parameterkasten. Exporte verwenden einen konsistenten Snapshot;
bei laufender Berechnung oder ungültigen Eingaben sind sie deaktiviert.

Materialdaten siehe `materials.ts`: Quellen und Hinweise je Datensatz; gerundete
Lehrwerte sind ausdrücklich gekennzeichnet. Aerogel cₚ ist eine angenommene Größe;
die Wahl niedriger λ darf nicht als Materialzertifizierung verstanden werden.

## Validierung

`tests/waermeleitung.test.ts`: symmetrischer Eigenwert (Bi_half=1), Robin-Ränder,
Spiegelung bei vertauschten Alphas, einseitige und vollständige Adiabasie,
Energiebilanz, kleiner-Bi-Grenzfall, Schnittkonsistenz, frühe Zeitpunkte, Termlimit,
Aufheizung, unveränderte Kennzahlenkonvention, Exportmatrix und Klickkoordinaten.

Unabhängige Referenz: `reference.py` (401 Knoten, Crank-Nicolson, ΔFo=10⁻⁵),
Resultate in `reference.json`. Fünf symmetrische, asymmetrische und einseitig
adiabatische Fälle, fünf Orte pro Fall; zulässige Abweichung dimensionslos 10⁻⁵.
Python wird ausschließlich für reproduzierbare Offline-Referenzen verwendet.

Diagramme wurden mit einer Canvas-Laufzeit gerendert und visuell geprüft,
einschließlich 70×5 mm und vertikal dünner Geometrien. Das ist keine Browserprüfung.
Eine vollständige Desktop-/Tablet-Browserprüfung steht noch aus, weil die
unterstützte Browsersteuerung in dieser Sitzung nicht verfügbar war. Die
fachliche/didaktische Abnahme durch den App-Verantwortlichen bleibt ebenfalls offen;
der Footer der neuen App behauptet diese Abnahme nicht.

## Punktauswahl und überarbeitete Ausgabe

Initialisierung und Reset: keine Punktauswahl. Profile und Abkühlkurve zeigen dann
nur einen Auswahlhinweis. Auswahl per Klick, Koordinaten oder Mittelpunkt-Button.
Der Mittelpunkt-Button setzt die Schnittebene auf null und wählt (0,0,0).
Beim Verschieben der Ebene bleiben die beiden in-plane Koordinaten erhalten;
die Normalrichtung folgt der Schnittposition. Löschen entfernt Marker und beide
Profillinien sofort. Der PNG-Export verwendet denselben Auswahlzustand.

Profile durch den gewählten Ort, Markierung in beiden Profilen, Achsenrahmen an
den Bauteiloberflächen. Abkühlkurve für genau diesen festen räumlichen Ort;
der Kurven-Cache berücksichtigt die Punktkoordinaten. Hintergrundberechnung
liefert Karte, Punktwert und Profile als konsistenten Snapshot.

Zahlen: Beträge ≥1 höchstens eine Nachkommastelle, darunter vier signifikante
Stellen, ohne unnötige Endnullen. Eingaben zeigen im unfokussierten Zustand die
gekürzte Darstellung; beim Bearbeiten bleibt die volle Eingabe verfügbar.
Excel und Berechnungen werden nicht gerundet. Canvas-Beschriftungen besitzen
native kleinere und abgesenkte Indizes. Parameterblöcke sind durch Linien getrennt.
Reihenglieder sind separat aufklappbar erklärt. Die dynamische Zusatzzeile im
Karten-Figcaption entfällt; der übrige Berechnungsstatus hat eine feste Höhe.
