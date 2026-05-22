/** Format a chip amount as a locale-independent string with comma thousands
 *  separators ("1,000" — never "1.000"). Forces en-US so the punctuation is
 *  stable across users / browsers. Rounds to an integer (chips are integers). */
const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function formatChips(n: number): string {
  return formatter.format(Math.round(n));
}
