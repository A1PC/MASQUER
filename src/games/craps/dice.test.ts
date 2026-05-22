import { describe, it, expect } from 'vitest';
import { rollDice, rngFromSeed } from './dice';

describe('rollDice', () => {
  it('produces dice in 1-6, total in 2-12, isHard when equal', () => {
    const rng = rngFromSeed('s.1');
    for (let i = 0; i < 1000; i += 1) {
      const r = rollDice(rng);
      expect(r.d1).toBeGreaterThanOrEqual(1);
      expect(r.d1).toBeLessThanOrEqual(6);
      expect(r.d2).toBeGreaterThanOrEqual(1);
      expect(r.d2).toBeLessThanOrEqual(6);
      expect(r.total).toBe(r.d1 + r.d2);
      expect(r.isHard).toBe(r.d1 === r.d2);
    }
  });
  it('deterministic by seed', () => {
    const a = rngFromSeed('x');
    const b = rngFromSeed('x');
    expect(rollDice(a)).toEqual(rollDice(b));
  });
  it('covers all totals 2-12 over many seeded rolls', () => {
    const rng = rngFromSeed('coverage');
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i += 1) seen.add(rollDice(rng).total);
    for (let t = 2; t <= 12; t += 1) expect(seen.has(t)).toBe(true);
  });
});
