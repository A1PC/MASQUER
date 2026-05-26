import { ROW_COUNT as GEOMETRY_ROW_COUNT, BIN_COUNT as GEOMETRY_BIN_COUNT } from './geometry';

/** Inline mulberry32 seeded uint32 → () => [0, 1). Matches src/games/bingo/logic.ts. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic uint32 seed from a string. djb2-ish hash. */
function stringSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** Exported for tests only — game code uses the helpers above directly. */
export function _mulberry32(seed: number): () => number {
  return mulberry32(seed);
}
export function _stringSeed(s: string): number {
  return stringSeed(s);
}

export type Risk = 'safe' | 'low' | 'medium' | 'high';

/** Re-exported from `geometry.ts` so callers can import either module. */
export const ROW_COUNT = GEOMETRY_ROW_COUNT;
export const BIN_COUNT = GEOMETRY_BIN_COUNT;

/** Bet / auto-session limits. Per-ball ceiling raised to 1M chips, auto-cap to
 *  1000 balls per session in Phase 15 #11 (ADR-0047). */
export const BET_MIN = 10;
export const BET_MAX = 1_000_000;
export const MAX_BET = BET_MAX;
export const AUTO_BALLS_MIN = 1;
export const AUTO_BALLS_MAX = 1_000;
export const MAX_AUTO_BALLS = AUTO_BALLS_MAX;
export const AUTO_INTERVAL_MS = { slow: 1000, normal: 500, fast: 250 } as const;
export type AutoIntervalKey = keyof typeof AUTO_INTERVAL_MS;

/** Drops one ball through ROW_COUNT peg rows.
 *  Each row: L if rng() < 0.5, else R. Bin = count of R choices. */
export function dropBall(rng: () => number): { path: ('L' | 'R')[]; bin: number } {
  const path: ('L' | 'R')[] = [];
  let bin = 0;
  for (let r = 0; r < ROW_COUNT; r += 1) {
    if (rng() < 0.5) {
      path.push('L');
    } else {
      path.push('R');
      bin += 1;
    }
  }
  return { path, bin };
}

/** Per-risk multiplier curves over the 27 bins (Phase 15 #11 retune).
 *  Each curve is a 27-element symmetric array, monotonically non-increasing
 *  from edge (bin 0) to centre (bin 13). Payouts use `Math.floor(stake * multiplier)`.
 *
 *  Tuned against `Binomial(26, 0.5)` so RTP = Σ(prob[k] × multiplier[k]) lands
 *  in [0.95, 0.98] for every risk. See ADR-0047 for the retune rationale.
 *
 *  Approx RTPs (verified in `MULTIPLIER_CURVES RTP` test):
 *    safe   ≈ 0.978   (gentle V — lowest variance, edge 45×)
 *    low    ≈ 0.966   (moderate V, edge 700×)
 *    medium ≈ 0.958   (heavy V, edge 6,000×)
 *    high   ≈ 0.954   (steepest V, edge 60,000×) */
export const MULTIPLIER_CURVES: Record<Risk, readonly number[]> = {
  safe: [
    45, 18, 8, 4, 2.4, 1.6, 1.28, 1.13, 1.06, 1.01, 0.99, 0.97, 0.95, 0.94, 0.95, 0.97, 0.99, 1.01,
    1.06, 1.13, 1.28, 1.6, 2.4, 4, 8, 18, 45,
  ],
  low: [
    700, 220, 70, 22, 9, 4.0, 2.2, 1.4, 1.15, 1.03, 0.95, 0.92, 0.9, 0.89, 0.9, 0.92, 0.95, 1.03,
    1.15, 1.4, 2.2, 4.0, 9, 22, 70, 220, 700,
  ],
  medium: [
    6000, 1800, 450, 100, 28, 9, 3.5, 1.8, 1.2, 1.02, 0.92, 0.86, 0.82, 0.8, 0.82, 0.86, 0.92, 1.02,
    1.2, 1.8, 3.5, 9, 28, 100, 450, 1800, 6000,
  ],
  high: [
    60000, 12000, 2500, 500, 95, 18, 4.5, 1.7, 1.0, 0.86, 0.78, 0.74, 0.72, 0.71, 0.72, 0.74, 0.78,
    0.86, 1.0, 1.7, 4.5, 18, 95, 500, 2500, 12000, 60000,
  ],
};

/** Integer payout: floor(stake * MULTIPLIER_CURVES[risk][bin]).
 *  Floor-rounding favours the player on remainder (matches ADR-0036). */
export function payoutFor(risk: Risk, bin: number, stake: number): number {
  const multi = MULTIPLIER_CURVES[risk][bin];
  if (multi === undefined) {
    throw new Error(`plinko: bin ${bin} out of range for risk ${risk}`);
  }
  return Math.floor(stake * multi);
}
