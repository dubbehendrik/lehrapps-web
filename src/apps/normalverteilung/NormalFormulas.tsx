// Static MathML gives fractions and integral limits native mathematical layout.
// Only authored markup is rendered here; no user input is inserted.
const formulas = [
  `<mi>φ</mi><mo>(</mo><mi>z</mi><mo>)</mo><mo>=</mo><mfrac><mn>1</mn><msqrt><mrow><mn>2</mn><mi>π</mi></mrow></msqrt></mfrac><mo>·</mo><msup><mi>e</mi><mrow><mo>−</mo><mfrac><msup><mi>z</mi><mn>2</mn></msup><mn>2</mn></mfrac></mrow></msup>`,
  `<mi>Φ</mi><mo>(</mo><mi>z</mi><mo>)</mo><mo>=</mo><munderover><mo>∫</mo><mrow><mo>−</mo><mi>∞</mi></mrow><mi>z</mi></munderover><mi>φ</mi><mo>(</mo><mi>u</mi><mo>)</mo><mspace width="0.2em"/><mi mathvariant="normal">d</mi><mi>u</mi>`,
  `<mi mathvariant="normal">P</mi><mo>(</mo><mi>a</mi><mo>≤</mo><mi>z</mi><mo>≤</mo><mi>b</mi><mo>)</mo><mo>=</mo><munderover><mo>∫</mo><mi>a</mi><mi>b</mi></munderover><mi>φ</mi><mo>(</mo><mi>u</mi><mo>)</mo><mspace width="0.2em"/><mi mathvariant="normal">d</mi><mi>u</mi><mo>=</mo><mi>Φ</mi><mo>(</mo><mi>b</mi><mo>)</mo><mo>−</mo><mi>Φ</mi><mo>(</mo><mi>a</mi><mo>)</mo>`,
];

export function NormalFormulas() {
  return formulas.map((formula, index) => (
    <div key={index} className="normal-formula" dangerouslySetInnerHTML={{
      __html: `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><mstyle displaystyle="true"><mrow>${formula}</mrow></mstyle></math>`,
    }}/>
  ));
}
