import type { DimensionlessNumber, Quantity } from "./types";
import { numbers } from "./data";

export const numberCategories = (number: DimensionlessNumber) => [
  number.category,
  ...(number.additionalCategories ?? []),
];

export function filterNumbers(search: string, category: string) {
  const query = search.trim().toLocaleLowerCase("de-DE");
  return numbers.filter(
    (number) =>
      (category === "Alle" || numberCategories(number).includes(category)) &&
      [
        number.name,
        number.symbol,
        number.meaning,
        number.example,
        number.note,
        number.kind ?? "",
        ...numberCategories(number),
      ]
        .join(" ")
        .toLocaleLowerCase("de-DE")
        .includes(query),
  );
}

export function recognizeNumbers(
  quantities: Quantity[],
): DimensionlessNumber[] {
  const available = new Set(quantities.map((q) => q.id));
  const complete = (powers: Record<string, number>) =>
    Object.keys(powers).every((id) => available.has(id));
  return numbers.flatMap((number) => {
    if (complete(number.powers)) return [number];
    const alternatives = [...(number.alternatives ?? [])];
    if (number.symbol === "Re")
      alternatives.push({
        powers: { v: 1, L: 1, nu: -1 },
        note: "Äquivalente Darstellung mit kinematischer Viskosität.",
      });
    if (number.symbol === "Pr")
      alternatives.push({
        powers: { eta: 1, cp: 1, lambda: -1 },
        note: "Äquivalente Darstellung mit dynamischer Viskosität und Wärmekapazität.",
      });
    const alternative = alternatives.find((variant) =>
      complete(variant.powers),
    );
    return alternative
      ? [
          {
            ...number,
            powers: alternative.powers,
            note: `${alternative.note} ${number.note}`,
          },
        ]
      : [];
  });
}
