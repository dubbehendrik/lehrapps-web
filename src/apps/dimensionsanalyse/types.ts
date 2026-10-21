import type { Fraction } from "./logic";
export type Quantity = {
  id: string;
  name: string;
  symbol: string;
  unit: string;
  dimensions: Fraction[];
};
export type Selected = Quantity & {
  key: number;
  subscript: string;
  description: string;
};
export type DimensionlessNumber = {
  name: string;
  symbol: string;
  category: string;
  powers: Record<string, number>;
  meaning: string;
  example: string;
  note: string;
  factor?: number;
  kind?: "Kennzahl" | "Normierte Größe" | "Transportparameter";
  additionalCategories?: string[];
  sources?: { title: string; url: string }[];
  alternatives?: { powers: Record<string, number>; note: string }[];
};

export type ProblemGroup = {
  label: string;
  powers: Record<string, number>;
  interpretation: string;
};

export type ProblemTemplate = {
  name: string;
  category: string;
  level: "Leicht" | "Mittel" | "Schwer";
  ids: string[];
  text: string;
  questions?: string[];
  groups?: ProblemGroup[];
  sources?: { title: string; url: string }[];
};
