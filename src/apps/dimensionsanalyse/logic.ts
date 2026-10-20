// Exact rational arithmetic: no floating point pivot decisions.
export type Fraction = { n: bigint; d: bigint };
const gcd = (a: bigint, b: bigint): bigint =>
  b ? gcd(b, a % b) : a < 0n ? -a : a;
export function fraction(n: bigint | number, d: bigint | number = 1): Fraction {
  let a = BigInt(n),
    b = BigInt(d);
  if (!b) throw Error("Division durch null");
  if (b < 0n) {
    a = -a;
    b = -b;
  }
  const g = gcd(a, b);
  return { n: a / g, d: b / g };
}
export const add = (a: Fraction, b: Fraction) =>
  fraction(a.n * b.d + b.n * a.d, a.d * b.d);
export const mul = (a: Fraction, b: Fraction) => fraction(a.n * b.n, a.d * b.d);
export const neg = (a: Fraction) => fraction(-a.n, a.d);
export const divide = (a: Fraction, b: Fraction) =>
  fraction(a.n * b.d, a.d * b.n);
export const numeric = (a: Fraction) => Number(a.n) / Number(a.d);
export const exact = (a: Fraction) =>
  a.d === 1n ? String(a.n) : `${a.n}/${a.d}`;
export function parseFraction(s: string): Fraction {
  if (!/^[+-]?\d+(\/\d+)?$/.test(s.trim()))
    throw Error(
      "Exponenten als ganze Zahl oder Bruch eingeben, z. B. -3 oder 1/2.",
    );
  const [n, d = "1"] = s.trim().split("/");
  if (n.length > 6 || d.length > 6)
    throw Error("Exponenten sind auf sechs Ziffern begrenzt.");
  return fraction(BigInt(n), BigInt(d));
}
export function reduce(input: Fraction[][]) {
  const a = input.map((r) => r.map((x) => ({ ...x })));
  const pivots: number[] = [];
  const steps: { label: string; matrix: Fraction[][] }[] = [];
  let row = 0;
  const save = (label: string) =>
    steps.push({ label, matrix: a.map((r) => r.map((x) => ({ ...x }))) });
  for (let col = 0; col < (a[0]?.length ?? 0) && row < a.length; col++) {
    const p = a.findIndex((r, i) => i >= row && r[col].n !== 0n);
    if (p < 0) continue;
    if (p !== row) {
      [a[p], a[row]] = [a[row], a[p]];
      save(`Z${row + 1} ↔ Z${p + 1}`);
    }
    const pivot = a[row][col];
    if (pivot.n !== pivot.d) {
      a[row] = a[row].map((x) => divide(x, pivot));
      save(`Z${row + 1} / (${exact(pivot)})`);
    }
    for (let i = 0; i < a.length; i++)
      if (i !== row && a[i][col].n) {
        const factor = a[i][col];
        a[i] = a[i].map((x, j) => add(x, neg(mul(factor, a[row][j]))));
        save(`Z${i + 1} − (${exact(factor)}) Z${row + 1}`);
      }
    pivots.push(col);
    row++;
  }
  return { matrix: a, pivots, rank: pivots.length, steps };
}
export function analyze(dimensions: Fraction[][], preferred: number[] = []) {
  const n = dimensions.length;
  const order = [
    ...new Set([...preferred, ...Array.from({ length: n }, (_, i) => i)]),
  ];
  const matrix = Array.from({ length: 7 }, (_, j) =>
    dimensions.map((d) => d[j]),
  );
  const r = reduce(matrix.map((row) => order.map((i) => row[i])));
  const free = order.map((_, i) => i).filter((i) => !r.pivots.includes(i));
  const basis = free.map((f) => {
    const x = Array.from({ length: n }, () => fraction(0));
    x[order[f]] = fraction(1);
    r.pivots.forEach((p, i) => (x[order[p]] = neg(r.matrix[i][f])));
    return x;
  });
  const independentRows = reduce(
    matrix[0]?.map((_, i) => matrix.map((row) => row[i])) ?? [],
  ).pivots;
  return {
    ...r,
    matrixOriginal: matrix,
    order,
    basis,
    independentRows,
    repeating: r.pivots.map((i) => order[i]),
  };
}
export function balance(dimensions: Fraction[][], exponents: Fraction[]) {
  return Array.from({ length: 7 }, (_, j) =>
    dimensions.reduce(
      (s, d, i) => add(s, mul(d[j], exponents[i])),
      fraction(0),
    ),
  );
}
