const MAIN_POOL_SIZE = 90;
const ROWS = 3;
const COLS = 9;
const CELLS_PER_ROW = 5; // exactly 5 of 9 columns filled per row → 15 total filled cells

/** Inline mulberry32 seeded uint32 → () => [0, 1). Matches src/systems/lottery.ts. */
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

export type BingoCell = {
  /** Number 1-90, or null for a blank cell. */
  value: number | null;
};

export type BingoCard = {
  id: string;
  /** 3 rows × 9 columns. Numbers in each column are sorted asc top-to-bottom; blanks may interleave. */
  cells: BingoCell[][];
};

/** Returns the inclusive [min, max] number range for a given column index (0-8). */
export function columnRange(col: number): { min: number; max: number } {
  if (col === 0) return { min: 1, max: 9 };
  if (col === 8) return { min: 80, max: 90 };
  return { min: col * 10, max: col * 10 + 9 };
}

/** Generates a 90-ball British bingo card seeded by cardId.
 *  Invariants:
 *  - 3 rows × 9 columns
 *  - Exactly 5 filled cells per row (15 total)
 *  - Each column's numbers fall within columnRange(col)
 *  - Numbers within each column are sorted ascending
 *  - All 15 numbers distinct */
export function generateCard(cardId: string): BingoCard {
  const rng = mulberry32(stringSeed('bingo.card.' + cardId));

  // Step 1: pick which columns each row fills (5 of 9) — independent rejection sample.
  const rowMasks: boolean[][] = [];
  for (let r = 0; r < ROWS; r += 1) {
    rowMasks.push(pickRandomMask(rng, COLS, CELLS_PER_ROW));
  }

  // Step 2: count how many cells each column needs.
  const colCounts = new Array<number>(COLS).fill(0);
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (rowMasks[r]![c]) colCounts[c]! += 1;
    }
  }

  // Step 3: for each column, pick that many numbers from its range, sort ascending.
  const colNumbers: number[][] = [];
  for (let c = 0; c < COLS; c += 1) {
    const { min, max } = columnRange(c);
    const count = colCounts[c]!;
    if (count === 0) {
      colNumbers.push([]);
      continue;
    }
    const pool: number[] = [];
    for (let n = min; n <= max; n += 1) pool.push(n);
    // Fisher-Yates partial shuffle for `count` picks.
    for (let i = 0; i < count; i += 1) {
      const j = i + Math.floor(rng() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    const picked = pool.slice(0, count).sort((a, b) => a - b);
    colNumbers.push(picked);
  }

  // Step 4: assemble the grid. For each column, drop the sorted numbers into the
  // filled rows top-to-bottom (preserves column sort order).
  const cells: BingoCell[][] = [];
  for (let r = 0; r < ROWS; r += 1) cells.push([]);
  const colCursor = new Array<number>(COLS).fill(0);
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (rowMasks[r]![c]) {
        const value = colNumbers[c]![colCursor[c]!]!;
        colCursor[c]! += 1;
        cells[r]!.push({ value });
      } else {
        cells[r]!.push({ value: null });
      }
    }
  }

  return { id: cardId, cells };
}

/** Returns a length-N binary mask with exactly K ones, uniform-ish using Fisher-Yates. */
function pickRandomMask(rng: () => number, n: number, k: number): boolean[] {
  const positions: number[] = [];
  for (let i = 0; i < n; i += 1) positions.push(i);
  for (let i = 0; i < k; i += 1) {
    const j = i + Math.floor(rng() * (n - i));
    [positions[i], positions[j]] = [positions[j]!, positions[i]!];
  }
  const chosen = new Set(positions.slice(0, k));
  const mask: boolean[] = [];
  for (let i = 0; i < n; i += 1) mask.push(chosen.has(i));
  return mask;
}

/** Generates the 90-ball call sequence (90 distinct numbers 1-90) seeded by gameId. */
export function drawCallSequence(gameId: string): number[] {
  const rng = mulberry32(stringSeed('bingo.game.' + gameId));
  const pool: number[] = [];
  for (let i = 1; i <= MAIN_POOL_SIZE; i += 1) pool.push(i);
  // Full Fisher-Yates shuffle.
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool;
}

export type BingoTier = '1-line' | '2-line' | 'full-house' | 'fast-full-house';

const FAST_FH_THRESHOLD = 40; // FH on call <= 40 (1-indexed) → fast bonus

/** Returns the set of NEW tiers achieved on this card given the current daubed state
 *  and the 1-indexed call count. `previouslyAchieved` is the tiers already credited
 *  on prior calls (so the evaluator doesn't re-fire them).
 *
 *  Tier rules:
 *  - 1-line: any one row fully daubed (5 of 5 filled cells daubed)
 *  - 2-line: any two rows fully daubed
 *  - full-house: all three rows fully daubed
 *  - fast-full-house: full-house achieved with callCount <= FAST_FH_THRESHOLD; replaces
 *    the regular full-house tier (mutually exclusive). */
export function evaluateCardWins(input: {
  card: BingoCard;
  /** 3×9 grid of daub state. */
  daubed: boolean[][];
  /** 1-indexed number of balls called so far. */
  callCount: number;
  /** Tiers already credited on prior calls. */
  previouslyAchieved: ReadonlySet<BingoTier>;
}): BingoTier[] {
  const { card, daubed, callCount, previouslyAchieved } = input;
  const completedRows: number[] = [];
  for (let r = 0; r < 3; r += 1) {
    let allDaubed = true;
    for (let c = 0; c < 9; c += 1) {
      const cell = card.cells[r]![c]!;
      if (cell.value === null) continue;
      if (!daubed[r]![c]) {
        allDaubed = false;
        break;
      }
    }
    if (allDaubed) completedRows.push(r);
  }

  const newTiers: BingoTier[] = [];
  const got1Line =
    previouslyAchieved.has('1-line') ||
    previouslyAchieved.has('2-line') ||
    previouslyAchieved.has('full-house') ||
    previouslyAchieved.has('fast-full-house');
  const got2Line =
    previouslyAchieved.has('2-line') ||
    previouslyAchieved.has('full-house') ||
    previouslyAchieved.has('fast-full-house');
  const gotFH = previouslyAchieved.has('full-house') || previouslyAchieved.has('fast-full-house');

  if (!got1Line && completedRows.length >= 1) newTiers.push('1-line');
  if (!got2Line && completedRows.length >= 2) newTiers.push('2-line');
  if (!gotFH && completedRows.length === 3) {
    if (callCount <= FAST_FH_THRESHOLD) newTiers.push('fast-full-house');
    else newTiers.push('full-house');
  }
  return newTiers;
}

export const BINGO_CONFIG = {
  CARD_COST: 50,
  MAX_CARDS_PER_GAME: 4,
  FAST_FH_THRESHOLD,
  CALL_SPEEDS: { slow: 3000, normal: 2000, fast: 1000 } as const,
} as const;

export type BingoSpeed = keyof typeof BINGO_CONFIG.CALL_SPEEDS;

/** Tier → chip payout per card. */
export function payoutFor(tier: BingoTier): number {
  switch (tier) {
    case '1-line':
      return 75;
    case '2-line':
      return 250;
    case 'full-house':
      return 1500;
    case 'fast-full-house':
      return 5000;
  }
}
