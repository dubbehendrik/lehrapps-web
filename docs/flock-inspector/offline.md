# Offline-Paket

`npm run build` erstellt neben der Online-App automatisch
`dist/downloads/Flock-Inspector-Offline.zip`. Cloudflare Pages veröffentlicht
beide Ausgaben aus demselben Commit; der Download in der App bleibt konstant.
Keine separate Kopie der Berechnungslogik und kein manuelles Aktualisieren
von ZIP-Dateien im Repository.

Das Paket enthält `Start-Flock-Inspector.html`, Anleitung, Versionsinformation
und Drittanbieter-Lizenzen. Alle Skripte, Styles, die Erkennung als klassischer
Blob-Worker und das Beispielbild sind eingebettet. Kein Server, kein CDN und
kein Internet erforderlich. Externe Support-Links benötigen eine Verbindung.
Ein dedizierter React-Einstieg verwendet den regulären Flock-Inspector.

Zielbrowser ist Firefox 115 ESR (Windows 7 SP1, 32/64 Bit). Build-Syntax wird
auf `firefox115` begrenzt. Windows-7-Kompatibilität setzt eine funktionierende
Firefox-Installation voraus; ein Linux-Browsertest ersetzt keinen Test auf
dem Laborrechner. Internet Explorer wird nicht unterstützt.

Projekte vor dem Schließen als ZIP exportieren. Aktualisierung: neu downloaden,
in einen separaten Ordner entpacken, Projekt importieren. Die HTML-App ruft
keine Updates automatisch ab. Versionsdatum und Git-Commit werden mitgeliefert.

## Prüfung am 13.10.2026

534 Referenz- und Funktionstests, TypeScript und beide Builds bestanden.
Direktstart via `file://` in Firefox 115.0 ESR unter Linux, HTTP/HTTPS-Proxy
auf unerreichbaren lokalen Port gesetzt; keine HTTP-Ressourcen geladen.
Geprüft: Bildimport, Zweipunktkalibrierung, Erkennung im eingebetteten Worker,
Mehrfachauswahl, Drehung, ZIP-Speichern und Wiederladen, CSV- und PNG-Export,
signifikantes und nicht signifikantes Welch-Ergebnis, Plotly-Diagramme,
eingebettetes Beispielbild. Prüfung auf dem Windows-7-Zielrechner bleibt nötig.
