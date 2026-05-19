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

export type Variant = 'british' | 'american';

export type Tier = 'tier1' | 'tier2' | 'tier3';

export interface VariantConfig {
  cols: number;
  rows: number;
  cellsPerCard: number;
  ballCount: number;
  columnRanges: Array<readonly [number, number]>;
  hasFreeCenter: boolean;
  tier1Label: string;
  tier2Label: string;
  tier3Label: string;
}

export const VARIANTS: Record<Variant, VariantConfig> = {
  british: {
    cols: 9,
    rows: 3,
    cellsPerCard: 15,
    ballCount: 90,
    columnRanges: [
      [1, 9],
      [10, 19],
      [20, 29],
      [30, 39],
      [40, 49],
      [50, 59],
      [60, 69],
      [70, 79],
      [80, 90],
    ],
    hasFreeCenter: false,
    tier1Label: 'LINE!',
    tier2Label: 'DOUBLE LINE!',
    tier3Label: 'BINGO!',
  },
  american: {
    cols: 5,
    rows: 5,
    cellsPerCard: 24,
    ballCount: 75,
    columnRanges: [
      [1, 15],
      [16, 30],
      [31, 45],
      [46, 60],
      [61, 75],
    ],
    hasFreeCenter: true,
    tier1Label: 'LINE!',
    tier2Label: 'FOUR CORNERS!',
    tier3Label: 'BLACKOUT!',
  },
};

export const CALL_SPEEDS = { slow: 3000, normal: 2000, fast: 1000 } as const;
export type BingoSpeed = keyof typeof CALL_SPEEDS;

export const BUY_IN = 50;
export const LINE_BONUS = 10;
export const TWO_LINE_OR_4CORNERS_BONUS = 20;

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  cpuCount: number;
  potMultiplier: number;
  cpuLatencyMs: readonly [number, number];
  forceManual: boolean;
}

export const DIFFICULTY: Record<Difficulty, DifficultyConfig> = {
  easy: { cpuCount: 2, potMultiplier: 2, cpuLatencyMs: [200, 500], forceManual: false },
  medium: { cpuCount: 5, potMultiplier: 4, cpuLatencyMs: [100, 250], forceManual: false },
  hard: { cpuCount: 9, potMultiplier: 8, cpuLatencyMs: [0, 0], forceManual: true },
};

/** Returns the pot size in chips for a given difficulty. */
export function potFor(difficulty: Difficulty): number {
  return BUY_IN * DIFFICULTY[difficulty].potMultiplier;
}

export type BingoCell = {
  /** Number 1-N (within variant ball range), or null for a blank cell or free centre. */
  value: number | null;
  /** True only for the American free centre cell. False/undefined for everything else. */
  free?: boolean;
};

export type BingoCard = {
  id: string;
  /** rows × cols. Numbers in each column are sorted asc top-to-bottom; blanks may interleave. */
  cells: BingoCell[][];
};

/** Returns the inclusive [min, max] number range for a given column index. */
export function columnRange(variant: Variant, col: number): { min: number; max: number } {
  const [min, max] = VARIANTS[variant].columnRanges[col]!;
  return { min, max };
}

/** Generates a bingo card seeded by cardId for the given variant.
 *  British: 3×9 grid, 15 filled cells. American: 5×5 grid, 24 filled + 1 free centre. */
export function generateCard(cardId: string, variant: Variant): BingoCard {
  if (variant === 'british') return generateBritishCard(cardId);
  return generateAmericanCard(cardId);
}

function generateBritishCard(cardId: string): BingoCard {
  const ROWS = 3;
  const COLS = 9;
  const CELLS_PER_ROW = 5;
  const rng = mulberry32(stringSeed('bingo.card.british.' + cardId));

  const rowMasks: boolean[][] = [];
  for (let r = 0; r < ROWS; r += 1) rowMasks.push(pickRandomMask(rng, COLS, CELLS_PER_ROW));

  const colCounts = new Array<number>(COLS).fill(0);
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) if (rowMasks[r]![c]) colCounts[c]! += 1;
  }

  const colNumbers: number[][] = [];
  for (let c = 0; c < COLS; c += 1) {
    const { min, max } = columnRange('british', c);
    const count = colCounts[c]!;
    if (count === 0) {
      colNumbers.push([]);
      continue;
    }
    const pool: number[] = [];
    for (let n = min; n <= max; n += 1) pool.push(n);
    for (let i = 0; i < count; i += 1) {
      const j = i + Math.floor(rng() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    colNumbers.push(pool.slice(0, count).sort((a, b) => a - b));
  }

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

function generateAmericanCard(cardId: string): BingoCard {
  const ROWS = 5;
  const COLS = 5;
  const rng = mulberry32(stringSeed('bingo.card.american.' + cardId));
  const colNumbers: number[][] = [];
  for (let c = 0; c < COLS; c += 1) {
    const { min, max } = columnRange('american', c);
    // Column 2 (N) needs only 4 picks because the centre cell is free.
    const count = c === 2 ? 4 : 5;
    const pool: number[] = [];
    for (let n = min; n <= max; n += 1) pool.push(n);
    for (let i = 0; i < count; i += 1) {
      const j = i + Math.floor(rng() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    colNumbers.push(pool.slice(0, count)); // order: top→bottom in column
  }

  const cells: BingoCell[][] = [];
  for (let r = 0; r < ROWS; r += 1) {
    const row: BingoCell[] = [];
    for (let c = 0; c < COLS; c += 1) {
      if (c === 2 && r === 2) {
        row.push({ value: null, free: true });
      } else {
        // For column 2 (N): rows 0,1 use indices 0,1; rows 3,4 use indices 2,3.
        const idx = c === 2 ? (r < 2 ? r : r - 1) : r;
        row.push({ value: colNumbers[c]![idx]!, free: false });
      }
    }
    cells.push(row);
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

/** Generates the call sequence (distinct numbers 1..ballCount) seeded by gameId + variant. */
export function drawCallSequence(gameId: string, variant: Variant): number[] {
  const ballCount = VARIANTS[variant].ballCount;
  const rng = mulberry32(stringSeed('bingo.game.' + variant + '.' + gameId));
  const pool: number[] = [];
  for (let i = 1; i <= ballCount; i += 1) pool.push(i);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool;
}

/** Returns an empty daub grid for the variant. American pre-marks centre (2,2) as true. */
export function emptyDaubGrid(variant: Variant): boolean[][] {
  const { rows, cols, hasFreeCenter } = VARIANTS[variant];
  const grid: boolean[][] = [];
  for (let r = 0; r < rows; r += 1) {
    const row: boolean[] = [];
    for (let c = 0; c < cols; c += 1) row.push(false);
    grid.push(row);
  }
  if (hasFreeCenter) grid[2]![2] = true;
  return grid;
}

/** Given a card, variant, and ball value, returns the (row, col) of that value or null. */
export function findCellByValue(
  card: BingoCard,
  variant: Variant,
  value: number,
): { row: number; col: number } | null {
  const { rows, cols } = VARIANTS[variant];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (card.cells[r]![c]!.value === value) return { row: r, col: c };
    }
  }
  return null;
}

export interface TierWins {
  tier1: boolean;
  tier2: boolean;
  tier3: boolean;
}

/** Returns boolean per tier indicating whether this card currently satisfies that tier
 *  given the daub state. Does NOT track claim history — caller compares against
 *  claimedTiers. */
export function evaluateCardWins(card: BingoCard, daubed: boolean[][], variant: Variant): TierWins {
  if (variant === 'british') return evaluateBritish(card, daubed);
  return evaluateAmerican(card, daubed);
}

function evaluateBritish(card: BingoCard, daubed: boolean[][]): TierWins {
  let completedRows = 0;
  for (let r = 0; r < 3; r += 1) {
    let all = true;
    for (let c = 0; c < 9; c += 1) {
      const v = card.cells[r]![c]!.value;
      if (v === null) continue;
      if (!daubed[r]![c]) {
        all = false;
        break;
      }
    }
    if (all) completedRows += 1;
  }
  return {
    tier1: completedRows >= 1,
    tier2: completedRows >= 2,
    tier3: completedRows === 3,
  };
}

function evaluateAmerican(_card: BingoCard, daubed: boolean[][]): TierWins {
  // tier1 = any complete row, column, or diagonal of 5 daubed.
  let tier1 = false;

  // rows
  for (let r = 0; r < 5; r += 1) {
    let all = true;
    for (let c = 0; c < 5; c += 1) {
      if (!daubed[r]![c]) {
        all = false;
        break;
      }
    }
    if (all) {
      tier1 = true;
      break;
    }
  }

  // columns
  if (!tier1) {
    for (let c = 0; c < 5; c += 1) {
      let all = true;
      for (let r = 0; r < 5; r += 1) {
        if (!daubed[r]![c]) {
          all = false;
          break;
        }
      }
      if (all) {
        tier1 = true;
        break;
      }
    }
  }

  // top-left to bottom-right diagonal
  if (!tier1) {
    let all = true;
    for (let i = 0; i < 5; i += 1) {
      if (!daubed[i]![i]) {
        all = false;
        break;
      }
    }
    if (all) tier1 = true;
  }

  // top-right to bottom-left diagonal
  if (!tier1) {
    let all = true;
    for (let i = 0; i < 5; i += 1) {
      if (!daubed[i]![4 - i]) {
        all = false;
        break;
      }
    }
    if (all) tier1 = true;
  }

  // tier2 = four corners daubed (centre irrelevant).
  const tier2 = daubed[0]![0]! && daubed[0]![4]! && daubed[4]![0]! && daubed[4]![4]!;

  // tier3 = all 24 non-free cells daubed. Centre is pre-daubed.
  let tier3 = true;
  for (let r = 0; r < 5; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      if (r === 2 && c === 2) continue;
      if (!daubed[r]![c]) {
        tier3 = false;
        break;
      }
    }
    if (!tier3) break;
  }

  return { tier1, tier2, tier3 };
}

/** Given a card's current state and the set of tiers already claimed globally,
 *  returns the new tiers this card satisfies that haven't been claimed yet, in
 *  tier order (tier1 first). */
export function detectNewClaims(
  card: BingoCard,
  daubed: boolean[][],
  variant: Variant,
  claimedTiers: ReadonlySet<Tier>,
): Tier[] {
  const wins = evaluateCardWins(card, daubed, variant);
  const out: Tier[] = [];
  if (wins.tier1 && !claimedTiers.has('tier1')) out.push('tier1');
  if (wins.tier2 && !claimedTiers.has('tier2')) out.push('tier2');
  if (wins.tier3 && !claimedTiers.has('tier3')) out.push('tier3');
  return out;
}

/** Tier 1 = LINE_BONUS, tier 2 = TWO_LINE_OR_4CORNERS_BONUS, tier 3 = pot. */
export function payoutFor(tier: Tier, pot: number): number {
  if (tier === 'tier1') return LINE_BONUS;
  if (tier === 'tier2') return TWO_LINE_OR_4CORNERS_BONUS;
  return pot;
}
