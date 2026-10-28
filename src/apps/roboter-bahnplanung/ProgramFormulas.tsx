// Authored static MathML: native integrals, fractions, derivatives and indices.
const dot = (symbol: string) => `<mover accent="true"><mi>${symbol}</mi><mo>˙</mo></mover>`;
const q = `<msub>${dot('V')}<mtext>Festkörper</mtext></msub>`;
const h = `<msub><mi>h</mi><mtext>trocken</mtext></msub>`;
const rate = `<msub>${dot('h')}<mtext>trocken</mtext></msub>`;
const formulas = [
  ['Flächennormierung des stationären Auftragskerns', `<msubsup><mo>∫</mo><mn>0</mn><mi>∞</mi></msubsup><mn>2</mn><mi>π</mi><mi>r</mi><mi>K</mi><mo>(</mo><mi>r</mi><mo>;</mo><mi mathvariant="bold">p</mi><mo>)</mo><mspace width="0.2em"/><mi mathvariant="normal">d</mi><mi>r</mi><mo>=</mo><mn>1</mn>`],
  ['Festkörpervolumenstrom aus Lackvolumenstrom und volumetrischem Festkörperanteil', `${q}<mo>=</mo><mfrac><mn>1000</mn><mn>60</mn></mfrac><mo>·</mo><msub>${dot('V')}<mtext>Lack</mtext></msub><mo>·</mo><msub><mi>φ</mi><mtext>Festkörper</mtext></msub>`],
  ['Stationäre Trockenschichtzunahme in Mikrometern pro Sekunde', `${rate}<mo>(</mo><mi>r</mi><mo>;</mo><mi mathvariant="bold">p</mi><mo>)</mo><mo>=</mo><msup><mn>10</mn><mn>3</mn></msup><mo>·</mo>${q}<mo>·</mo><mi>η</mi><mo>·</mo><mi>K</mi><mo>(</mo><mi>r</mi><mo>;</mo><mi mathvariant="bold">p</mi><mo>)</mo>`],
  ['Schichtdicke als Zeitintegral entlang der TCP-Bahn', `${h}<mo>(</mo><mi>u</mi><mo>,</mo><mi>v</mi><mo>,</mo><mi>t</mi><mo>)</mo><mo>=</mo><msubsup><mo>∫</mo><mn>0</mn><mi>t</mi></msubsup>${rate}<mo>(</mo><msqrt><mrow><msup><mrow><mo>(</mo><mi>u</mi><mo>−</mo><msub><mi>u</mi><mtext>TCP</mtext></msub><mo>(</mo><mi>τ</mi><mo>)</mo><mo>)</mo></mrow><mn>2</mn></msup><mo>+</mo><msup><mrow><mo>(</mo><mi>v</mi><mo>−</mo><msub><mi>v</mi><mtext>TCP</mtext></msub><mo>(</mo><mi>τ</mi><mo>)</mo><mo>)</mo></mrow><mn>2</mn></msup></mrow></msqrt><mo>;</mo><mi mathvariant="bold">p</mi><mo>)</mo><mspace width="0.2em"/><mi mathvariant="normal">d</mi><mi>τ</mi>`],
  ['Vorwärtsprojektion des stationären Spritzbilds auf das Einzelbahnprofil', `<msub><mi>H</mi><mtext>Einzelbahn</mtext></msub><mo>(</mo><mi>y</mi><mo>)</mo><mo>=</mo><mfrac><mn>1</mn><msub><mi>v</mi><mtext>Bahn</mtext></msub></mfrac><msubsup><mo>∫</mo><mrow><mo>−</mo><mi>∞</mi></mrow><mi>∞</mi></msubsup>${rate}<mo>(</mo><msqrt><mrow><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msup><mi>y</mi><mn>2</mn></msup></mrow></msqrt><mo>;</mo><mi mathvariant="bold">p</mi><mo>)</mo><mspace width="0.2em"/><mi mathvariant="normal">d</mi><mi>x</mi>`],
];
export default function ProgramFormulas() {
  return <section className="rb-formulas" aria-label="Mathematisches Modell"><h3>Berechnung der Modellschichtdicke</h3>
    <p>Lackvolumenstrom in ml/min, Festkörperanteil als Volumenbruch, Festkörpervolumenstrom in mm³/s, Flächenkern in mm⁻², Zeit in s. Der Faktor 10³ wandelt die Schichtdicke von mm in µm um.</p>
    {formulas.map(([label,formula])=><div key={label} className="rb-formula"><p>{label}</p><div dangerouslySetInnerHTML={{__html:`<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="${label}"><mstyle displaystyle="true"><mrow>${formula}</mrow></mstyle></math>`}}/></div>)}
    <p>Der Parametervektor enthält die Brush-Einstellungen. Das Zeitintegral läuft nur während eingeschalteter Applikation. Bei einem stationären Versuch ist der TCP konstant. Die Rückrechnung passt einen positiven radialen Kern so an, dass seine Vorwärtsprojektion das Einzelbahnprofil reproduziert.</p>
  </section>;
}
