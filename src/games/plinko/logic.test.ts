import { describe, it, expect } from 'vitest';
import {
  dropBall,
  payoutFor,
  _mulberry32,
  _stringSeed,
  BIN_COUNT,
  MULTIPLIER_CURVES,
} from './logic';

describe('dropBall', () => {
  it('returns 20 L/R choices and a bin in [0, 20]', () => {
    const rng = _mulberry32(42);
    const result = dropBall(rng);
    expect(result.path).toHaveLength(20);
    expect(result.path.every((d) => d === 'L' || d === 'R')).toBe(true);
    expect(result.bin).toBeGreaterThanOrEqual(0);
    expect(result.bin).toBeLessThanOrEqual(20);
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

  it('seed 42 lands in bin 11 (pinned — must never change)', () => {
    const result = dropBall(_mulberry32(42));
    // Pinned value — if this changes, the RNG or dropBall logic was broken.
    expect(result.bin).toBe(11);
  });
});

describe('dropBall distribution', () => {
  it('over 100k seeded runs matches Binomial(20, 0.5) within ±0.5%', () => {
    const rng = _mulberry32(99999);
    const counts = new Array<number>(BIN_COUNT).fill(0);
    for (let i = 0; i < 100000; i += 1) {
      const { bin } = dropBall(rng);
      counts[bin] = (counts[bin] ?? 0) + 1;
    }
    // Expected probabilities for Binomial(20, 0.5):
    const expected = [
      0.00000095, 0.0000191, 0.000181, 0.00109, 0.00462, 0.0148, 0.037, 0.0739, 0.12, 0.16, 0.176,
      0.16, 0.12, 0.0739, 0.037, 0.0148, 0.00462, 0.00109, 0.000181, 0.0000191, 0.00000095,
    ];
    for (let bin = 0; bin < BIN_COUNT; bin += 1) {
      const observed = counts[bin]! / 100000;
      const diff = Math.abs(observed - expected[bin]!);
      // ±0.5% tolerance (some tail bins will be 0 — that's fine, expected is ~10^-6).
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
    for (let i = 0; i <= 10; i += 1) {
      expect(curve[i]).toBe(curve[20 - i]);
    }
  });

  it.each(['safe', 'low', 'medium', 'high'] as const)(
    '%s is monotonically non-increasing from edge to centre',
    (risk) => {
      const curve = MULTIPLIER_CURVES[risk];
      for (let i = 0; i < 10; i += 1) {
        expect(curve[i]).toBeGreaterThanOrEqual(curve[i + 1]!);
      }
    },
  );
});

describe('MULTIPLIER_CURVES RTP', () => {
  // Exact binomial probabilities for n=20, p=0.5
  const PROBS = [
    1 / 1048576,
    20 / 1048576,
    190 / 1048576,
    1140 / 1048576,
    4845 / 1048576,
    15504 / 1048576,
    38760 / 1048576,
    77520 / 1048576,
    125970 / 1048576,
    167960 / 1048576,
    184756 / 1048576,
    167960 / 1048576,
    125970 / 1048576,
    77520 / 1048576,
    38760 / 1048576,
    15504 / 1048576,
    4845 / 1048576,
    1140 / 1048576,
    190 / 1048576,
    20 / 1048576,
    1 / 1048576,
  ];

  it.each(['safe', 'low', 'medium', 'high'] as const)('%s RTP in [0.95, 1.00]', (risk) => {
    const curve = MULTIPLIER_CURVES[risk];
    const rtp = curve.reduce((sum, multi, idx) => sum + multi * PROBS[idx]!, 0);
    expect(rtp).toBeGreaterThanOrEqual(0.95);
    expect(rtp).toBeLessThanOrEqual(1.0);
  });
});

describe('payoutFor', () => {
  it('safe centre at stake 100 = floor(100 * 0.88) = 88', () => {
    expect(payoutFor('safe', 10, 100)).toBe(88);
  });

  it('safe edge at stake 100 = 1600', () => {
    expect(payoutFor('safe', 0, 100)).toBe(1600);
    expect(payoutFor('safe', 20, 100)).toBe(1600);
  });

  it('high edge at stake 5000 = 25,000,000', () => {
    expect(payoutFor('high', 0, 5000)).toBe(25_000_000);
    expect(payoutFor('high', 20, 5000)).toBe(25_000_000);
  });

  it('floor-rounds remainders down (favours player on losses)', () => {
    // safe centre = 0.88x; floor(1 * 0.88) = 0
    expect(payoutFor('safe', 10, 1)).toBe(0);
    // safe centre = 0.88x; floor(3 * 0.88) = floor(2.64) = 2
    expect(payoutFor('safe', 10, 3)).toBe(2);
  });

  it('throws on out-of-range bin', () => {
    expect(() => payoutFor('safe', -1, 100)).toThrow();
    expect(() => payoutFor('safe', 21, 100)).toThrow();
  });

  it.each([
    ['safe', 0, 100, 1600],
    ['safe', 10, 100, 88],
    ['low', 0, 100, 11000],
    ['low', 10, 100, 85],
    ['medium', 0, 100, 42000],
    ['medium', 10, 100, 75],
    ['high', 0, 100, 500000],
    ['high', 10, 100, 40],
  ] as const)('payoutFor(%s, %i, %i) = %i', (risk, bin, stake, expected) => {
    expect(payoutFor(risk, bin, stake)).toBe(expected);
  });
});
