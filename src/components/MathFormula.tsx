import { createElement } from 'react';

/** Authored static MathML only. Never interpolate imported or user-entered text. */
export function MathFormula({ label, markup }: { label: string; markup: string }) {
  return createElement('math', {
    xmlns: 'http://www.w3.org/1998/Math/MathML',
    className: 'math-expression',
    'aria-label': label,
    dangerouslySetInnerHTML: { __html: `<mstyle displaystyle="true"><mrow>${markup}</mrow></mstyle>` },
  });
}
