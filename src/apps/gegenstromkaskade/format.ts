const superscript = (value: number) => String(value).split('').map(character => ({ '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }[character] ?? character)).join('');
/** Display rounding only: retain two significant figures for small nonzero values. */
export function fmt(value: number): string {
  if (Number.isNaN(value)) return '–';
  if (!Number.isFinite(value)) return value < 0 ? '−∞' : '∞';
  if (value === 0) return '0,0';
  const magnitude = Math.abs(value);
  if (magnitude < 0.001 || magnitude >= 1e6) {
    const [mantissa, exponent] = value.toExponential(1).split('e');
    return `${Number(mantissa).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} · 10${superscript(Number(exponent))}`;
  }
  const digits = magnitude < 0.1 ? 1 - Math.floor(Math.log10(magnitude)) : 1;
  return value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: digits });
}
