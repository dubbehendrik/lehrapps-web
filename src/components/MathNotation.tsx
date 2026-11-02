import { createElement, type ReactNode } from "react";

// Native MathML provides real fractions and indices without an extra renderer.
export const math = {
  identifier: (value: string) => value.endsWith("̇")
    ? createElement("mover", null, createElement("mi", null, value.slice(0, -1)), createElement("mo", null, "˙"))
    : createElement("mi", null, value),
  number: (value: string) => createElement("mn", null, value),
  operator: (value: string) => createElement("mo", null, value),
  text: (value: string) => createElement("mtext", null, value),
  row: (...children: ReactNode[]) => createElement("mrow", null, ...children),
  fraction: (numerator: ReactNode, denominator: ReactNode) =>
    createElement("mfrac", null, numerator, denominator),
  index: (base: string, index: string) =>
    createElement(
      "msub",
      null,
      math.identifier(base),
      createElement(/^\d+$/.test(index) ? "mn" : "mtext", null, index),
    ),
};

export function MathExpression({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return createElement(
    "math",
    {
      xmlns: "http://www.w3.org/1998/Math/MathML",
      className: "math-expression",
      displaystyle: "true",
      "aria-label": label,
    },
    children,
  );
}

export function IndexedSymbol({
  base,
  index,
}: {
  base: string;
  index: string;
}) {
  return (
    <MathExpression label={`${base} ${index}`}>
      {math.index(base, index)}
    </MathExpression>
  );
}
