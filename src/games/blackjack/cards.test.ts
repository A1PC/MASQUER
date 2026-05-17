import { afterEach, describe, expect, it } from 'vitest';
import { buildShoe, drawCard, freshShoe, needsReshuffle } from './cards';
import { seed, unseed } from '@/systems/rng';

afterEach(() => unseed());

describe('buildShoe', () => {
  it('returns 52 cards for 1 deck', () => {
    expect(buildShoe(1)).toHaveLength(52);
  });

  it('returns 312 cards for the default 6 decks', () => {
    expect(buildShoe()).toHaveLength(312);
  });

  it('contains 4 suits × 13 ranks × N decks with each combination N times', () => {
    const shoe = buildShoe(6);
    const counts = new Map<string, number>();
    for (const c of shoe) {
      const key = `${c.rank}${c.suit}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(52);
    for (const n of counts.values()) expect(n).toBe(6);
  });
});

describe('freshShoe', () => {
  it('produces a deterministic order under a seed', () => {
    seed(42);
    const a = freshShoe(6);
    unseed();
    seed(42);
    const b = freshShoe(6);
    expect(a.map((c) => `${c.rank}${c.suit}`)).toEqual(b.map((c) => `${c.rank}${c.suit}`));
  });

  it('produces different orders for different seeds', () => {
    seed(1);
    const a = freshShoe(6);
    unseed();
    seed(2);
    const b = freshShoe(6);
    expect(a.map((c) => `${c.rank}${c.suit}`)).not.toEqual(b.map((c) => `${c.rank}${c.suit}`));
  });
});

describe('drawCard', () => {
  it('returns and removes the top card', () => {
    const shoe = buildShoe(1);
    const before = shoe.length;
    const c = drawCard(shoe);
    expect(shoe.length).toBe(before - 1);
    expect(c).toBeDefined();
  });

  it('throws RangeError when shoe is empty', () => {
    expect(() => drawCard([])).toThrow(RangeError);
  });
});

describe('needsReshuffle', () => {
  it('returns false when fewer than cutAt cards dealt', () => {
    const shoe = buildShoe(6);
    for (let i = 0; i < 100; i++) drawCard(shoe);
    expect(needsReshuffle(shoe, 312, 156)).toBe(false);
  });

  it('returns true at exact cutAt boundary', () => {
    const shoe = buildShoe(6);
    for (let i = 0; i < 156; i++) drawCard(shoe);
    expect(needsReshuffle(shoe, 312, 156)).toBe(true);
  });

  it('returns true beyond cutAt', () => {
    const shoe = buildShoe(6);
    for (let i = 0; i < 200; i++) drawCard(shoe);
    expect(needsReshuffle(shoe, 312, 156)).toBe(true);
  });
});
