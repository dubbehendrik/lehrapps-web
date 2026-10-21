import { createElement as h } from "react";
import { MathExpression, math } from "../../components/MathNotation";
import { exact, type Fraction } from "./logic";
import { symbol } from "./Formula";
export const matrixSymbol = (name = "A") =>
  h(
    "munder",
    { accentunder: "true" },
    h(
      "munder",
      { accentunder: "true" },
      symbol(name),
      h("mo", { stretchy: "true" }, "_"),
    ),
    h("mo", { stretchy: "true" }, "_"),
  );
export const vectorSymbol = (name = "x") =>
  h(
    "mover",
    { accent: "true" },
    symbol(name),
    h("mo", { stretchy: "true" }, "→"),
  );
export const matrixBody = (values: Fraction[][]) =>
  math.row(
    h("mo", { stretchy: "true" }, "("),
    h(
      "mtable",
      { columnspacing: "0.8em", rowspacing: "0.25em" },
      ...values.map((row, i) =>
        h(
          "mtr",
          { key: i },
          ...row.map((value, j) =>
            h(
              "mtd",
              { key: j },
              value.d === 1n
                ? math.number(exact(value))
                : math.fraction(
                    math.number(String(value.n)),
                    math.number(String(value.d)),
                  ),
            ),
          ),
        ),
      ),
    ),
    h("mo", { stretchy: "true" }, ")"),
  );
export function Matrix({
  matrix,
  columns,
  rows,
}: {
  matrix: Fraction[][];
  columns: string[];
  rows?: string[];
}) {
  return (
    <div className="dim-matrix">
      <div className="dim-matrix-columns">
        Spalten:{" "}
        {columns.map((s, i) => (
          <MathExpression key={i} label={s}>
            {symbol(s)}
          </MathExpression>
        ))}
      </div>
      <MathExpression label="Matrix">
        {math.row(
          ...(rows
            ? [
                h(
                  "mtable",
                  { rowspacing: "0.25em" },
                  ...rows.map((r, i) =>
                    h("mtr", { key: i }, h("mtd", null, symbol(r))),
                  ),
                ),
              ]
            : []),
          matrixBody(matrix),
        )}
      </MathExpression>
    </div>
  );
}
export function MatrixEquation({ values }: { values: Fraction[] }) {
  return (
    <MathExpression
      label={`A mal Vektor x ergibt (${values.map(exact).join("; ")})`}
    >
      {math.row(
        matrixSymbol(),
        math.operator("·"),
        vectorSymbol(),
        math.operator("="),
        matrixBody(values.map((x) => [x])),
      )}
    </MathExpression>
  );
}
export function LinearEquation() {
  return (
    <MathExpression label="Matrix A mal Vektor x gleich Nullvektor">
      {math.row(
        matrixSymbol(),
        math.operator("·"),
        vectorSymbol(),
        math.operator("="),
        vectorSymbol("0"),
      )}
    </MathExpression>
  );
}
