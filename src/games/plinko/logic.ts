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

export const ROW_COUNT = 20;
export const BIN_COUNT = 21;
export const BET_MIN = 10;
export const BET_MAX = 5000;
export const AUTO_BALLS_MIN = 1;
export const AUTO_BALLS_MAX = 100;
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

/** Per-risk multiplier curves over the 21 bins. Symmetric across centre (bin 10).
 *  Tuned so RTP = sum(prob[bin] × multiplier[bin]) lands in [0.95, 1.0] for every
 *  risk level. Values are floats; payouts use `Math.floor(stake * multiplier)`.
 *  Centre bin (10) is always the minimum — 'loss territory' for the most likely outcome.
 *
 *  Curves are monotonically non-increasing from edge (bin 0) to centre (bin 10).
 *  Higher risk = steeper V-shape = higher variance at same expected value.
 *
 *  RTPs: safe ≈ 0.979, low ≈ 0.977, medium ≈ 0.976, high ≈ 0.953. */
export const MULTIPLIER_CURVES: Record<Risk, readonly number[]> = {
  // RTP ≈ 0.979 — gentle V-curve, lowest variance
  safe: [
    16, 9, 4, 2, 1.4, 1.2, 1.1, 1.0, 0.98, 0.95, 0.88, 0.95, 0.98, 1.0, 1.1, 1.2, 1.4, 2, 4, 9, 16,
  ],
  // RTP ≈ 0.977 — moderate V-curve, larger jackpot edges
  low: [
    110, 41, 10, 5, 3, 1.5, 1.0, 1.0, 0.95, 0.9, 0.85, 0.9, 0.95, 1.0, 1.0, 1.5, 3, 5, 10, 41, 110,
  ],
  // RTP ≈ 0.976 — steeper V-curve, casino-grade jackpots
  medium: [
    420, 130, 26, 10, 4, 2, 1.1, 0.95, 0.9, 0.85, 0.75, 0.85, 0.9, 0.95, 1.1, 2, 4, 10, 26, 130,
    420,
  ],
  // RTP ≈ 0.953 — extreme V-curve, 5000× jackpot at edges
  high: [
    5000, 1000, 130, 26, 9, 3, 1.5, 0.7, 0.7, 0.55, 0.4, 0.55, 0.7, 0.7, 1.5, 3, 9, 26, 130, 1000,
    5000,
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
