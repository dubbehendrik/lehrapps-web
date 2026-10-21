import { describe, it, expect } from "vitest";
import { quantities } from "../src/apps/dimensionsanalyse/data";
import { problems } from "../src/apps/dimensionsanalyse/problems";
import {
  analyze,
  balance,
  fraction,
  reduce,
} from "../src/apps/dimensionsanalyse/logic";

// Reference ranks distinguish dimensional directions from the number of
// displayed SI base units (notably for the electrochemical constants).
const references: [string, number, number][] = [
  ["Batteriepartikel: Diffusion und Ladezeit", 2, 1],
  ["Batterie: Ladungsumsatz und C-Rate", 2, 1],
  ["Elektrode: kinetische und transportbedingte Strombelastung", 1, 2],
  ["Stromverteilung: Wagner-Zahl", 2, 1],
  ["Elektrodenkinetik: dimensionslose Überspannung", 3, 1],
  ["Grenzstrom: ebene Diffusionsschicht", 4, 1],
  ["EIS: Diffusionszeitskala", 2, 1],
  ["EIS: Ladungsübertragung und Doppelschicht", 2, 1],
  ["Beheizter Behälter: Leistung und Wärmeverlust", 3, 1],
  ["Beschichtung: viskose und kapillare Spannungen", 2, 1],
  ["Tropfen: kapillare Schwingungszeit", 3, 1],
  ["Filtration: Druckverlust in einer porösen Schicht", 3, 2],
];

describe("Zusätzliche Aufgaben: fachliche Musterbasen", () => {
  for (const [name, rank, count] of references) {
    it(name, () => {
      const problem = problems.find((p) => p.name === name)!;
      expect(problem).toBeDefined();
      const dimensions = problem.ids.map(
        (id) => quantities.find((q) => q.id === id)!.dimensions,
      );
      const result = analyze(dimensions);
      expect(result.rank).toBe(rank);
      expect(result.basis).toHaveLength(count);
      expect(problem.groups).toHaveLength(count);
      const physicalBasis = problem.groups!.map((group) => {
        expect(
          Object.keys(group.powers).every((id) => problem.ids.includes(id)),
        ).toBe(true);
        const vector = problem.ids.map((id) =>
          fraction((group.powers[id] ?? 0) * 2, 2),
        );
        expect(balance(dimensions, vector).every((x) => x.n === 0n)).toBe(true);
        return vector;
      });
      expect(reduce(physicalBasis).rank).toBe(count);
      expect(reduce([...physicalBasis, ...result.basis]).rank).toBe(count);
      expect(problem.questions!.length).toBeGreaterThan(0);
    });
  }

  it("alle Aufgaben und Größen sind eindeutig und auflösbar", () => {
    expect(new Set(problems.map((p) => p.name)).size).toBe(problems.length);
    expect(new Set(quantities.map((q) => q.id)).size).toBe(quantities.length);
    expect(
      problems.filter((p) => p.category === "Elektrochemie & Batterien"),
    ).toHaveLength(8);
    for (const problem of problems) {
      expect(new Set(problem.ids).size).toBe(problem.ids.length);
      expect(
        problem.ids.every((id) => quantities.some((q) => q.id === id)),
      ).toBe(true);
    }
  });

  it("Ladung ist keine Kapazität in Farad und Polarisationswiderstand ist flächenspezifisch", () => {
    const byId = (id: string) => quantities.find((q) => q.id === id)!;
    expect(byId("charge").dimensions.map((x) => Number(x.n))).toEqual([
      0, 0, 1, 0, 1, 0, 0,
    ]);
    expect(byId("cdl").dimensions.map((x) => Number(x.n))).toEqual([
      -1, -2, 4, 0, 2, 0, 0,
    ]);
    expect(byId("rpArea").dimensions.map((x) => Number(x.n))).toEqual([
      1, 4, -3, 0, -2, 0, 0,
    ]);
    expect(
      analyze([byId("current").dimensions, byId("charge").dimensions]).basis,
    ).toHaveLength(0);
  });
});
