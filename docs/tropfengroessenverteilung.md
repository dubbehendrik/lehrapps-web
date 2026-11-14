# Tropfengrößenverteilung

Route: `/tropfengroessenverteilung`, Kategorie Vorlesung.

## Referenzdatei

Die vom Nutzer bereitgestellte `Groessenverteilungen.xlsx` enthält auf Blatt 1 eine Anzahlverteilung in 5-µm-Klassen (Mitte 2,5 bis 102,5 µm) und dieselben 203 Beobachtungen in 10-µm-Klassen. Positive Häufigkeiten der 5-µm-Klassen: 1,3,4,6,15,22,34,43,28,15,10,9,7,3,2,1. Mit dem Klassenmittenansatz ergeben sich D10 = 37,672413793103445 µm und D32 = 46,132734530938123 µm. Die kumulierten Volumenanteile bei 37,5 und 47,5 µm betragen 0,27585627497413981 und 0,52836642215419516. Diese Referenzen sind unabhängig von den neuen synthetischen Einzelwerten getestet.

Die Excel-Spalte P (10-µm-Klassen) enthält Anzahl / Klassenbreite, während F (5-µm-Klassen) zusätzlich durch 203 normiert ist. Die App verwendet durchgehend normierte Anteile und beschriftet deren Ableitung als Dichte. Die Excel berechnet Volumenmomente beim Umklassieren erneut aus Klassenmitten; die App berechnet Momente und empirische Summenkurven aus den Einzelwerten, unabhängig von der Histogrammklassierung.

## Synthetische Beispiele

Die klassierte Referenz liefert keine rekonstruierten Messwerte. Beispiel A erzeugt mit fester Zufallsfolge 20 synthetische Beobachtungen pro Ausgangszählung innerhalb der jeweiligen Klasse, zwischen 5 und 95 % ihrer Breite. Beispiel B verwendet Box–Muller und eine logarithmische Normalverteilung mit Anzahlmedian 48 µm, ln-Standardabweichung 0,48 sowie Ablehnung außerhalb 5–180 µm. Die Größenordnungen sind Lehrbeispiele zur Spritzlackierung; keine Aussage über ein bestimmtes Gerät, Material oder einen Betriebspunkt.

Fachlicher Kontext: https://www.ilasseurope.org/ICLASS/ilass2010/FILES/FULL_PAPERS/120.pdf (experimentelle Einflüsse der Glockenkante auf die Verteilung); https://www.malvernpanalytical.com/en/learn/knowledge-center/whitepapers/wp120620basicguidepartchar (Gewichtungen und Kennwerte).

## Konventionen

- Ein Tropfen pro Zeile, Durchmesser in µm, ohne Rundung der Berechnung.
- Kugelförmige Tropfen; Massengleichsetzung nur bei gleicher Dichte.
- Empirische Quantile: kleinster beobachteter Durchmesser mit kumuliertem Anteil >= p, keine Interpolation zwischen Beobachtungen.
- Klassen links geschlossen / rechts offen; letzte Obergrenze eingeschlossen.
- Lineare Klassenbreite unabhängig von x-Achsenskalierung; logarithmische Dichte nur mit positiven Klassengrenzen.
- Zwei unabhängig konfigurierte Plots; Kopplung übernimmt Plot 1 und synchronisiert anschließend alle Einstellungen.
- XLSX-Download enthält ein autoritatives Datenblatt und ein Hinweise-Blatt; nur das erste wird importiert. Zusätzliche Datenspalten werden zurückgewiesen. Herkunft eigener Imports wird nicht verifiziert.

Tests: analytisches 1000:1-Beispiel, Excel-Referenzen, Dichtenintegration, Gewichtungen, Randpunkte, Quantile, Skalierung, Klassierungsinvarianz, reproduzierbare Beispiele und Importvalidierung. Fachliche Abnahme durch den Nutzer steht bei Erstveröffentlichung aus.
