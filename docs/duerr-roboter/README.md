# Dürr Roboter – Brush-Editor (Testphase)

Route: `/duerr-roboter`, Kategorie: „Fokus: Dürr Lackierroboter“.

Die Originaldatei dient als Startvorlage. Die Verarbeitung findet vollständig im Browser statt, ohne Upload der Arbeitsdateien. ZIP-Import und -Export enthalten die Roboterdatei unter ihrem unveränderten Dateinamen, README.md, brush-editor.json (Nutzer/Datum) und Aenderungen.csv (Vergleich zum letzten Import). Weitere sichere ZIP-Einträge werden erhalten. ZIP-Import ist auf 8 MB entpackten Inhalt und 30 Einträge begrenzt.

## Bestätigtes Format

12.024 Byte: ein geschützter Anfangsblock und 500 Blöcke à 24 Byte. Brush n beginnt bei n × 24. Alle Werte sind Little Endian.

| Parameter | Versatz im Brush | Datentyp | Eingabebereich |
|---|---:|---|---|
| BLL1 | 0 | Float32 | 0–6,00 bar, 0,01 bar Auflösung |
| BLL2 | 8 | Float32 | 0–6,00 bar, 0,01 bar Auflösung |
| ML1 | 16 | UInt32 | 0–70.000 U/min, ganzzahlig |
| HV | 20 | UInt16 | 0 oder 100–400 µA, ganzzahlig |
| FM | 22 | UInt16 | 0–900 cm³/min, ganzzahlig |

Die Bereiche 4–7 und 12–15 sind nicht zugeordnet und bleiben erhalten. Brushes 1–99 sind schreibgeschützt. Brush 500 ist nutzbar. Die Vorlage wurde mit dem Originalexport und dem zweiten Export mit BLL1=1, BLL2=2, ML1=3, FM=4, HV=100 in Brush 100 abgeglichen. Der Encoder reproduziert den zweiten Export bytegenau. Eine unveränderte Datei wird nicht neu serialisiert. Der Export prüft alle Byteänderungen gegen die erlaubten Feldpositionen.

## Bedienung

Einzelbearbeitung erfolgt durch Auswahl einer Brush-Nummer, Eingabe der Werte und „Brush übernehmen“. Nicht geänderte Felder behalten ihre Originalbytes. Rückgängig/Wiederholen betrifft Brush-Änderungen; Notizen werden separat bearbeitet. Rücksetzen bezieht sich auf den letzten Import.

Versuchsreihen kopieren die fünf Werte eines Ausgangsbrushs. Die unbekannten/reservierten Daten bleiben im jeweiligen Zielbrush erhalten. Lineare Variation kann gekoppelt oder als vollständiges kartesisches Produkt erfolgen. Beide Grenzen sind enthalten, Werte werden auf Geräteauflösung gerundet. Bei einem Wert müssen Start und Ende gleich sein. Vorschau zeigt bisherige und neue Werte. Belegte Zielbrushes erfordern die ausdrückliche Überschreibbestätigung. Eine Reihe darf Brush 500 nicht überschreiten. HV-Werte in der Lücke 1–99 werden verworfen.

## Validierung

`tests/duerr-roboter.test.ts` prüft reale Exportdaten, bytegenauen Vergleichsexport, unveränderten ZIP-Roundtrip, README/Metadaten/Zusatzdateien, geschützte Bytes, Brush 500, Wertebereiche und HV-Lücke, gekoppelte Reihen, Kombinationen, Zielbereichsüberlauf und ungültige ZIPs.

Vorläufige Version: Import und Prozesswerte müssen bei der Erprobung am Gerät geprüft werden. Die Anzeige des Testphasen-Hinweises steht dauerhaft vor der einklappbaren Programmbeschreibung. Eine Anlagenabnahme wird nicht behauptet.
