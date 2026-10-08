# Zerfallsarten: Migration

Referenz: dubbehendrik/Zerfallsarten, Commit b0d620d5366905d12f72db816771d96fee8b5dff. Die unveränderte Streamlit-Datei ist hier eingefroren; das originale Diagramm liegt unter public/zerfallsarten.

Übertragen: sieben Eingaben mit Originalstandardwerten, SI-Umrechnung, Ohnesorge-Zahl, Kantenbelastung, Weber-Zahl, Betriebskennzahl, Filmdicke, logarithmische Pixelabbildung, Diagramm und Quellenhinweis. Logo und E-Mail-Support stammen aus dem gemeinsamen Framework. Ergänzt: Reset, CSV und verständliche Eingabevalidierung. Die Python-Repositories bleiben erhalten.

Diagramm: Originalauflösung 1096 × 720; Kalibrierpunkte (170,601) und (1050,50), Oh von 1e-4 bis 1, B von 1e-2 bis 3. Ein responsives SVG legt den Betriebspunkt ohne Verzerrung auf die Originalabbildung. Außerhalb der Achsen wird kein Marker vorgetäuscht. Keine automatische Zerfallsart: Grenzlinien liegen nur als historische Rasterabbildung vor.

Vier Referenzfälle in tests/zerfallsarten-references.json wurden durch direkte Ausführung der unveränderten Python-Funktionen mit NumPy erzeugt (AST extrahiert nur Funktionen). Vergleichstoleranz der Kennzahlen: relativ 1e-12, Diagrammkoordinaten: 10 Dezimalstellen. Standardfall: Oh 0.02132007163556104, Kb 0.00011788408779149521, We 138964029.96733814, B 2.154956380154948, Filmdicke 9.431226047342928 µm, Marker (682.3335051095572,81.96016612065739).

Tests prüfen außerdem ungültige/nichtendliche Eingaben, Winkelgrenzen, Diagrammgrenzen und physikalische Skalierungen. Browserprüfung: Desktop, Tablet, Telefon; MathML, leere Eingabe, null, außerhalb liegender Punkt, Reset, CSV, Deep-Link und Übersichtsnavigation; Ergebnisse und Screenshots liegen in diesem Ordner.

Modellgrenzen: konstante Viskosität, Newtonsches Fluid; Filmdickenmodell wird bei Winkeln nahe 0°/180° singulär. Empirische Bereichsabbildung ist keine allgemeine Betriebsfreigabe.
