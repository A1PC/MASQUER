import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { register } from '@/systems/auth';
import {
  drawForDate,
  lineKey,
  evaluateLine,
  payoutFor,
  generateLuckyDipLine,
  nextDrawAt,
  dateStringFor,
  buyTicket,
} from './lottery';

const SESSION_KEY = 'localGamble.session.userId';

describe('drawForDate', () => {
  it('is deterministic for the same date', () => {
    const a = drawForDate('2026-05-19');
    const b = drawForDate('2026-05-19');
    expect(a).toEqual(b);
  });

  it('returns different numbers for different dates', () => {
    const a = drawForDate('2026-05-19');
    const b = drawForDate('2026-05-20');
    expect(a.mainNumbers).not.toEqual(b.mainNumbers);
  });

  it('main numbers are 5 distinct in [1, 50], sorted ascending', () => {
    const { mainNumbers } = drawForDate('2026-05-19');
    expect(mainNumbers).toHaveLength(5);
    expect(new Set(mainNumbers).size).toBe(5);
    for (const n of mainNumbers) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(50);
    }
    const sorted = [...mainNumbers].sort((a, b) => a - b);
    expect(mainNumbers).toEqual(sorted);
  });

  it('bonus is in [1, 10]', () => {
    const { bonus } = drawForDate('2026-05-19');
    expect(bonus).toBeGreaterThanOrEqual(1);
    expect(bonus).toBeLessThanOrEqual(10);
  });
});

describe('lineKey', () => {
  it('produces the same key for the same numbers regardless of order', () => {
    const a = lineKey({ mainNumbers: [5, 12, 3, 49, 27], bonusNumber: 7 });
    const b = lineKey({ mainNumbers: [49, 27, 5, 3, 12], bonusNumber: 7 });
    expect(a).toBe(b);
  });

  it('differs when bonus differs', () => {
    const a = lineKey({ mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 });
    const b = lineKey({ mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 2 });
    expect(a).not.toBe(b);
  });
});

describe('evaluateLine', () => {
  const draw = { mainNumbers: [3, 12, 25, 41, 49], bonus: 7 };

  it.each([
    { line: { mainNumbers: [3, 12, 25, 41, 49], bonusNumber: 7 }, tier: '5+bonus' },
    { line: { mainNumbers: [3, 12, 25, 41, 49], bonusNumber: 8 }, tier: '5' },
    { line: { mainNumbers: [3, 12, 25, 41, 1], bonusNumber: 7 }, tier: '4+bonus' },
    { line: { mainNumbers: [3, 12, 25, 41, 1], bonusNumber: 8 }, tier: '4' },
    { line: { mainNumbers: [3, 12, 25, 1, 2], bonusNumber: 7 }, tier: '3+bonus' },
    { line: { mainNumbers: [3, 12, 25, 1, 2], bonusNumber: 8 }, tier: '3' },
    { line: { mainNumbers: [3, 12, 1, 2, 4], bonusNumber: 7 }, tier: '2+bonus' },
    { line: { mainNumbers: [3, 12, 1, 2, 4], bonusNumber: 8 }, tier: '2' },
    { line: { mainNumbers: [3, 1, 2, 4, 5], bonusNumber: 7 }, tier: null },
    { line: { mainNumbers: [3, 1, 2, 4, 5], bonusNumber: 8 }, tier: null },
    { line: { mainNumbers: [1, 2, 4, 5, 6], bonusNumber: 7 }, tier: null },
    { line: { mainNumbers: [1, 2, 4, 5, 6], bonusNumber: 8 }, tier: null },
  ])('returns $tier for line $line.mainNumbers / bonus $line.bonusNumber', ({ line, tier }) => {
    expect(evaluateLine(line, draw)).toBe(tier);
  });
});

describe('payoutFor', () => {
  it.each([
    ['5+bonus', 1_000_000],
    ['5', 500_000],
    ['4+bonus', 100_000],
    ['4', 10_000],
    ['3+bonus', 2_000],
    ['3', 100],
    ['2+bonus', 0],
    ['2', 0],
    [null, 0],
  ] as const)('tier %s → %d', (tier, expected) => {
    expect(payoutFor(tier)).toBe(expected);
  });
});

describe('generateLuckyDipLine', () => {
  it('generates a valid 5+1 line', () => {
    const line = generateLuckyDipLine([]);
    expect(line.mainNumbers).toHaveLength(5);
    expect(new Set(line.mainNumbers).size).toBe(5);
    expect(line.bonusNumber).toBeGreaterThanOrEqual(1);
    expect(line.bonusNumber).toBeLessThanOrEqual(10);
  });

  it('avoids generating a line that matches an existing line', () => {
    const existing = [{ mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }];
    for (let i = 0; i < 50; i += 1) {
      const line = generateLuckyDipLine(existing);
      // Compare via lineKey-style canonical form
      const canon = [...line.mainNumbers].sort((a, b) => a - b).join(',') + '|' + line.bonusNumber;
      expect(canon).not.toBe('1,2,3,4,5|1');
    }
  });

  it('avoids many existing lines without exhausting the budget', () => {
    const lines: { mainNumbers: number[]; bonusNumber: number }[] = [];
    for (let i = 0; i < 20; i += 1) {
      const line = generateLuckyDipLine(lines);
      lines.push(line);
    }
    const keys = lines.map(
      (l) => [...l.mainNumbers].sort((a, b) => a - b).join(',') + '|' + l.bonusNumber,
    );
    expect(new Set(keys).size).toBe(20);
  });
});

describe('nextDrawAt', () => {
  it('returns today 20:00 when now is before today 20:00', () => {
    const now = new Date(2026, 4, 19, 12, 0, 0, 0).getTime();
    const next = nextDrawAt(now);
    expect(new Date(next).getDate()).toBe(19);
    expect(new Date(next).getHours()).toBe(20);
  });

  it('returns tomorrow 20:00 when now is at or past today 20:00', () => {
    const now = new Date(2026, 4, 19, 20, 0, 0, 0).getTime();
    const next = nextDrawAt(now);
    expect(new Date(next).getDate()).toBe(20);
    expect(new Date(next).getHours()).toBe(20);
  });

  it('returns tomorrow 20:00 at 20:00:01', () => {
    const now = new Date(2026, 4, 19, 20, 0, 1, 0).getTime();
    const next = nextDrawAt(now);
    expect(new Date(next).getDate()).toBe(20);
  });
});

describe('dateStringFor', () => {
  it('returns YYYY-MM-DD for a given timestamp (local)', () => {
    const ts = new Date(2026, 4, 19, 12, 0, 0).getTime();
    expect(dateStringFor(ts)).toBe('2026-05-19');
  });

  it('pads month and day with leading zeros', () => {
    const ts = new Date(2026, 0, 3, 12, 0, 0).getTime();
    expect(dateStringFor(ts)).toBe('2026-01-03');
  });
});

describe('buyTicket', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('inserts a ticket + lines for a manual-only purchase and debits the wallet', async () => {
    const r = await register({ username: 'a', password: 'password123' });
    if (!r.ok) throw new Error();
    const before = (await db.balances.get(r.user.id))!.chips;
    const result = await buyTicket({
      userId: r.user.id,
      lines: [
        { kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 },
        { kind: 'manual', mainNumbers: [10, 20, 30, 40, 50], bonusNumber: 9 },
      ],
      now: new Date(2026, 4, 19, 12, 0, 0).getTime(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lines = await db.lotteryLines.where('ticketId').equals(result.ticketId).toArray();
    expect(lines).toHaveLength(2);
    const after = (await db.balances.get(r.user.id))!.chips;
    expect(after).toBe(before - 20);
  });

  it('rejects when two manual lines are duplicates', async () => {
    const r = await register({ username: 'b', password: 'password123' });
    if (!r.ok) throw new Error();
    const result = await buyTicket({
      userId: r.user.id,
      lines: [
        { kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 },
        { kind: 'manual', mainNumbers: [5, 4, 3, 2, 1], bonusNumber: 1 },
      ],
    });
    expect(result).toEqual({ ok: false, error: 'duplicate-manual-lines' });
    const bal = (await db.balances.get(r.user.id))!.chips;
    expect(bal).toBe(1000);
  });

  it('rejects when wallet has insufficient chips', async () => {
    const r = await register({ username: 'c', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.balances.update(r.user.id, { chips: 5 });
    const result = await buyTicket({
      userId: r.user.id,
      lines: [{ kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }],
    });
    expect(result).toEqual({ ok: false, error: 'insufficient-chips' });
  });

  it('generates unique lucky-dip lines distinct from manual lines on the same ticket', async () => {
    const r = await register({ username: 'd', password: 'password123' });
    if (!r.ok) throw new Error();
    const result = await buyTicket({
      userId: r.user.id,
      lines: [
        { kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 },
        { kind: 'lucky-dip' },
        { kind: 'lucky-dip' },
        { kind: 'lucky-dip' },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lines = await db.lotteryLines.where('ticketId').equals(result.ticketId).toArray();
    const keys = lines.map(
      (l) => `${[...l.mainNumbers].sort((a, b) => a - b).join(',')}|${l.bonusNumber}`,
    );
    expect(new Set(keys).size).toBe(4);
  });

  it('rejects an invalid line (6 main numbers)', async () => {
    const r = await register({ username: 'e', password: 'password123' });
    if (!r.ok) throw new Error();
    const result = await buyTicket({
      userId: r.user.id,
      lines: [{ kind: 'manual', mainNumbers: [1, 2, 3, 4, 5, 6], bonusNumber: 1 }],
    });
    expect(result).toEqual({ ok: false, error: 'invalid-line' });
  });

  it('marks lucky-dip lines with isLuckyDip=true', async () => {
    const r = await register({ username: 'f', password: 'password123' });
    if (!r.ok) throw new Error();
    const result = await buyTicket({
      userId: r.user.id,
      lines: [
        { kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 },
        { kind: 'lucky-dip' },
      ],
    });
    if (!result.ok) throw new Error();
    const lines = await db.lotteryLines.where('ticketId').equals(result.ticketId).toArray();
    const manual = lines.find((l) => !l.isLuckyDip);
    const dip = lines.find((l) => l.isLuckyDip);
    expect(manual).toBeDefined();
    expect(dip).toBeDefined();
  });
});
