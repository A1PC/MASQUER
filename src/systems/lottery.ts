import {
  db,
  type LotteryDraw,
  type LotteryMatchTier,
  type LotteryTicket,
  type LotteryLine,
} from '@/db';
import type { Round } from '@/db';
import { randomInt } from '@/systems/rng';
import { placeBet, settleRound } from '@/systems/wallet';

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

const LINE_COST = 10;

export type BuyTicketInput =
  | { kind: 'manual'; mainNumbers: number[]; bonusNumber: number }
  | { kind: 'lucky-dip' };

export type BuyTicketResult =
  | { ok: true; ticketId: string; lines: LotteryLine[] }
  | { ok: false; error: 'duplicate-manual-lines' | 'insufficient-chips' | 'invalid-line' };

/** Buys a ticket containing the given lines for the next scheduled draw.
 *  Generates lucky-dip lines, ensuring within-ticket uniqueness.
 *  Debits the wallet for paid lines (lineCount * LINE_COST). */
export async function buyTicket(input: {
  userId: string;
  lines: BuyTicketInput[];
  now?: number;
}): Promise<BuyTicketResult> {
  const now = input.now ?? Date.now();
  const drawId = dateStringFor(nextDrawAt(now));

  // 1. Validate manual lines: each is a valid 5+1, and no two are duplicates.
  const manualLines: { mainNumbers: number[]; bonusNumber: number }[] = [];
  for (const item of input.lines) {
    if (item.kind === 'manual') {
      if (!isValidLine(item)) return { ok: false, error: 'invalid-line' };
      manualLines.push({ mainNumbers: item.mainNumbers, bonusNumber: item.bonusNumber });
    }
  }
  const manualKeys = new Set<string>();
  for (const line of manualLines) {
    const key = lineKey(line);
    if (manualKeys.has(key)) return { ok: false, error: 'duplicate-manual-lines' };
    manualKeys.add(key);
  }

  // 2. Generate lucky-dip lines, growing the "existing" set with each one.
  const generatedLines: { mainNumbers: number[]; bonusNumber: number }[] = [];
  const allSoFar: { mainNumbers: number[]; bonusNumber: number }[] = [...manualLines];
  for (const item of input.lines) {
    if (item.kind === 'lucky-dip') {
      const fresh = generateLuckyDipLine(allSoFar);
      generatedLines.push(fresh);
      allSoFar.push(fresh);
    }
  }

  // 3. Debit wallet.
  const totalCost = input.lines.length * LINE_COST;
  const bet = await placeBet({
    userId: input.userId,
    game: 'lottery',
    amount: totalCost,
    min: LINE_COST,
    max: Number.MAX_SAFE_INTEGER,
  });
  if (!bet.ok) return { ok: false, error: 'insufficient-chips' };

  // 4. Build line rows in input order (manual + lucky-dip interleaved).
  const ticketId = crypto.randomUUID();
  const lines: LotteryLine[] = [];
  let manualIdx = 0;
  let dipIdx = 0;
  for (const item of input.lines) {
    const source = item.kind === 'manual' ? manualLines[manualIdx++]! : generatedLines[dipIdx++]!;
    lines.push({
      id: crypto.randomUUID(),
      ticketId,
      userId: input.userId,
      drawId,
      mainNumbers: source.mainNumbers,
      bonusNumber: source.bonusNumber,
      isLuckyDip: item.kind === 'lucky-dip',
      isFreeReentry: false,
      settled: false,
      matchTier: null,
      payout: 0,
    });
  }

  const ticket: LotteryTicket = {
    id: ticketId,
    userId: input.userId,
    drawId,
    purchasedAt: now,
    totalCost,
    lineCount: lines.length,
  };

  await db.transaction('rw', db.lotteryTickets, db.lotteryLines, async () => {
    await db.lotteryTickets.put(ticket);
    await db.lotteryLines.bulkPut(lines);
  });

  return { ok: true, ticketId, lines };
}

function isValidLine(line: { mainNumbers: number[]; bonusNumber: number }): boolean {
  if (line.mainNumbers.length !== MAIN_PICK_COUNT) return false;
  const unique = new Set(line.mainNumbers);
  if (unique.size !== MAIN_PICK_COUNT) return false;
  for (const n of line.mainNumbers) {
    if (!Number.isInteger(n) || n < 1 || n > MAIN_POOL_SIZE) return false;
  }
  if (!Number.isInteger(line.bonusNumber)) return false;
  if (line.bonusNumber < 1 || line.bonusNumber > BONUS_POOL_SIZE) return false;
  return true;
}

const REENTRY_VALUE = LINE_COST; // 10 chips — implied refund credit for a paid match-2

export async function settleMissedDraws(options: { now?: number } = {}): Promise<{
  settledDrawIds: string[];
  freshDraws: LotteryDraw[];
}> {
  const now = options.now ?? Date.now();
  const today = dateStringFor(now);
  // The last fully-passed 20:00 boundary determines the upper bound on dates to settle.
  // If now < today's 20:00, upper is yesterday; otherwise upper is today.
  const todayScheduled = scheduledForDate(today);
  const upperDate = now < todayScheduled ? prevDate(today) : today;

  const datesToSettle = await pendingDrawDates(upperDate);
  const settledDrawIds: string[] = [];
  const freshDraws: LotteryDraw[] = [];

  for (const date of datesToSettle) {
    const { mainNumbers, bonus } = drawForDate(date);
    const drawAt = scheduledForDate(date);
    const draw: LotteryDraw = {
      id: date,
      drawAt,
      mainNumbers,
      bonus,
      totalLines: 0,
      totalRevenue: 0,
      totalPayout: 0,
    };

    // Evaluate all unsettled lines for this draw (in-memory filter for robustness).
    const unsettled = (await db.lotteryLines.where('drawId').equals(date).toArray()).filter(
      (l) => !l.settled,
    );

    for (const line of unsettled) {
      const tier = evaluateLine(line, { mainNumbers, bonus });
      const payout = payoutFor(tier);
      line.settled = true;
      line.matchTier = tier;
      line.payout = payout;
      draw.totalLines += 1;
      if (!line.isFreeReentry) draw.totalRevenue += LINE_COST;
      draw.totalPayout += payout;
    }

    // Transactional write: draw + settled lines + free-re-entry tickets/lines + rounds rows.
    await db.transaction(
      'rw',
      [db.lotteryDraws, db.lotteryLines, db.lotteryTickets, db.rounds, db.balances],
      async () => {
        await db.lotteryDraws.put(draw);
        await db.lotteryLines.bulkPut(unsettled);

        for (const line of unsettled) {
          await writeRoundForLine(line, draw);
        }

        // Match-2 → free re-entry for the next draw.
        const nextDateStr = nextDate(date);
        const reentryLines = unsettled.filter(
          (l) => l.matchTier === '2' || l.matchTier === '2+bonus',
        );
        for (const src of reentryLines) {
          const fresh = generateLuckyDipLine([]);
          const ticketId = crypto.randomUUID();
          const newLine: LotteryLine = {
            id: crypto.randomUUID(),
            ticketId,
            userId: src.userId,
            drawId: nextDateStr,
            mainNumbers: fresh.mainNumbers,
            bonusNumber: fresh.bonusNumber,
            isLuckyDip: true,
            isFreeReentry: true,
            settled: false,
            matchTier: null,
            payout: 0,
            sourceLineId: src.id,
          };
          const ticket: LotteryTicket = {
            id: ticketId,
            userId: src.userId,
            drawId: nextDateStr,
            purchasedAt: drawAt,
            totalCost: 0,
            lineCount: 1,
          };
          await db.lotteryTickets.put(ticket);
          await db.lotteryLines.put(newLine);
        }
      },
    );

    settledDrawIds.push(date);
    freshDraws.push(draw);
  }

  return { settledDrawIds, freshDraws };
}

/** Per §7.4: writes a rounds row (or skips) for a settled line. */
async function writeRoundForLine(line: LotteryLine, draw: LotteryDraw): Promise<void> {
  const isPaid = !line.isFreeReentry;
  const tier = line.matchTier;

  // Free re-entry that didn't win cash → no rounds row.
  if (!isPaid && (tier === null || tier === '2' || tier === '2+bonus')) return;

  let betAmount: number;
  let payout: number;
  let outcome: Round['outcome'];
  if (isPaid) {
    betAmount = LINE_COST;
    if (tier === null) {
      payout = 0;
      outcome = 'loss';
    } else if (tier === '2' || tier === '2+bonus') {
      payout = REENTRY_VALUE;
      outcome = 'push';
    } else {
      payout = payoutFor(tier);
      outcome = 'win';
    }
  } else {
    // Free re-entry that DID win cash.
    betAmount = 0;
    payout = payoutFor(tier);
    outcome = 'win';
  }
  const netChange = payout - betAmount;

  await settleRound({
    handle: {
      betId: line.id,
      userId: line.userId,
      game: 'lottery',
      amount: betAmount,
      placedAt: draw.drawAt,
    },
    result: {
      outcome,
      betAmount,
      payout,
      netChange,
      details: {
        drawId: draw.id,
        mainNumbers: line.mainNumbers,
        bonusNumber: line.bonusNumber,
        drawMainNumbers: draw.mainNumbers,
        drawBonus: draw.bonus,
        matchTier: tier,
        isLuckyDip: line.isLuckyDip,
        isFreeReentry: line.isFreeReentry,
      },
    },
  });
}

function scheduledForDate(date: string): number {
  const [y, m, day] = date.split('-').map(Number);
  return new Date(y!, m! - 1, day, DRAW_HOUR, 0, 0, 0).getTime();
}

function prevDate(date: string): string {
  const [y, m, day] = date.split('-').map(Number);
  const d = new Date(y!, m! - 1, day! - 1);
  return dateStringFor(d.getTime());
}

function nextDate(date: string): string {
  const [y, m, day] = date.split('-').map(Number);
  const d = new Date(y!, m! - 1, day! + 1);
  return dateStringFor(d.getTime());
}

/** Returns the chronological list of date strings between earliest-pending and upperDate
 *  (inclusive). Earliest-pending = day after the latest settled draw, or the earliest
 *  unsettled line's drawId, whichever is earlier. Returns [] if nothing is pending. */
async function pendingDrawDates(upperDate: string): Promise<string[]> {
  const lastDraw = (await db.lotteryDraws.orderBy('id').last())?.id;
  const earliestLine = (await db.lotteryLines.orderBy('drawId').first())?.drawId;
  let candidate: string | undefined;
  if (lastDraw && earliestLine) {
    candidate = lastDraw >= earliestLine ? nextDate(lastDraw) : earliestLine;
  } else if (lastDraw) {
    candidate = nextDate(lastDraw);
  } else if (earliestLine) {
    candidate = earliestLine;
  }
  if (!candidate) return [];
  if (candidate > upperDate) return [];
  const out: string[] = [];
  let cur = candidate;
  while (cur <= upperDate) {
    out.push(cur);
    cur = nextDate(cur);
  }
  return out;
}
