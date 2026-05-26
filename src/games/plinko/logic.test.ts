import { describe, it, expect } from 'vitest';
import {
  dropBall,
  payoutFor,
  _mulberry32,
  _stringSeed,
  BIN_COUNT,
  MULTIPLIER_CURVES,
  ROW_COUNT,
} from './logic';

describe('dropBall', () => {
  it('returns ROW_COUNT L/R choices and a bin in [0, ROW_COUNT]', () => {
    const rng = _mulberry32(42);
    const result = dropBall(rng);
    expect(result.path).toHaveLength(ROW_COUNT);
    expect(result.path.every((d) => d === 'L' || d === 'R')).toBe(true);
    expect(result.bin).toBeGreaterThanOrEqual(0);
    expect(result.bin).toBeLessThanOrEqual(ROW_COUNT);
    expect(result.bin).toBe(result.path.filter((d) => d === 'R').length);
  });
});

describe('dropBall determinism', () => {
  it('same seed → same result', () => {
    const a = dropBall(_mulberry32(123));
    const b = dropBall(_mulberry32(123));
    expect(a).toEqual(b);
  });

  it('different seeds → likely different results', () => {
    const a = dropBall(_mulberry32(1));
    const b = dropBall(_mulberry32(2));
    expect(a).not.toEqual(b);
  });
});

describe('dropBall distribution', () => {
  it('over 100k seeded runs matches Binomial(26, 0.5) within ±0.5%', () => {
    const rng = _mulberry32(99999);
    const counts = new Array<number>(BIN_COUNT).fill(0);
    for (let i = 0; i < 100000; i += 1) {
      const { bin } = dropBall(rng);
      counts[bin] = (counts[bin] ?? 0) + 1;
    }
    // Expected probabilities for Binomial(26, 0.5) = C(26,k) / 2^26.
    const TOTAL = 2 ** 26;
    const COEFFS = [
      1, 26, 325, 2600, 14950, 65780, 230230, 657800, 1562275, 3124550, 5311735, 7726160, 9657700,
      10400600, 9657700, 7726160, 5311735, 3124550, 1562275, 657800, 230230, 65780, 14950, 2600,
      325, 26, 1,
    ];
    const expected = COEFFS.map((c) => c / TOTAL);
    for (let bin = 0; bin < BIN_COUNT; bin += 1) {
      const observed = counts[bin]! / 100000;
      const diff = Math.abs(observed - expected[bin]!);
      // ±0.5% tolerance (tail bins will be 0 — expected is ~1e-8 there).
      expect(diff).toBeLessThan(0.005);
    }
  });
});

describe('_stringSeed', () => {
  it('returns a number', () => {
    expect(typeof _stringSeed('hello')).toBe('number');
  });

  it('same string → same seed', () => {
    expect(_stringSeed('test')).toBe(_stringSeed('test'));
  });

  it('different strings → different seeds', () => {
    expect(_stringSeed('a')).not.toBe(_stringSeed('b'));
  });
});

describe('MULTIPLIER_CURVES shape', () => {
  it.each(['safe', 'low', 'medium', 'high'] as const)('%s has BIN_COUNT entries', (risk) => {
    expect(MULTIPLIER_CURVES[risk]).toHaveLength(BIN_COUNT);
  });

  it.each(['safe', 'low', 'medium', 'high'] as const)('%s is symmetric across centre', (risk) => {
    const curve = MULTIPLIER_CURVES[risk];
    for (let i = 0; i <= 13; i += 1) {
      expect(curve[i]).toBe(curve[26 - i]);
    }
  });

  it.each(['safe', 'low', 'medium', 'high'] as const)(
    '%s is monotonically non-increasing from edge to centre',
    (risk) => {
      const curve = MULTIPLIER_CURVES[risk];
      for (let i = 0; i < 13; i += 1) {
        expect(curve[i]).toBeGreaterThanOrEqual(curve[i + 1]!);
      }
    },
  );
});

describe('MULTIPLIER_CURVES RTP', () => {
  // Exact binomial probabilities for n=26, p=0.5 (numerator/2^26).
  const TOTAL = 2 ** 26;
  const COEFFS = [
    1, 26, 325, 2600, 14950, 65780, 230230, 657800, 1562275, 3124550, 5311735, 7726160, 9657700,
    10400600, 9657700, 7726160, 5311735, 3124550, 1562275, 657800, 230230, 65780, 14950, 2600, 325,
    26, 1,
  ];
  const PROBS = COEFFS.map((c) => c / TOTAL);

  it('PROBS sum to 1', () => {
    expect(PROBS.reduce((s, p) => s + p, 0)).toBeCloseTo(1, 10);
  });

  it.each(['safe', 'low', 'medium', 'high'] as const)('%s RTP in [0.95, 0.98]', (risk) => {
    const curve = MULTIPLIER_CURVES[risk];
    const rtp = curve.reduce((sum, multi, idx) => sum + multi * PROBS[idx]!, 0);
    expect(rtp).toBeGreaterThanOrEqual(0.95);
    expect(rtp).toBeLessThanOrEqual(0.98);
  });

  it('edge multipliers land in the spec target bands', () => {
    expect(MULTIPLIER_CURVES.safe[0]).toBeGreaterThanOrEqual(40);
    expect(MULTIPLIER_CURVES.safe[0]).toBeLessThanOrEqual(50);
    expect(MULTIPLIER_CURVES.low[0]).toBeGreaterThanOrEqual(600);
    expect(MULTIPLIER_CURVES.low[0]).toBeLessThanOrEqual(800);
    expect(MULTIPLIER_CURVES.medium[0]).toBeGreaterThanOrEqual(5000);
    expect(MULTIPLIER_CURVES.medium[0]).toBeLessThanOrEqual(8000);
    expect(MULTIPLIER_CURVES.high[0]).toBeGreaterThanOrEqual(50000);
    expect(MULTIPLIER_CURVES.high[0]).toBeLessThanOrEqual(80000);
  });
});

describe('payoutFor', () => {
  it('safe centre at stake 100 = floor(100 * safe[13])', () => {
    const expected = Math.floor(100 * MULTIPLIER_CURVES.safe[13]!);
    expect(payoutFor('safe', 13, 100)).toBe(expected);
  });

  it('safe edge at stake 100 mirrors at both ends', () => {
    expect(payoutFor('safe', 0, 100)).toBe(payoutFor('safe', BIN_COUNT - 1, 100));
  });

  it('high edge at stake 1000 = 60_000_000 (1000 * 60_000)', () => {
    expect(payoutFor('high', 0, 1000)).toBe(60_000_000);
    expect(payoutFor('high', BIN_COUNT - 1, 1000)).toBe(60_000_000);
  });

  it('floor-rounds remainders down (favours player on losses)', () => {
    // safe centre is 0.94 — floor(1 * 0.94) = 0; floor(3 * 0.94) = 2.
    expect(payoutFor('safe', 13, 1)).toBe(0);
    expect(payoutFor('safe', 13, 3)).toBe(2);
  });

  it('throws on out-of-range bin', () => {
    expect(() => payoutFor('safe', -1, 100)).toThrow();
    expect(() => payoutFor('safe', BIN_COUNT, 100)).toThrow();
  });
});
