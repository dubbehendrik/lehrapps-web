# Roboter Bahnplanung (Demo)

Route `/roboter-bahnplanung`, zentral registriert unter **Fokus: Labor**.

Die App überträgt die geometrischen Szenarien des Entwicklungsprojekts
`lackierroboter-dev` in einen eigenständigen Lehrapp-Bereich innerhalb der
bestehenden Lehrapps. Originale CAD-Modelle und eine illustrative Roboterkinematik dienen der Darstellung.
Maschinenprogramme und Steuerungsdateien werden nicht übernommen.

Der Einstieg zeigt den fertig berechneten, mittigen stationären Spritzversuch in 2D.
Die CAD-Ansicht wird erst beim Wechsel auf eine der 3D-Ansichten geladen.

## Funktionsumfang

- Stationärer Brushversuch; horizontale und vertikale Einzelbahn;
  Einzelbahn bis Zentrum mit Haltezeit; horizontaler und vertikaler Mäander;
  Kreuzgang; horizontaler Keil über veränderliche Bahndichte.
- Blechabmessungen, Start, Richtungen, Bahnrechteck, Sollabstände,
  Geschwindigkeit, Spritz-/Haltezeit, Auftrag beim Wenden.
- Rotationssymmetrischer Brush: relative Lenkluft, Hochspannung, Abstand,
  Fördermenge. Keine elliptische Verformung.
- Gemeinsamer Auftragskern für stationäre und bewegte Versuche.
- 2D-Farbkarte, drehbarer 3D-Bahnraum, 3D-Höhenprofil, Zeitsteuerung,
  horizontale/vertikale Schnitte, Randbeschnitt der Statistik, A/B-Referenz.
- Gemeinsame, zeitlich feste Farbschale und Höhen-/Schnittskala für A/B.
- Browserlokales explizites Speichern/Laden von Einstellungen. Kein
  Maschinenimport/-export und keine externen Dienste zur Berechnung.

## Mathematischer Ansatz (keine Prozessphysik)

Für a = Lenkluft/100, e = Hochspannung/100 und Abstand d (mm):

    R = d (0.38 - 0.16a) (1 - 0.08e)
    sigma = d (0.085 - 0.025a)
    centerSigma = 1.8 sigma
    ringShare = 0.92 - 0.16e
    eta = 0.30 + 0.55e

Das Rohprofil ist `ringShare exp(-0.5 ((r-R)/sigma)^2)` plus
`(1-ringShare) exp(-0.5 (r/centerSigma)^2)`. Das gemeinsame Profil wird über
`2 pi r dr` flächennormiert; der numerische Support reicht bis
`R + 6 centerSigma`. Diese Gewichte sind vor der gemeinsamen Normierung
**keine separaten Massenanteile**. Der zentrale diametrale Schnitt hat
zwei Maxima.

Der relative Auftrag in AE ist das Zeitintegral von

    (flow / 150 ml/min) eta kernel(u,v) 10000 mm²

Es gibt keine Umrechnung in µm. Das Modell projiziert senkrecht auf das
ebene Blech. Eine Verbreiterung des Profils erzeugt keine zusätzliche
Materialmenge. Außerhalb liegender Auftrag wird nicht auf das Blech
zurücknormiert. `captured/supplied` ist ein angenommener Modellanteil und
kein gemessener Auftragswirkungsgrad.

## Numerik und Darstellung

Zellzentriertes Raster mit ungefähr 5 mm Zellweite, maximal 121 Zellen pro
Richtung. Bewegte Segmente werden räumlich mit Mittelpunktsquadratur
integriert; stationäre Abschnitte direkt über ihre Zeit. Es werden 81
Zeitstände gespeichert und für Zwischenzeiten interpoliert. Die numerische
Auflösung wird in der App ausgewiesen. Versuche sind auf 600 s und
höchstens 60 Bahnabstände je relevanter Richtung begrenzt.

3D nutzt Three.js mit WebGL. Ohne WebGL erscheint ein Hinweis; die 2D-Ansicht
bleibt verfügbar. Die aufwendige synchrone CAD-Vereinfachung wird nicht gestartet. Originale
CAD-Modelle zeigen Roboter, Werkzeug und zentrale Aufhängung. Die Auftragsschicht
wächst mit ausdrücklich überhöhter Darstellung; Schnitte nutzen die volle Rechenauflösung.

## Prüfung

`tests/roboter-bahnplanung.test.ts` prüft Flächennormierung, Ringprofil,
Abstands-Skalierung, Mengenerhaltung, Fördermenge null, lineare Zeit- und
Mengenwirkung, Geschwindigkeit, Overspray, alle Szenarien, vertikale
Haltebahn, ausgeschalteten Wendestreckenauftrag, Keildichte, Zeitstände,
Schnittinterpolation, Statistik und Eingabegrenzen.

Browser-QA: stationärer Versuch, 3D-Höhenprofil, A/B mit verdoppelter
Fördermenge, vertikale Bahn mit Haltezeit, 3D-Bahnraum und Einzelschritt.
Fachliche/didaktische Abnahme durch den Betreiber steht aus und wird in
der App ausdrücklich so angegeben.

Die Modellkoeffizienten sind ausschließlich didaktische Setzungen.
Für eine spätere Kalibrierung können Messdaten `makeKernel()` ersetzen,
während Bahngeometrie, Auftragssummation und Auswertung bestehen bleiben.
