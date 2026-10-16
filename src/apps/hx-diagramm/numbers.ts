/** Display only: calculations and exported numeric cells retain full precision. */
const decimal = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
const scientific = new Intl.NumberFormat("de-DE", {
  notation: "scientific",
  maximumFractionDigits: 2,
  useGrouping: false,
});
const superscripts: Record<string, string> = {
  "-": "⁻",
  "+": "⁺",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};
export function usesScientific(value: number) {
  return Math.abs(value) >= 1e5 || (value !== 0 && Math.abs(value) < 0.005);
}
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (!usesScientific(value))
    return decimal.format(Object.is(value, -0) ? 0 : value);
  const parts = scientific.formatToParts(value);
  const mantissa = parts
    .filter((p) => !p.type.startsWith("exponent"))
    .map((p) => p.value)
    .join("");
  const exponent = parts
    .filter(
      (p) => p.type === "exponentMinusSign" || p.type === "exponentInteger",
    )
    .map((p) => p.value)
    .join("");
  return `${mantissa} · 10${[...exponent].map((c) => superscripts[c] ?? c).join("")}`;
}
/** Editing uses comma decimals, without rounding or thousands separators. */
export function editableNumber(value: number) {
  return Number.isFinite(value) ? String(value).replace(".", ",") : "";
}
/** A period is exclusively a thousands separator; never guess a decimal point. */
export function parseNumber(text: string): number {
  const normalized = text.trim().replace(/−/g, "-");
  if (
    !/^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d*)?(?:[eE][+-]?\d+)?$/.test(
      normalized,
    )
  )
    return NaN;
  const value = Number(normalized.replaceAll(".", "").replace(",", "."));
  return Number.isFinite(value) ? value : NaN;
}
// XLSX stores invariant format codes; Excel applies the German locale to display.
export function excelNumberFormat(value: number) {
  return usesScientific(value) ? "[$-407]0.##E+00" : "[$-407]#,##0.##";
}
