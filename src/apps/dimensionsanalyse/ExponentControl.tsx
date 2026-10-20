import { useEffect, useState } from "react";
import { MathExpression } from "../../components/MathNotation";
import { symbol } from "./Formula";
import {
  exact,
  fraction,
  numeric,
  parseFraction,
  type Fraction,
} from "./logic";
export function readExponent(value: string): Fraction {
  const normalized = value.trim().replace(",", ".");
  if (normalized.includes("/")) {
    const result = parseFraction(normalized);
    if (Math.abs(numeric(result)) > 100)
      throw Error("Exponenten zwischen −100 und 100 eingeben.");
    return result;
  }
  if (!/^[+-]?\d+(\.\d{0,4})?$/.test(normalized))
    throw Error("Zahl oder Bruch eingeben (maximal vier Nachkommastellen).");
  const [whole, decimal = ""] = normalized.split(".");
  const sign = whole.startsWith("-") ? -1n : 1n;
  const magnitude = whole.replace(/^[+-]/, "") + decimal;
  const result = fraction(
    sign * BigInt(magnitude),
    10n ** BigInt(decimal.length),
  );
  if (Math.abs(numeric(result)) > 100)
    throw Error("Exponenten zwischen −100 und 100 eingeben.");
  return result;
}
export function ExponentControl({
  name,
  unit,
  value,
  onChange,
}: {
  name: string;
  unit: string;
  value: Fraction;
  onChange: (value: Fraction) => void;
}) {
  const [draft, setDraft] = useState(exact(value));
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) {
      setDraft(exact(value));
      setError("");
    }
  }, [value.n, value.d, focused]);
  return (
    <div className="dim-exponent-control">
      <div>
        <MathExpression label={name}>{symbol(name)}</MathExpression>{" "}
        <span className="dim-unit">[{unit}]</span>
      </div>
      <label>
        Exponent <span className="dim-unit">[−]</span>
        <input
          aria-label={`Exponent für ${name}`}
          inputMode="decimal"
          value={draft}
          aria-invalid={!!error}
          onChange={(e) => {
            setDraft(e.target.value);
            try {
              const next = readExponent(e.target.value);
              onChange(next);
              setError("");
            } catch (err) {
              setError((err as Error).message);
            }
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setDraft(exact(value));
            setError("");
          }}
        />
      </label>
      <input
        aria-label={`Schieberegler für ${name}`}
        type="range"
        min={Math.min(-6, Math.floor(numeric(value)))}
        max={Math.max(6, Math.ceil(numeric(value)))}
        step="0.1"
        value={numeric(value)}
        onChange={(e) => onChange(readExponent(e.target.value))}
      />
      {error && <small role="status">{error}</small>}
    </div>
  );
}
