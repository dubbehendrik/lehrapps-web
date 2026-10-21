import { describe, expect, it } from "vitest";
import {
  electrochemistryCategory,
  numbers,
  quantities,
} from "../src/apps/dimensionsanalyse/data";
import {
  filterNumbers,
  numberCategories,
  recognizeNumbers,
} from "../src/apps/dimensionsanalyse/catalog";
import {
  analyze,
  balance,
  fraction,
} from "../src/apps/dimensionsanalyse/logic";

const select = (ids: string[]) =>
  ids.map((id) => quantities.find((q) => q.id === id)!);
const names = (ids: string[]) =>
  recognizeNumbers(select(ids)).map((number) => number.name);

describe("Elektrochemische Kennzahlenbibliothek", () => {
  it("enthält acht neue Einträge und verknüpft fünf vorhandene ohne Duplikate", () => {
    const added = numbers.filter(
      (number) => number.category === electrochemistryCategory,
    );
    expect(added).toHaveLength(8);
    expect(added.filter((number) => number.kind === "Kennzahl")).toHaveLength(
      1,
    );
    expect(
      added.filter((number) => number.kind === "Normierte Größe"),
    ).toHaveLength(6);
    expect(
      added.filter((number) => number.kind === "Transportparameter"),
    ).toHaveLength(1);
    const shown = filterNumbers("", electrochemistryCategory);
    expect(shown).toHaveLength(13);
    expect(new Set(shown.map((number) => number.name)).size).toBe(shown.length);
    expect(
      numberCategories(numbers.find((number) => number.symbol === "Bi")!),
    ).toContain(electrochemistryCategory);
  });

  it("prüft auch alternative Formeln exakt auf Dimensionslosigkeit", () => {
    for (const number of numbers)
      for (const variant of number.alternatives ?? []) {
        const ids = Object.keys(variant.powers);
        expect(
          balance(
            select(ids).map((q) => q.dimensions),
            ids.map((id) => fraction(variant.powers[id] * 2, 2)),
          ).every((value) => value.n === 0n),
          number.name,
        ).toBe(true);
      }
  });

  it("erkennt Wagner und die beiden EIS-Zeitskalen anhand der Größenarten", () => {
    expect(names(["conduct", "rpArea", "L"])).toContain("Wagner-Zahl");
    expect(names(["angularFrequency", "L", "D"])).toContain(
      "Dimensionslose EIS-Diffusionsfrequenz",
    );
    expect(names(["angularFrequency", "rct", "cdl"])).toContain(
      "Dimensionslose EIS-RC-Frequenz",
    );
    const sameDimensions = select(["conduct", "rpArea", "L"]).map((q) => ({
      ...q,
      id: `own-${q.id}`,
    }));
    expect(recognizeNumbers(sameDimensions)).toHaveLength(0);
  });

  it("macht die Annahme einer einzelnen Elektronenübertragung sichtbar", () => {
    const ids = ["faraday", "etaEl", "gasConstant", "temperature"];
    const simplified = recognizeNumbers(select(ids)).find(
      (number) => number.symbol === "Π_η",
    )!;
    expect(simplified.note).toContain("n_e = 1");
    expect(simplified.powers.electronNumber).toBeUndefined();
    const general = recognizeNumbers(select([...ids, "electronNumber"])).find(
      (number) => number.symbol === "Π_η",
    )!;
    expect(general.powers.electronNumber).toBe(1);
    expect(analyze(select(ids).map((q) => q.dimensions)).basis).toHaveLength(1);
    expect(
      analyze(select([...ids, "electronNumber"]).map((q) => q.dimensions))
        .basis,
    ).toHaveLength(2);
  });

  it("setzt externen Zellstrom nicht automatisch mit dem gesamten Ionenstrom gleich", () => {
    expect(names(["cationCurrent", "ionicCurrent"])).toContain(
      "Kationen-Überführungszahl",
    );
    expect(names(["cationCurrent", "current"])).not.toContain(
      "Kationen-Überführungszahl",
    );
  });

  it("erkennt das inverse Diffusions-Zeitverhältnis als abhängige Darstellung", () => {
    const ids = ["L", "D", "t"];
    expect(names(ids)).toContain("Diffusions-/Ladezeitverhältnis");
    expect(names(ids)).toContain("Diffusions-Fourier-Zahl");
    expect(analyze(select(ids).map((q) => q.dimensions)).basis).toHaveLength(1);
  });

  it("durchsucht Bedeutung, Beispiele und sekundäre Fachgebiete", () => {
    expect(
      filterNumbers("Trägheit", "Alle").some(
        (number) => number.symbol === "Re",
      ),
    ).toBe(true);
    expect(
      filterNumbers("  DOPPELSCHICHT  ", electrochemistryCategory).some(
        (number) => number.symbol === "Ω_RC",
      ),
    ).toBe(true);
    expect(filterNumbers("Wagner", "Strömungsmechanik")).toHaveLength(0);
    expect(filterNumbers("", "Alle")).toHaveLength(58);
  });

  it("erhält die äquivalenten Re- und Pr-Darstellungen", () => {
    expect(names(["v", "L", "nu"])).toContain("Reynolds-Zahl");
    expect(names(["eta", "cp", "lambda"])).toContain("Prandtl-Zahl");
  });
});
