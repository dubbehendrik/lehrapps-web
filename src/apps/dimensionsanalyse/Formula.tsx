import { createElement as h } from "react";
import { MathExpression, math } from "../../components/MathNotation";
import { exact, fraction, type Fraction } from "./logic";
export function symbol(s: string, index = ""): ReturnType<typeof math.row> {
  if (s.startsWith("[") && s.endsWith("]"))
    return math.row(
      math.operator("["),
      symbol(s.slice(1, -1), index),
      math.operator("]"),
    );
  const [base, ...rest] = s.split("_");
  const sub = [...rest, index].filter(Boolean).join(",");
  return sub ? math.index(base, sub) : math.identifier(s);
}
export function Product({
  symbols,
  powers,
  label = "Π",
  factor = 1,
}: {
  symbols: string[];
  powers: Fraction[];
  label?: string;
  factor?: number;
}) {
  const part = (positive: boolean) => {
    const terms = powers.flatMap((p, i) =>
      p.n !== 0n && p.n > 0n === positive
        ? [{ p: fraction(p.n < 0n ? -p.n : p.n, p.d), s: symbols[i] }]
        : [],
    );
    return math.row(
      ...(terms.length
        ? terms.map(({ p, s }, i) =>
            h(
              "mrow",
              { key: i },
              p.n === p.d
                ? symbol(s)
                : h(
                    "msup",
                    null,
                    symbol(s),
                    p.d === 1n
                      ? math.number(exact(p))
                      : math.fraction(
                          math.number(String(p.n)),
                          math.number(String(p.d)),
                        ),
                  ),
            ),
          )
        : [math.number("1")]),
    );
  };
  return (
    <MathExpression label={label}>
      {math.row(
        symbol(label),
        math.operator("="),
        ...(factor !== 1
          ? [math.number(String(factor)), math.operator("·")]
          : []),
        powers.some((p) => p.n < 0n)
          ? math.fraction(part(true), part(false))
          : part(true),
      )}
    </MathExpression>
  );
}

/** Typeset indexed symbols in explanatory prose as well as in formulas. */
export function FormulaText({ text }: { text: string }) {
  return (
    <>
      {text.split(/([\p{L}][\p{L}\p{N}]*_[\p{L}\p{N}]+)/u).map((part, i) =>
        part.includes("_") ? (
          <MathExpression key={i} label={part}>
            {symbol(part)}
          </MathExpression>
        ) : (
          part
        ),
      )}
    </>
  );
}
