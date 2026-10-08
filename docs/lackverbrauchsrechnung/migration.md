# Lackverbrauchsrechnung – Migration

Quelle: dubbehendrik/Lackverbrauch-Rechner, Commit 252d88cac74878f354f465f2cd822b8ec23f63f0. Originalrepository unverändert. Quellmodell und Streamlit-Oberfläche liegen hier als eingefrorene Referenz.

Route: /lackverbrauchsrechnung. Browserberechnung ohne Python-Server.

## Funktionsumfang

Alle drei Materialrechenwege und Produktionsvorgaben, vier Zeiträume, Schichtmodell, Defaultwerte, aktuelle Vorschau, gespeicherte Szenarien, Referenzvergleich einschließlich undefinierter Prozentabweichungen bei Referenzwert null, Reset, Parameteransicht, drei Diagramme sowie CSV/Excel/PNG/SVG sind übertragen. CSV und Excel enthalten ausschließlich gespeicherte Szenarien. Excel enthält Zeiträume, Parameter, Verläufe und Einheiten. Bildexporte enthalten keine Vorschau. Formeln verwenden native MathML-Brüche und Indizes. Support führt per E-Mail mit App-Betreff zu hendrik.dubbe@hs-esslingen.de.

Der zusätzliche Browser-Excel-Schreiber ist für den bestehenden Excel-Export erforderlich und wird erst bei Export geladen. Bestehender Excel-Leser bleibt unverändert.

## Modell und Grenzen

Materialbilanz intern mit konsistenten Einheiten, Rundung erst bei Ausgabe. Verarbeitungsfertiger Lack und TDS-Angaben für denselben Zustand. Werkstückpausen beeinflussen Spritzstrom, aber weder Stückverbrauch noch Taktmittel. Verlustkosten sind Teil der Gesamtkosten. Keine Reserve-, Mischungs-, Mehrschicht- oder Kalenderrechnung. Monat ist Jahr / 12. Rechnerische Stückzahlen sind kontinuierliche Planungswerte; vollständige Stücke werden abgerundet.

## Fachliche Prüfung

109 deterministisch erzeugte Python-Referenzfälle decken alle Kombinationen der drei Rechenwege, drei Produktionsvorgaben und vier Zeiträume sowie die Defaults ab. Reproduzierbar mit `python scripts/generate-lackverbrauch-references.py`. Vergleich aller abgeleiteten Größen und Zeitraumwerte mit numerischen Toleranzen. Zusätzlich unabhängige Materialbilanz, Pause, 100% MNG, Preis null, inaktive Eingaben, Grenzfälle und Export-Endwerte.

Unabhängige Referenz: 1 m², 50 µm, 1500 kg/m³, 60 Gew.-%, 1,25 kg/L, MNG 50% ergeben 0,25 kg und 0,20 L je Stück. Bei 120 Stück/h, einer Schicht mit 8 produktiven Stunden, 5 Tagen und 40 Wochen: 192000 Stück und 38400 L/Jahr.

247 projektweite Tests, TypeScript und Produktionsbuild bestanden. Die sechs Original-Python-Modelltests bestanden. Original-Streamlit-UI-Tests wurden mangels Streamlit im lokalen Runtime nicht ausgeführt; Web-UI wird separat geprüft.

Browserprüfung: Desktop 1440×1000, Tablet 768×1024, Smartphone 390×844 ohne Seitenüberlauf oder JavaScript-Fehler. Szenario speichern/ergänzen, MNG ändern, Sensitivitätsdiagramm, Zielstückzahl und Validierung, Reset sowie alle vier Exporte geprüft. Excel-Datei unabhängig mit openpyxl gelesen: vier Blätter, 4 Zeitraumzeilen und 404 Verlaufszeilen für ein Szenario. Screenshots dokumentieren den geprüften Stand.
