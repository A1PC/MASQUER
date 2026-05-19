/** Integer chip amount as a localized string (e.g. 1234 → "1,234"). */
export function formatChips(n: number): string {
  return Math.round(n).toLocaleString();
}

/** Signed chip amount with explicit sign (e.g. +1234, -50). */
export function formatSignedChips(n: number): string {
  if (n > 0) return `+${formatChips(n)}`;
  if (n < 0) return `-${formatChips(-n)}`;
  return '0';
}

/** Percent with 1 decimal (e.g. 98.234 → "98.2%"). Null shows as "—". */
export function formatPercent(p: number | null): string {
  if (p === null) return '—';
  return `${p.toFixed(1)}%`;
}

/** Duration in ms → human-readable ("3h 12m", "12m 4s", "47s"). */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '0s';
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec % 60}s`;
  return `${sec}s`;
}

/** Epoch-ms → "YYYY-MM-DD" (UTC). null shows as "—". */
export function formatDate(ms: number | null): string {
  if (ms === null) return '—';
  return new Date(ms).toISOString().slice(0, 10);
}
