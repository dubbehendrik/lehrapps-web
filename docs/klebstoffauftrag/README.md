# Klebstoffauftrag – fester Schutzdeckel, offener Reservoirkörper

Route: /klebstoffauftrag. Geometrieplanung und konservative Mengenszenarien;
keine validierte gekoppelte Ringraum-/Meniskusprognose.

## Konstruktion ab dieser Revision
- Deckel fest mit der Edelstahlaufnahme verschraubt. Zwei M4-Senkschrauben
  von unten durch den Deckel in Gewindesacklöcher der Aufnahme.
- Lochkreis Default Ø26 mm, Schraubenpaar um 90° zur radialen Klemmung gedreht.
- Nominale Deckelbohrung folgt dem Stiftdurchmesser (Default Ø7 mm).
  Kein Durchlauf des frisch beschichteten Abschnitts durch den festen Deckel,
  keine mitfahrende Rakel.
- Deckelaußendurchmesser separat einstellbar, Default wie Grundkörper Ø60 mm.
- Gewöhnliche M4-Flügelschraube, zwei Flügel. Vorläufige Spannweite 18 mm,
  Abstand Kopfmitte zur Halterungswand 12 mm. Eingabefelder veränderbar.
- Konservative Kopf-Hüllraumprüfung gegen Deckel und Grundkörper am Start.
  Kopfstärke angenommen 1,5*M. Hinweis, keine harte Kollisionssperre; reale
  Schraube und ausreichender Bedienraum sind in der Werkstatt zu prüfen.
- Reservoirkörper ohne Deckelbefestigungsgewinde. Er liegt am Start an der
  Deckelunterseite an, wird über die radiale Nut befüllt und allein abgezogen.
- Maximale geometrische Füllhöhe bleibt die Oberkante des Grundkörpers.
  Überlauf über die Dosiernut und dessen Volumen sind nicht modelliert.

## Bewegungs- und Mengenmodell
Fester Deckel: z = Einspanntiefe bis Einspanntiefe + Deckeldicke.
Körperoberkante: Einspanntiefe + Deckeldicke + Hub.
Abzugshub: Stiftlänge - Einspanntiefe - Deckeldicke + 2 mm, Default 157 mm.
Das Reservoirvolumen und der Benetzungsbeginn bleiben unverändert:
Bei voller Füllung beginnt das Szenario an Einspanntiefe + Deckeldicke.
Reservoirfüllung und Ringschichtvolumen bleiben konservativ gekoppelt.

Film vorgegeben aus Ziel-Trockenfilm/Volumenfestkörper oder manuell.
Viskosität und Oberflächenspannung beeinflussen diese Szenarioschicht nicht.
LLD dient nur als gesperrte Referenz außerhalb der konservativen Prüfgrenzen.
Vollständiges Nachlaufen; keine Leckage, Wandfilme, Holzaufnahme, Verdunstung,
Ablaufen oder lokale Benetzungsfehler. Konische Spitze nur axiale Ringschicht,
Reservoirhöhenrelation auch im Endhub mit zylindrischer Stiftverdrängung.

## Zeichnungen und Exporte
Fünfseitiges PDF: Zusammenbau, gewindefreier Grundkörper, fester Deckel,
Edelstahlaufnahme mit Gewindebohrungen, Parameter/Notizen.
Deckel und Aufnahme: Unteransicht; Senkungen auf Deckelunterseite.
Schraubenlängen, reale Köpfe, Bohrzugabe für Gewinde und Passungen offen.
JSON-Version 2. Legacy-Version 1 wird ausdrücklich migriert: Deckelöffnung,
neue Kopfdimensionen und gegebenenfalls Lochkreis werden angepasst;
Ladehinweis fordert neue Prüfung der Werkstattmaße. Keine stille Migration.
CSV/JSON ungerundet, Bildschirmdarstellung mit maximal einer Nachkommastelle
und wissenschaftlicher Darstellung kleiner Zahlen. PNG und browserabhängiger
Videoexport verwenden dieselben aktualisierten Zeichnungsfunktionen.

## Prüfung
Regressionen für feste Deckelpose, Hub, Volumenerhaltung, enge Deckelöffnung,
unabhängigen Deckeldurchmesser, Gewinde in der Aufnahme, Flügel-Hüllraum,
Dateimigration, Sichtbarkeit und mathematische Formeln.
Canvas- und SVG-Ansichten werden außerhalb des Browsers gerendert und geprüft.
PDF-Download und Videoencoder sind nicht browserübergreifend end-to-end geprüft.
Fachliche Abnahme durch den Nutzer steht aus.

