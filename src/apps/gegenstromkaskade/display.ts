/** Explicit decade labels also display 10^0, rather than Plotly's special label 1. */
export function powerAxis(values: number[]) {
  const positive = values.filter(value => Number.isFinite(value) && value > 0);
  const min = positive.length ? Math.floor(Math.log10(Math.min(...positive))) : 0;
  const max = positive.length ? Math.ceil(Math.log10(Math.max(...positive))) : 1;
  const exponents = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return {
    type: 'log' as const,
    tickmode: 'array' as const,
    tickvals: exponents.map(e => 10 ** e),
    ticktext: exponents.map(e => `10<sup>${e}</sup>`),
  };
}
