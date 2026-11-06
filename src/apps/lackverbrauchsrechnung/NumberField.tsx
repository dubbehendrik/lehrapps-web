import { useState, type ReactNode } from "react";
import { formatInput } from "./presentation";

export function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: ReactNode;
  value: number;
  min?: number;
  max?: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft ?? formatInput(value)}
        onChange={(event) => {
          setDraft(event.target.value);
          onChange(
            event.target.value === "" ? NaN : Number(event.target.value),
          );
        }}
        onBlur={() => setDraft(null)}
      />
    </label>
  );
}
