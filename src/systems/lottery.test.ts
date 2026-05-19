import { describe, expect, it } from 'vitest';
import { drawForDate, lineKey, evaluateLine, payoutFor } from './lottery';

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
