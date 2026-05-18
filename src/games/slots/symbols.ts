import { randomInt } from '@/systems/rng';
import { SLOTS_WEIGHTS, SLOTS_WEIGHT_TOTAL } from './config';
import type { Symbol } from './types';

/** Cumulative-weight table — built once at module load.
 *  For weights {cherry:4, lemon:5, bell:3, bar:2, seven:1}:
 *    [{symbol:'cherry', cum:4}, {symbol:'lemon', cum:9},
 *     {symbol:'bell', cum:12}, {symbol:'bar', cum:14}, {symbol:'seven', cum:15}]
 *
 *  The order matters — the RNG draw is compared against cumulative ranges,
 *  so a draw of 0..3 maps to cherry, 4..8 to lemon, etc.
 */
const CUM_TABLE: ReadonlyArray<{ symbol: Symbol; cum: number }> = (() => {
  const order: Symbol[] = ['cherry', 'lemon', 'bell', 'bar', 'seven'];
  let running = 0;
  return order.map((s) => {
    running += SLOTS_WEIGHTS[s];
    return { symbol: s, cum: running };
  });
})();

/** Pick one symbol via weighted RNG. Draw is in [0, TOTAL).
 *  Wherever `n` lands in CUM_TABLE, the matching symbol wins. */
export function pickSymbol(): Symbol {
  const n = randomInt(0, SLOTS_WEIGHT_TOTAL - 1);
  for (const entry of CUM_TABLE) {
    if (n < entry.cum) return entry.symbol;
  }
  // Defensive — unreachable if weights sum correctly.
  throw new Error(`pickSymbol: RNG returned ${n} but no symbol matched`);
}
