/**
 * Venetian masquerade name pool for poker tables. Hides AI archetype from the
 * player at the visual layer — the archetype still drives `decide()` internally
 * but is never displayed. Per spec §3.3 / §4.6.
 */
export const MASK_NAME_POOL = [
  'Bauta',
  'Colombina',
  'Volto',
  'Moretta',
  'Arlecchino',
  'Pantalone',
  'Pulcinella',
  'Brighella',
  'Pierrot',
  'Dottore',
  'Capitano',
  'Zanni',
] as const;

export type MaskName = (typeof MASK_NAME_POOL)[number];

/**
 * Returns the first `tableSize - 1` mask names from a Fisher-Yates shuffle
 * seeded by the session RNG. Deterministic per session; never repeats within
 * a single table.
 *
 * @param sessionRng — session-scoped seeded RNG (no `Math.random()`).
 * @param tableSize — total seats including the player (seat 0). Returns
 *   `tableSize - 1` names (one per AI seat).
 * @throws RangeError if `tableSize - 1` exceeds the pool size.
 */
export function assignMaskName(sessionRng: () => number, tableSize: number): MaskName[] {
  if (tableSize - 1 > MASK_NAME_POOL.length) {
    throw new RangeError(`tableSize ${tableSize} exceeds pool of ${MASK_NAME_POOL.length}`);
  }
  if (tableSize < 2) return [];
  const shuffled: MaskName[] = [...MASK_NAME_POOL];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(sessionRng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, tableSize - 1);
}
