# Temperaturverläufe

Gemeinsame Browser-App unter /temperaturprofil. Referenzen: dubbehendrik/temperaturprofil und temperaturprofil_forward (Python-Kopien im selben Ordner). Original-Repositories bleiben unverändert.

## Fachlicher Umfang

Analytische Newtonsche Erwärmung/Abkühlung mit räumlich einheitlicher Temperatur. Konstante Größen alpha, cp, A, m, T∞. Verallgemeinert auf frei gewählte Referenzzeit und Referenztemperatur. Fit ausschließlich alpha >= 0, ungewichtete kleinste Quadrate. Zeitwerte werden nicht automatisch normiert. Fit-Intervall unabhängig vom Referenzpunkt, inklusive Grenzen. Mindestens drei unterschiedliche Messzeitpunkte. R² bei konstanter Messung nicht definiert.

Vorwärtsmodus ohne Datei; Fitmodus mit bestehender Excel-Vorlage, Originalbeispielen oder Copy-Paste. Import erstes Tabellenblatt, Kopfzeile, A/B Messung, F2:F6 Parameter. Leere Messspalten bedeuten keine Messung. Unvollständige Excel-Zeilen werden mit sichtbarer Anzahl ausgeschlossen (die Originalbeispiele enthalten vorbereitete Zeitwerte ohne Temperatur). Ungültige Zeilen der editierbaren Tabelle werden gemeldet und blockieren die Berechnung. Tabelle bearbeitbar; Bezeichnung frei editierbar. Referenzzeit für alte Excel-Vorlagen zunächst 0.

Live-Vorschau, unabhängige Kurvensnapshots, Graph behalten, Einzelkurven löschen, Herkunft alpha (Fixed-Value oder bezeichnete Messung), Fitbereich, Parametersätze und Residuen. Änderungen relevanter Fit-Eingaben markieren den Fit als veraltet. Das Umschalten auf vorgegebenes alpha erlaubt manuelle Vergleiche mit Messungen.

Diagramm: Sekunden/Minuten, Höhe, volle Breite, manuelle Achsen, Zoom. Parameterboxen neben der Zeichenfläche. CSV/Excel enthalten ausgewählte Kurvensnapshots einschließlich Messdaten, Parameter, Herkunft und Fit-Kennzahlen; PNG/SVG enthalten ausgewählte Kurven und Parameter. Maus-Zoom wird nicht exportiert, numerische Achsengrenzen schon. Keine Speicherung über die Sitzung hinaus.

## Referenzprüfung

`scripts/generate-temperature-references.py` erzeugt NumPy/SciPy-Referenzen aus unveränderten Excel-Dateien. `tests/temperaturprofil.test.ts` prüft vollständige und halbe Fitbereiche beider Beispiele sowie Erwärmung, Abkühlung mit verschobener Referenz, alpha=0 und nichtteilbaren Zeitschritt. Fit-alpha absolute Toleranz 0.0005 W/(m² K); RMSE/R² 5e-8. Weitere Grenzfälle: ungültige Parameter, leere/teilweise Tabellen, konstante Daten und unidentifizierbares Modell.

| Beispiel | Intervall s | alpha W/(m² K) | RMSE °C | R² |
| --- | --- | --- | --- | --- |
| ideal | 0–220 | 50.1041842791 | 2.8202638669 | 0.9963524944 |
| ideal | 0–110 | 49.9398651517 | 2.7732467247 | 0.9956113984 |
| real | 0–1400 | 17.0031044205 | 9.3567075826 | 0.9210501078 |
| real | 0–700 | 18.9488324263 | 10.1036599494 | 0.8784032911 |

Das Beispiel „ideal“ enthält bereits Messrauschen. Unterschiedliche Intervall-Fits liefern effektive Koeffizienten und beweisen kein zeitvariables alpha.
