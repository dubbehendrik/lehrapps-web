import { MathFormula } from '../../components/MathFormula';
export function ProgramDescription() {
  return <details className="program-description"><summary>Programmbeschreibung</summary>
    <p>Mehrere nacheinander durchlaufene Standspülen mit einer einzelnen großen Spüle vergleichen.
      Jeder Tauchschritt t bezeichnet den vollständigen Durchlauf eines weiteren Bauteils beziehungsweise einer Charge durch alle N Becken.
      Die Becken werden bei jedem Durchlauf zunehmend verschmutzt.</p>
    <h2>Stoffbilanz und Spülkriterium</h2>
    <p>Stufe n = 1, …, N; Tauchschritt t = 1, …, T. Der Zustand bei t = 0 beschreibt die Anfangsfüllung.
      Das Verschleppungsvolumen ist bei allen Übergängen gleich.</p>
    <div className="display-formula"><MathFormula label="Konzentration in Stufe n nach Tauchschritt t" markup="<msub><mi>c</mi><mrow><mi>n</mi><mo>,</mo><mi>t</mi></mrow></msub><mo>=</mo><mfrac><mrow><msub><mi>V</mi><mrow><mi mathvariant='normal'>B</mi><mo>,</mo><mi>n</mi></mrow></msub><mo>·</mo><msub><mi>c</mi><mrow><mi>n</mi><mo>,</mo><mi>t</mi><mo>−</mo><mn>1</mn></mrow></msub><mo>+</mo><msub><mi>V</mi><mi mathvariant='normal'>A</mi></msub><mo>·</mo><msub><mi>c</mi><mrow><mi>n</mi><mo>−</mo><mn>1</mn><mo>,</mo><mi>t</mi></mrow></msub></mrow><mrow><msub><mi>V</mi><mrow><mi mathvariant='normal'>B</mi><mo>,</mo><mi>n</mi></mrow></msub><mo>+</mo><msub><mi>V</mi><mi mathvariant='normal'>A</mi></msub></mrow></mfrac>" /></div>
    <div className="display-formula"><MathFormula label="Eingangskonzentration konstant und Spülkriterium nach der letzten Stufe" markup="<msub><mi>c</mi><mrow><mn>0</mn><mo>,</mo><mi>t</mi></mrow></msub><mo>=</mo><msub><mi>c</mi><mn>0</mn></msub><mspace width='2em'/><msub><mi>R</mi><mi>t</mi></msub><mo>=</mo><mfrac><msub><mi>c</mi><mn>0</mn></msub><msub><mi>c</mi><mrow><mi>N</mi><mo>,</mo><mi>t</mi></mrow></msub></mfrac>" /></div>
    <p>Volumina in L, Konzentrationen in g/L, Spülkriterium dimensionslos. Die Grenzschmutzkonzentration gilt für die letzte Stufe.
      Gleichheit ist zulässig; ausgewertet wird die erste strikte Überschreitung innerhalb von 1 bis T.
      Bei t = 0 wurde noch kein Tauchschritt durchgeführt. Bei positiver Eingangskonzentration und sauberem Endbad ist R unendlich; bei 0/0 nicht definiert.</p>
    <h2>Szenarien und Eingriffe</h2>
    <p>Das Dropdown wählt das bearbeitete Szenario; die Checkboxen wählen unabhängig davon die Vergleichskurven.
      In der Konzentrationstabelle öffnet eine Zelle die Eingabe samt optionalem Kommentar.
      Dunkelorange und „Manuell“ kennzeichnen gesetzte Werte; Hellorange und „Folge“ kennzeichnen tatsächlich geänderte Folgezellen gegenüber der Rechnung ohne Eingriffe.</p>
    <p>Ein Eingriff setzt die Konzentration nach der Durchmischung fest. Die nächste Stufe desselben Tauchschritts erhält bereits diesen Wert.
      Weitere Eingriffe sind nur bei mindestens gleicher Stufe n und gleichem Tauchschritt t wie der letzte Eingriff zulässig.
      Rückgängig entfernt den letzten Eingriff; Alle Änderungen zurücksetzen entfernt die ganze Historie. Die Szenarioparameter sind bei bestehender Historie gesperrt.</p>
    <h2>Excel und Referenz</h2>
    <p>Der Export enthält ein Blatt je Szenario mit Parametern, Anfangszuständen, geordneter Eingriffshistorie samt Kommentaren und ungerundeten Ergebniswerten.
      Beim Import können Szenarien ausgewählt werden. Die App berechnet die Ergebnisse aus Parametern und Eingriffen neu;
      Änderungen ausschließlich an den Excel-Ergebniszellen werden nicht übernommen. Verwendet wird das eigene Modellstandformat, Version 1.
      Nach Schließen der Seite bleiben Szenarien nur über einen zuvor exportierten Modellstand erhalten.</p>
    <p>Referenz: bereitgestellte Datei Mehrfachspuele.xlsx, Tabelle1. Ausgangsbeispiel: 3 × 100 L gegenüber 1 × 300 L,
      Verschleppung 10 L, Eingangskonzentration 50 g/L. Standardmäßig werden die im Excel-Diagramm dargestellten 40 Schritte gerechnet; T ist einstellbar.</p>
    <section className="model-assumptions"><h2>Modellannahmen und Grenzen</h2>
      <p>Ideale, sofortige Durchmischung; konstante Eingangskonzentration; gleich große Ein- und Ausschleppung;
        konstantes Beckenvolumen vor und nach jedem Durchlauf. Keine laufende Frischwasserzufuhr, Gegenströmung, Reaktion, Verdunstung oder unvollständige Benetzung.
        Zeitliche Tauchdauer und Mischkinetik werden nicht modelliert. Ein manuell gesetzter Wert beschreibt einen äußeren Eingriff;
        dessen Stoffentnahme oder Stoffzugabe wird nicht bilanziert.</p>
    </section>
  </details>;
}
