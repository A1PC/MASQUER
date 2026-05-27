import { describe, it, expect } from 'vitest';
import { MASK_NAME_POOL, assignMaskName } from './maskNames';

function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

describe('maskNames', () => {
  it('pool contains exactly 12 names', () => {
    expect(MASK_NAME_POOL.length).toBe(12);
  });

  it('every name in the pool is unique', () => {
    expect(new Set(MASK_NAME_POOL).size).toBe(MASK_NAME_POOL.length);
  });

  it('assignMaskName(rng, 6) returns 5 unique names (one per AI seat)', () => {
    const names = assignMaskName(seededRng(42), 6);
    expect(names.length).toBe(5);
    expect(new Set(names).size).toBe(5);
    for (const name of names) {
      expect(MASK_NAME_POOL).toContain(name);
    }
  });

  it('assignMaskName(rng, 14) throws RangeError (would need >12 names)', () => {
    expect(() => assignMaskName(seededRng(1), 14)).toThrow(RangeError);
  });

  it('assignMaskName(rng, 13) returns exactly 12 names (pool max)', () => {
    const names = assignMaskName(seededRng(1), 13);
    expect(names.length).toBe(12);
    expect(new Set(names).size).toBe(12);
  });

  it('is deterministic for a given seed', () => {
    const a = assignMaskName(seededRng(99), 6);
    const b = assignMaskName(seededRng(99), 6);
    expect(a).toEqual(b);
  });

  it('different seeds produce different orderings', () => {
    const a = assignMaskName(seededRng(1), 6);
    const b = assignMaskName(seededRng(2), 6);
    expect(a).not.toEqual(b);
  });

  it('tableSize === 1 returns []', () => {
    expect(assignMaskName(seededRng(7), 1)).toEqual([]);
  });

  it('tableSize === 2 returns exactly one name', () => {
    const names = assignMaskName(seededRng(3), 2);
    expect(names.length).toBe(1);
  });
});
