import { useState, type InputHTMLAttributes } from "react";
import { editableNumber, formatNumber, parseNumber } from "./numbers";
type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "step" | "min" | "max"
> & {
  value: number;
  onValueChange: (value: number) => void;
};
/** Preserve incomplete input locally; round only the unfocused display. */
export function NumberInput({ value, onValueChange, ...props }: Props) {
  const [editing, setEditing] = useState<{
    text: string;
    value: number;
  } | null>(null);
  const active = editing !== null && Object.is(editing.value, value);
  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      lang="de"
      value={
        active
          ? editing.text
          : formatNumber(value) === "—"
            ? ""
            : formatNumber(value)
      }
      aria-invalid={!Number.isFinite(value) || undefined}
      onFocus={() => setEditing({ text: editableNumber(value), value })}
      onChange={(e) => {
        const text = e.target.value,
          parsed = parseNumber(text);
        setEditing({ text, value: parsed });
        onValueChange(parsed);
      }}
      onBlur={() => {
        if (Number.isFinite(value)) setEditing(null);
      }}
    />
  );
}
