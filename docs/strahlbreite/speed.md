# Bahngeschwindigkeit und innere Auswertung

Messgeschwindigkeit und simulierte Geschwindigkeit in mm/s, zulässig 0 < v <= 800. Alle drei Lehrbeispiele erhalten auf Vorgabe 300 mm/s als Referenzparameter (keine unabhängig verifizierte Messmetadatenangabe). Ohne Referenzwert bleibt das Messprofil unverändert auswertbar. Positive, endliche Geschwindigkeiten skalieren die zusätzliche Totalbeschichtung mit v_ref/v. Die blauen Referenzkurven und die Einzelbahnlinien bleiben bei Messgeschwindigkeit sichtbar; der zusätzliche Verlauf und Mittelwert sind grau. Bei gleicher Geschwindigkeit wird nur eine Kurvenpaarung gezeichnet. Der Messplot bleibt unverändert. Reset stellt nur die Geschwindigkeit wieder her.

Excel-Vorlage wird im Browser aus den aktuellen Messpunkten (sonst idealem Beispiel) erzeugt. A/B bleiben Ort und Schichtdicke, D1 ist exakt `Bahngeschwindigkeit [mm/s]`, E1 die positive numerische Referenzgeschwindigkeit oder leer. Import liest beides atomar; ungültige Metadaten erhalten den bestehenden Datensatz. Bestehende zweispaltige Dateien bleiben kompatibel.

Innere Auswertung: bei Profilstütze [a,b], n Bahnen und Versatz d beträgt der randfreie Bereich [b-d,a+n*d]. Dort können fehlende Nachbarbahnen außerhalb der endlichen Bahnfolge nicht beitragen. Mindestens eine vollständige Periode d und mindestens zwei Bahnen erforderlich. Mittelwert durch Trapezintegration des linearen Rasterverlaufs einschließlich interpolierter Bereichsgrenzen. Welligkeit = 100*(max-min)/Mittelwert. Keine Kennzahlen bei zu schmalem Bereich. Plot zeigt echten Verlauf, Mittelwert und markierten Bereich.

Die historische 95-%-Kennzahl bleibt ausschließlich in der Referenzlogik zur Regression der Migration erhalten und wird nicht mehr als Gesamtschichtdicke angezeigt. Manuelle Schichtdickenlinie entfällt zugunsten der tatsächlichen Bereichsauswertung.

Modellannahmen: konstanter Materialstrom, unverändertes Strahlprofil; keine Beschleunigung oder Bahnendeneffekte. Der dargestellte Verlauf ist eine Modellberechnung, keine neue Messung.
