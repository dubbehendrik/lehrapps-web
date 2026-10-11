# Fachliche Referenz und Modellumfang

Quelle: Tauchreinigung.pptx (Aufgabe 2.3.1 und 16 Folien), Spritzreinigung(1).pptx (Aufgabe 2.5.1 und 18 Folien), Aufschriebe von Prof. Dr.-Ing. Hendrik Dubbe. Festlegungen im Gespräch vom 11.10.2026.

Nur die Entfettungszone wird verglichen. Die 15 m Gesamtanlage der Spritzaufgabe einschließlich Spülzonen wird deshalb nicht reproduziert. Die Entfettungszone umfasst 6 m aktive Zone + 1,8 m Neutralzone. Ein- und Auslauf außerhalb der Zone werden nicht dimensioniert.

Referenz Tauchbad: 50 m³, 20 m², 15 kg/h Verschleppung, 65,750325 kg/h Verdunstung, 80,750325 kg/h Nachspeisung. Heizwirkungsgrad 0,8. Aufheizenergie 2041,666667 kWh. Zugeführte Betriebsleistung 142,478861 kW, darin 70 kW Konvektion, 3,290308 kW Strahlung, 13,5625 kW Werkstücke, 4,121631 kW Frischwasser und 51,504421 kW Phasenwechsel.

Referenz Spritzen: 20 Ringe, 10 Düsen/Ring, 200 Düsen, 2700 l/min, f_V = 1,5 min, 4,05 m³ Bad, 4,5 m² Oberfläche. Förderhöhe 2 m mit g=9,81 m/s² ergibt 11,228625 kW statt der grob gerundeten 11,25 kW des Aufschriebs. Zusatzabkühlung 0,5 K ergibt 94,5 kW thermisch und 118,125 kW zugeführt. Aufheizenergie 165,375 kWh. Abweichungen zu handschriftlichen Summen entstehen durch Verzicht auf Zwischenrundungen.

Empirische Zahlenwertgleichung: Verdunstungsrate = 2e-5 * (Temperatur in °C)^3,07 kg/(m² h). Kein Luftfeuchte-/Strömungsmodell. Gültigkeitsbereich der App auf Wasser 0–95 °C begrenzt. Konvektion ist ein eigener fühlbarer Verlust, kein empirischer Gesamtverlust.

Optionale Verdampfungsenthalpie: 2500,9 - 2,36 * Temperatur in °C, kJ/kg. Näherung, kein Dampftafelmodell. Standard bleibt 2256 kJ/kg zur Reproduktion der Aufgabe.

Aufheizen mit Verlusten: konstante Masse, kein Durchsatz und kein Spritzen. Energiegleichung mit Konvektion, Strahlung, Verdunstung und Nachspeisung. Mittelpunktintegration in 600 Temperaturintervallen. Erreichbarkeit vor Integration mit Verlustleistung bei Solltemperatur geprüft. Keine Behälterwärmekapazität, Badwechsel oder Wochenendverluste. Pumpenenergie zählt zusätzlich, ohne Gutschrift in der Wärmebilanz.

Automatisierte Tests prüfen beide handschriftlichen Referenzen, Wasser-/Energiesummen, Schichtmodelle, Grenzfälle und optionale Erweiterungen. Fachliche Abnahme bleibt beim Lehrenden.
