import { useId, useState } from "react";
import type { ButtonHTMLAttributes } from "react";
export function HelpButton({
  help,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { help: string }) {
  const id = useId(),
    [open, setOpen] = useState(false);
  return (
    <span className="flock-help">
      <button {...props} aria-describedby={id}>
        {children}
      </button>
      <button
        type="button"
        className="flock-help-icon"
        aria-label={`Hilfe: ${typeof children === "string" ? children : "Bedienung"}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        i
      </button>
      <span
        id={id}
        role="tooltip"
        className={open ? "flock-tooltip open" : "flock-tooltip"}
      >
        {help}
      </span>
    </span>
  );
}
