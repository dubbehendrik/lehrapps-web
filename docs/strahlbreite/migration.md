# Migration Strahlbreite

## Quelle und Umfang

Quelle: https://github.com/dubbehendrik/Strahlbreite, `main`,
Commit `aeff88e6d72c47122f29f6175a24c11e2e112a88`.
Die unveränderte Streamlit-Quelle liegt hier in `streamlit-reference.py`.
Die drei Original-Exceldateien liegen unter `public/strahlbreite/`.
Das Quellrepository wird nicht verändert. Route: `/strahlbreite`.

Vollständig übertragen: Excel-Upload, drei Beispiele, Vorlage-Download,
Entfernen der Daten, Spline-Glättung per Slider und Zahleneingabe,
Einzelstrahl mit Messpunkten und Halbhöhenbreiten-Markierungen,
Bahnzahl, Bahnversatz per Slider und Zahleneingabe, beide ÜL-Presets,
Totalbeschichtung mit einzelnen Bahnen und den zwei Breitenrechtecken,
automatische/manuelle h_ges-Ermittlung, Ergebnisausgabe, Feedback,
Kontakt und Nutzungshinweise. Plotly bietet zusätzlich PNG-Export.

Beim Laden neuer Daten werden Einstellungen zurückgesetzt:
s=0, 15 Bahnen, Δy=Sb50/2, automatische Auswertung. Der Start bleibt
wie in Streamlit leer, bis Daten gewählt wurden. Nach Entfernen oder
Seitenneuladen werden keine alten Uploads gespeichert.

## Fachliche Berechnung

1. Erstes Excelblatt, erste zwei Spalten, erste Zeile als Überschrift.
   Zeilen mit fehlenden Werten werden wie pandas.dropna entfernt.
2. Kubischer UnivariateSpline mit Einheitsgewichten. s=0 interpoliert,
   s>0 begrenzt die Summe quadrierter Abweichungen an den Messpunkten.
   Der Faktor hat entsprechend die Einheit µm² (Ort: mm; Dicke: µm).
3. TypeScript-Port des FITPACK-Algorithmus inklusive adaptiver Knoten,
   Givens-Rotationen, Ableitungssprung-Minimierung und rationaler
   Nullstelleniteration. SciPys anfängliche Knotenkapazität m/2 sowie
   Neustart bei Platzmangel werden übernommen, da sie die adaptive
   Knotenwahl beeinflussen. Kein Ersatz durch einen anderen Glätter.
4. x_interp = arange(min(x), max(x), 1 mm), rechte Grenze ausgeschlossen.
5. Kosinus-Randdämpfung über jeweils 10 % der ursprünglichen Messbreite.
   Negative Spline-Unterschwinger werden wie in Python nicht gekappt,
   aber in der Oberfläche benannt. Negative Rohmessungen werden abgewiesen.
6. h_max = max(y_interp). Sb50 = Abstand zwischen erstem und letztem
   Rasterpunkt mit y ≥ h_max/2. Keine interpolierten Schnittpunkte.
   Mehrere Peaks: äußere Grenzen, einschließlich der Täler dazwischen.
7. x_total = arange(min(x_interp), max(x_interp)+(n-1)Δy, 1 mm).
   Einzelstrahlen werden linear auf dieses Raster interpoliert;
   außerhalb ihres Stützbereichs Beitrag 0. Die rechte Grenze bleibt
   auch für eine einzelne Bahn ausgeschlossen, wie in der Referenz.
8. h_ges_auto = mean(y_total[y_total ≥ 0.95 max(y_total)]).
   Das ist **kein Flächenmittel** und auch kein Mittel über alle Bahnen.
   Es umfasst alle ausgewählten Rasterwerte, auch nicht zusammenhängende.
9. ÜL[%]=(Sb50−Δy)/Sb50·100, ÜL[−]=Sb50/Δy.
10. Manuell: 0 ≤ h_ges ≤ max(y_total). Die automatische Berechnung
    bleibt unabhängig von der manuellen Linienposition.

## Eingaben und begründete Verbesserungen

- s: 0–20; Bahnen: ganze Zahl 1–100; Δy: 0,1 mm bis Sb50.
- Mindestens vier vollständige, endliche Messpunkte; streng aufsteigende
  Orte ohne Duplikate; nichtnegative Rohdicken und mindestens ein Wert >0.
- Mindestens 2 mm Messbereich, um ein 1-mm-Profil sinnvoll auszuwerten.
- Maximal 2.000 Messpunkte, 10 MB Excel, 50.000 Rasterpunkte je Diagramm.
  Diese Grenzen verhindern übermäßige Browserarbeit, nicht den normalen
  Einsatz der drei Originalbeispiele. Uploads werden lokal verarbeitet.
- Nicht bestimmbares Sb50: Einzelstrahl bleibt sichtbar, Totalbeschichtung
  wird mit verständlicher Fehlermeldung gesperrt statt NaN-Slider/Absturz.
- Beim Wechsel der Glättung wird gewähltes Δy auf die neue Breite begrenzt,
  wie in Streamlit. Neues Beispiel oder Upload setzt alle Eingaben zurück.
- Beispiele und Uploads können direkt ausgetauscht oder entfernt werden;
  fehlerhafter Upload erhält die zuvor gültigen Daten mit Fehlermeldung.
- Fehlende Werte werden ausgelassen; Text/Datum statt Zahl wird mit
  Zeilennummer abgewiesen. Kein stilles Sortieren oder Zusammenfassen.
- Automatische h_ges-Definition steht ausdrücklich in der Oberfläche.
- Feedback/Footer gemeinsam mit der Normalverteilung; deren Mathematik,
  Eingaben und Diagramme bleiben unverändert.

## Reproduzierbare Python-Referenzen

`python scripts/generate-strahlbreite-references.py`
Benötigt SciPy 1.17.0, NumPy, pandas, openpyxl. Dateien:
`tests/strahlbreite-references.json`,
`tests/strahlbreite-spline-references.json`,
`src/apps/strahlbreite/examples.json`.
Tests lesen die tatsächlichen XLSX-Dateien ebenfalls ein und vergleichen
sie mit den Beispieldaten. Die Referenzrechnung kopiert die Python-Formeln
und führt sie unabhängig vom TypeScript-Port mit SciPy aus.

| Originalbeispiel, s=0, 15 Bahnen, ÜL=2 | h_max [µm] | Sb50 [mm] | h_ges_auto [µm] |
|---|---:|---:|---:|
| ideal | 11,968294419610 | 234 | 25,570859060040 |
| real1 | 10,689106596579 | 152 | 21,586463071768 |
| real2 | 9,562065528321 | 145 | 21,795556440484 |

48 Referenzfälle: alle drei Beispiele, s={0;0,5;5;20}, 1/15/100 Bahnen,
ÜL=2 und ÜL=3 (bei 15 Bahnen). Vergleich jedes Einzelprofil-Rasterwerts,
Maxima, Breiten, h_ges, Gesamtrasterlänge und 31 Totalprofil-Stützwerte.
Zusätzlich 30 SciPy-Splinefälle mit 4/5/8/12/31/70 ungleichmäßig verteilten
Punkten und s={0;0,001;0,5;5;20}; je 101 Auswertungsstellen plus Residuum.
Toleranz: 1e−8·max(1, |Referenz|), Sb50 und Rasterlänge exakt.
Weitere Prüfungen: ungültige Daten, Grenzen, schmale Profile,
Kosinus-Hüllkurve, kubische Polynome, Maximalraster und XLSX-Parität.

## Prüfprotokoll

- 122 Vitest-Tests erfolgreich, inklusive der 33 bestehenden Tests.
- TypeScript-Prüfung und Produktionsbuild erfolgreich.
- Browserprüfungen und Ansichten: siehe `browser-results.json` und PNGs.
- Deployment führt `npm run build` aus: Testfehler blockieren die Ausgabe.
- Einziger zusätzlicher Laufzeitbedarf: exakt gepinnter XLSX-Parser
  `read-excel-file` 9.3.12; keine Serverkomponente.
- FITPACK-Attribution und Lizenz: `THIRD_PARTY_NOTICES.md`; ebenfalls
  unter `/THIRD_PARTY_NOTICES.txt` im veröffentlichten Build verfügbar.
