import { type LotteryDraw, type LotteryMatchTier } from '@/db';
import { randomInt } from '@/systems/rng';

const MAIN_POOL_SIZE = 50;
const MAIN_PICK_COUNT = 5;
const BONUS_POOL_SIZE = 10;

/**
 * Self-contained mulberry32 factory — returns a () => number closure that
 * yields floats in [0, 1). We replicate the algorithm here rather than
 * importing from rng.ts because rng.ts exposes a stateful global seeded mode
 * that is incompatible with this module's need for independent per-date seeds.
 */
function mulberry32(initialSeed: number): () => number {
  let s = initialSeed >>> 0;
  return function (): number {
    s = (s + 0x6d_2b_79_f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Deterministic seed derived from the date string. djb2-ish hash for speed. */
function dateSeed(date: string): number {
  let h = 5381;
  const prefix = 'localGamble.lottery.';
  const input = prefix + date;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0; // | 0 → keep i32
  }
  // Unsigned 32-bit for mulberry32 (it expects a uint32 seed).
  return h >>> 0;
}

/** Deterministic per-date draw: 5 sorted-asc main numbers + 1 bonus number. */
export function drawForDate(date: string): { mainNumbers: number[]; bonus: number } {
  const rng = mulberry32(dateSeed(date));
  // Pick 5 distinct from [1, MAIN_POOL_SIZE]. Fisher-Yates partial draw.
  const pool: number[] = [];
  for (let i = 1; i <= MAIN_POOL_SIZE; i += 1) pool.push(i);
  for (let i = 0; i < MAIN_PICK_COUNT; i += 1) {
    const j = i + Math.floor(rng() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const mainNumbers = pool.slice(0, MAIN_PICK_COUNT).sort((a, b) => a - b);
  const bonus = 1 + Math.floor(rng() * BONUS_POOL_SIZE);
  return { mainNumbers, bonus };
}

/** Canonical string key for a line — used for dedupe within a ticket. */
export function lineKey(line: { mainNumbers: number[]; bonusNumber: number }): string {
  const sorted = [...line.mainNumbers].sort((a, b) => a - b);
  return `${sorted.join(',')}|${line.bonusNumber}`;
}

/** Match a line against a draw. Returns the tier or null for no match. */
export function evaluateLine(
  line: { mainNumbers: number[]; bonusNumber: number },
  draw: { mainNumbers: number[]; bonus: number },
): LotteryMatchTier | null {
  const drawSet = new Set(draw.mainNumbers);
  let mains = 0;
  for (const n of line.mainNumbers) if (drawSet.has(n)) mains += 1;
  const bonus = line.bonusNumber === draw.bonus;
  if (mains === 5 && bonus) return '5+bonus';
  if (mains === 5) return '5';
  if (mains === 4 && bonus) return '4+bonus';
  if (mains === 4) return '4';
  if (mains === 3 && bonus) return '3+bonus';
  if (mains === 3) return '3';
  if (mains === 2 && bonus) return '2+bonus';
  if (mains === 2) return '2';
  return null;
}

/** Tier → chip payout. Match-2 tiers return 0 (the free re-entry is granted elsewhere). */
export function payoutFor(tier: LotteryMatchTier | null): number {
  switch (tier) {
    case '5+bonus':
      return 1_000_000;
    case '5':
      return 500_000;
    case '4+bonus':
      return 100_000;
    case '4':
      return 10_000;
    case '3+bonus':
      return 2_000;
    case '3':
      return 100;
    case '2+bonus':
    case '2':
      return 0; // free re-entry granted by settleMissedDraws
    case null:
      return 0;
  }
}

/** Marker re-export so callers can import LotteryDraw from the same module. */
export type { LotteryDraw };

// (Append after the existing exports)

const DRAW_HOUR = 20; // 20:00 local time
const LUCKY_DIP_RETRY_BUDGET = 500;

/** Generates a fresh 5+1 line that's distinct from `existing`. Throws if the
 *  retry budget is exhausted (practically impossible at sane line counts). */
export function generateLuckyDipLine(
  existing: ReadonlyArray<{ mainNumbers: number[]; bonusNumber: number }>,
): { mainNumbers: number[]; bonusNumber: number } {
  const existingKeys = new Set(existing.map(lineKey));
  for (let attempt = 0; attempt < LUCKY_DIP_RETRY_BUDGET; attempt += 1) {
    const pool: number[] = [];
    for (let i = 1; i <= MAIN_POOL_SIZE; i += 1) pool.push(i);
    for (let i = 0; i < MAIN_PICK_COUNT; i += 1) {
      const j = i + randomInt(0, pool.length - i - 1);
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    const mainNumbers = pool.slice(0, MAIN_PICK_COUNT).sort((a, b) => a - b);
    const bonusNumber = randomInt(1, BONUS_POOL_SIZE);
    const candidate = { mainNumbers, bonusNumber };
    if (!existingKeys.has(lineKey(candidate))) return candidate;
  }
  throw new Error(
    `Lucky-dip generation exhausted ${LUCKY_DIP_RETRY_BUDGET} attempts. ` +
      `Existing lines: ${existing.length}.`,
  );
}

/** Returns epoch ms of the next scheduled draw boundary at DRAW_HOUR local.
 *  If now is before today's DRAW_HOUR, returns today's. Otherwise tomorrow's. */
export function nextDrawAt(now: number): number {
  const d = new Date(now);
  const candidate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), DRAW_HOUR, 0, 0, 0);
  if (candidate.getTime() > now) return candidate.getTime();
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, DRAW_HOUR, 0, 0, 0);
  return next.getTime();
}

/** Returns the date string `YYYY-MM-DD` (user local timezone) for a given timestamp. */
export function dateStringFor(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
