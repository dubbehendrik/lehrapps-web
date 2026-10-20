# Dimensionsanalyse

Route `/dimensionsanalyse`, Kategorie `vorlesung`. Die App arbeitet vollständig im Browser und verwendet Native MathML sowie die bestehenden Plotly-Komponenten. Für räumliche Vektoren ergänzt sie das zum vorhandenen Plotly passende GL3D-Bundle; es wird mit der App und nicht auf der Startseite geladen.

## Module

- 50 fachlich erläuterte Kennzahlendefinitionen mit Größen, Einheiten, Konventionen und Beispielen. Keine numerischen Einzelkennzahl-Rechner.
- Zwölf kuratierte Aufgabenfamilien. Gebiet, Schwierigkeitsgrad und Größenanzahl filtern ausschließlich vorhandene Vorlagen; es werden keine technisch beliebigen Größenmengen erzeugt. Lernmodus und zunächst verborgene Prüfungslösung, Übernahme in den Schnelllöser.
- Schnelllöser: bis zu 16 Größen, Mehrfachauswahl mit editierbaren Indizes und Bedeutungen, eigene rationale Dimensionsvektoren, Zielgröße und manuelle oder automatische Wiederholungsgrößen.
- Dimensionsraum: skalierte Vektorzüge, Ursprungspfeile in auswählbaren Projektionen, vollständige Dimensionsbilanz und exakte Auswahl unabhängiger Koordinatenzeilen. Bis Rang 3 ist eine verlustfreie Darstellung möglich. Ab Rang 4 wird ausdrücklich eine Projektion verwendet.

## Mathematik und Grenzen

Die sieben Koordinaten sind kg, m, s, K, A, mol und cd beziehungsweise M, L, T, Θ, I, N und J. Die Matrix hat Dimensionen in Zeilen und Größen in Spalten. `logic.ts` implementiert mit BigInt normalisierte rationale Zahlen, reduzierte Gauß-Elimination und eine Nullraumbasis. Jeder freie Exponent wird einmal auf 1 gesetzt. Pivotspalten bilden die Wiederholungsgrößen; eine Zielgröße wird nach Möglichkeit nicht als Pivot verwendet.

Die bekannte Kennzahlenerkennung benutzt die Größenarten, nicht nur gleiche Dimensionsvektoren. Sie zeigt alle mit dem Satz darstellbaren Katalogdefinitionen; dies ist keine zusätzliche unabhängige Basis. Bei mehreren Exemplaren einer Größenart gilt die erste Instanz. Nu und Bi werden beide mit dem Hinweis auf die erforderliche Fluid- bzw. Festkörperleitfähigkeit gezeigt. Eigene Größen werden nicht automatisch bekannten Größenarten gleichgesetzt. Re und Pr unterstützen zusätzlich die äquivalenten ν- bzw. η-cp-λ-Darstellungen.

Die formale Dimensionsprüfung aller Katalogformeln ersetzt keine vollständige Literatur- oder Lehrendenprüfung. Eine fachliche Abnahme durch Prof. Dubbe wird nicht vorweggenommen. Spezifische Quellen und Konventionen sind in der Bibliothek zugänglich. Dimensionsanalyse beweist keine Modellvollständigkeit und bestimmt keine funktionalen Zusammenhänge.

## Validierung

`tests/dimensionsanalyse.test.ts` prüft Reynolds, Biot (Rang 2 trotz vier auftretender Dimensionen), Tropfenströmung, Druckverlust, dimensionsgleiche Größen, rationale Exponenten, Rang 0, leere Eingabe, alternative Wiederholungsgrößen und die Koordinatenreduktion. Alle 50 Kennzahlendefinitionen werden exakt auf Dimensionslosigkeit geprüft. Für jede der zwölf Aufgaben werden Dimensionslosigkeit, Unabhängigkeit und Vollständigkeit der erzeugten Basis geprüft.

Der Projekt-Testlauf ist auf zwei gleichzeitige Prozesse und 30 Sekunden je Test begrenzt. Numerische Simulationsfälle anderer Apps überschreiten in geteilten Laufzeitumgebungen die vorherige Standardgrenze von fünf Sekunden. Es wurden keine fachlichen Assertions abgeschwächt.
