import { describe, it, expect } from "vitest";
import {
  analyze,
  balance,
  exact,
  fraction,
  parseFraction,
  reduce,
} from "../src/apps/dimensionsanalyse/logic";
import { quantities, numbers } from "../src/apps/dimensionsanalyse/data";
import { problems } from "../src/apps/dimensionsanalyse/problems";
const dims = (ids: string[]) =>
  ids.map((id) =>
    quantities.find((q) => q.id === id)!.dimensions.map((x) => ({ ...x })),
  );
describe("Dimensionsanalyse – Referenzfälle", () => {
  for (const [ids, rank, k] of [
    [["rho", "v", "L", "eta"], 3, 1],
    [["rho", "v", "L", "eta", "sigma"], 3, 2],
    [["rho", "rho"], 1, 1],
    [["rho", "v", "L", "eta", "dp"], 3, 2],
    [["alpha", "L", "lambda"], 2, 1],
  ] as [string[], number, number][]) {
    it(ids.join(", "), () => {
      const ds = dims(ids),
        a = analyze(ds);
      expect(a.rank).toBe(rank);
      expect(a.basis).toHaveLength(k);
      for (const b of a.basis)
        expect(balance(ds, b).every((x) => x.n === 0n)).toBe(true);
      expect(reduce(a.basis).rank).toBe(k);
    });
  }
  it("Reynolds reciprocal is exact", () =>
    expect(analyze(dims(["rho", "v", "L", "eta"])).basis[0].map(exact)).toEqual(
      ["-1", "-1", "-1", "1"],
    ));
  it("alternative repeating variables span the same kernel", () => {
    const ds = dims(["rho", "v", "L", "eta", "sigma"]);
    const a = analyze(ds),
      b = analyze(ds, [3, 2, 0]);
    expect(reduce([...a.basis, ...b.basis]).rank).toBe(2);
  });
  it("dimensionless quantity and empty selection", () => {
    expect(analyze([dims(["L"])[0].map(() => fraction(0))]).basis).toHaveLength(
      1,
    );
    expect(analyze([]).rank).toBe(0);
  });
  it("rational pivots and invalid entries", () => {
    const ds = dims(["L", "L"]);
    ds[1][1] = fraction(1, 2);
    expect(analyze(ds).basis[0].map(exact)).toEqual(["-1/2", "1"]);
    expect(exact(parseFraction("-3/2"))).toBe("-3/2");
    expect(() => parseFraction("1/0")).toThrow();
    expect(() => parseFraction("NaN")).toThrow();
  });
  it("independent coordinate rows preserve the rank, including Biot", () => {
    for (const ids of [
      ["alpha", "L", "lambda"],
      ["rho", "v", "L", "eta", "lambda", "cp", "alpha"],
    ]) {
      const a = analyze(dims(ids));
      expect(a.independentRows).toHaveLength(a.rank);
      expect(
        reduce(a.independentRows.map((i) => a.matrixOriginal[i])).rank,
      ).toBe(a.rank);
    }
  });
});
describe("Fachdaten", () => {
  it("50 unique and exactly dimensionless definitions", () => {
    expect(numbers).toHaveLength(50);
    expect(new Set(numbers.map((n) => n.name)).size).toBe(50);
    for (const n of numbers) {
      const ids = Object.keys(n.powers);
      expect(
        balance(
          dims(ids),
          Object.values(n.powers).map((p) => fraction(p * 2, 2)),
        ).map(exact),
        n.name,
      ).toEqual(["0", "0", "0", "0", "0", "0", "0"]);
    }
  });
  it("all 24 exercise solutions have complete independent kernels", () => {
    expect(problems).toHaveLength(24);
    for (const p of problems) {
      const ds = dims(p.ids),
        a = analyze(ds);
      expect(a.basis.length, p.name).toBeGreaterThan(0);
      expect(reduce(a.basis).rank).toBe(p.ids.length - a.rank);
      for (const b of a.basis)
        expect(
          balance(ds, b).every((x) => x.n === 0n),
          p.name,
        ).toBe(true);
    }
  });
});
