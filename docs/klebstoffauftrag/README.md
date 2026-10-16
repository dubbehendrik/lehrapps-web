# Klebstoffauftrag – erste Planungsfassung

Route: `/klebstoffauftrag`, Kategorie Labor.

## Funktionsumfang
- Gemeinsames parametrisches Modell für bemaßten 2D-Längsschnitt, Einzelteilansichten,
  schematische drehbare 3D-Darstellung und fünfseitiges Werkstatt-PDF.
- Alle vereinbarten Konstruktionsmaße veränderbar; konstruktive Kollisions- und
  Bereichsprüfung. Grenzwerte für Wandstärken sind Planungsregeln, keine Normfreigabe.
- Füllhöhe 0–100 % inkl. Konus; invertierbare Volumen-/Höhenbeziehung mit Stiftverdrängung.
- Ziel-/manuelle Nassfilmdicke, endliche Vorlage, wandernde Front und konservative Bilanz.
- Animation, Zeitregler, Filmüberhöhung, Endprofil, PNG, CSV, Parameter-JSON mit geprüftem Import.
- Gemeinsames Canvas-Video über MediaRecorder mit Codec-Prüfung, Fortschritt und Abbruch.
- Eigene Kapitel der einklappbaren Programmbeschreibung: Ablauf, Modellannahmen, Exporte.

## Wesentliche Einschränkung
Das abgestimmte gekoppelte achsensymmetrische Ringraum-/Meniskusmodell ist **nicht
implementiert**. Die App bezeichnet den Standardmodus durchgängig als Planungsszenario
mit vorgegebener Filmdicke. Viskosität und Oberflächenspannung verändern diese Szenarioschicht
nicht. Keine erfundene, vorgeblich prognostizierte Filmmitnahme.
Die ebene Klein-Ca-LLD-Beziehung ist nur eine Referenz mit konservativer Gültigkeitssperre.
Bei den Defaults ist sie nicht für Auftragsanimation oder Materialprognose freigegeben.

## Mengenmodell
Alle Geometrien sind intern mm und mm³. Der obere Anschlag liegt an der
Unterseite der ortsfesten Aufnahme. Reservoirboden = Einspanntiefe + Deckeldicke
+ Reservoirhöhe + aktueller Hub. Die Front ist Boden minus aktuelle Füllhöhe.
Die implizite Bilanz je Schritt lautet:

V_neu + Integral_von_alter_bis_neuer_Front A_Film(z) dz = V_alt.

Neue Front = Hub + Boden_bei_Start - Füllhöhe(V_neu), begrenzt auf die Stiftspitze.
Ein Leerereignis wird über das noch verfügbare Schalenvolumen gelöst.
A_Film(z) = pi * ((r(z)+h)^2-r(z)^2).
Der Stift ist bis zum Spitzenbeginn zylindrisch, danach kegelig. Die Nassschicht
an der Spitze ist nur als axiale Ringschicht angenähert. Die Reservoirhöhenrelation
setzt weiterhin zylindrische Stiftverdrängung voraus: Die späte Spitzenüberfahrt,
Flüssigkeitsbrücken und Tropfen sind kein physikalisch aufgelöster Teil des Modells.
Wandfilm, Holzaufnahme, Kapillarhöhenänderung, Verdunstung und Ablaufen fehlen.
Die Mengenrechnung ist damit eine günstige idealisierte Planung, keine Prozessvalidierung.

## Material
MECOFLOCK D453/5 TDS: 5 Pa s bei einer Brookfield-Messbedingung, 44 Masse-% Feststoff,
Lieferdichte 1.11 g/cm³. Wasserzugabe bezogen auf die Liefermasse.
Volumenadditivität und Wasser 1 g/cm³ werden angenommen.
Feststoffdichte 1.2 g/cm³ und Flüssigkeitsoberflächenspannung 40 mN/m sind editierbare
Annahmen. 10 % Wasserzugabe liegt über dem TDS-Wert von max. 5 %.
Keine rechnerische Verdünnungskorrektur der Viskosität.

## Zeichnungen
Zusammenbau; POM-Grundkörper; Deckel; Edelstahlaufnahme; Parameter/Notizen.
Zwei gegenüberliegende M4-Senkschrauben, radiale 2x2-mm-Nut um 90 Grad versetzt.
Senkungsgeometrie nur Vorentwurf (90 Grad, Kopf-Ø = 2*M); tatsächliche Schrauben,
Bohrtiefen und Passungen müssen mit der Werkstatt abgestimmt werden.
Die Stativklemme ist schematisch, kein fertig dimensionierter Anschluss.

## Validierung
11 neue Vitest-Fälle: geometrischer Referenzwert des alten 7.6-mm-Reservoirs,
Konuswinkel, Volumen-Höhen-Inversion, Verdünnungsbilanz, analytisches Schalenvolumen,
Leerereignis, 300/1200-Schrittvergleich, bewegter Spiegel, Sperre der LLD-Referenz,
Startposition, unabhängige Szenarioviskosität, Eingabegrenzen und SVG-Erzeugung.
Zeichnungs-SVGs und Animationscanvases wurden mit einem Canvas-Renderer gerendert
und visuell geprüft. React-Oberfläche wurde mit gemocktem Plotly serverseitig gerendert.
Browserinteraktionen, tatsächlicher PDF-Download und MediaRecorder-Export wurden
mangels verfügbarer Browser-Prüfumgebung nicht end-to-end geprüft.
Fachliche Abnahme durch den Nutzer steht aus; SupportFooter reviewed=false.
