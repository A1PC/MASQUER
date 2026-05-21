import { describe, it, expect } from 'vitest';
import { decideDiscard } from './decideDiscard';
import type { Card } from '../types';

function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function c(rank: Card['rank'], suit: Card['suit']): Card {
  return { rank, suit };
}

describe('decideDiscard', () => {
  it('stands pat on a straight (rock)', () => {
    const hand = [c(9, 'h'), c(8, 'd'), c(7, 'c'), c(6, 's'), c(5, 'h')];
    expect(decideDiscard(hand, 'rock', seededRng(1))).toEqual([]);
  });

  it('stands pat on a flush (rock)', () => {
    const hand = [c(14, 'h'), c(10, 'h'), c(7, 'h'), c(4, 'h'), c(2, 'h')];
    expect(decideDiscard(hand, 'rock', seededRng(1))).toEqual([]);
  });

  it('stands pat on a full house (rock)', () => {
    const hand = [c(9, 'h'), c(9, 'd'), c(9, 'c'), c(5, 's'), c(5, 'h')];
    expect(decideDiscard(hand, 'rock', seededRng(1))).toEqual([]);
  });

  it('stands pat on quads (rock)', () => {
    const hand = [c(9, 'h'), c(9, 'd'), c(9, 'c'), c(9, 's'), c(5, 'h')];
    expect(decideDiscard(hand, 'rock', seededRng(1))).toEqual([]);
  });

  it('stands pat on a straight flush (rock)', () => {
    const hand = [c(9, 'h'), c(8, 'h'), c(7, 'h'), c(6, 'h'), c(5, 'h')];
    expect(decideDiscard(hand, 'rock', seededRng(1))).toEqual([]);
  });

  it('one pair → discards the other 3 (rock)', () => {
    const hand = [c(9, 'h'), c(9, 'd'), c(13, 'c'), c(5, 's'), c(2, 'h')];
    const d = decideDiscard(hand, 'rock', seededRng(1));
    expect(d).toHaveLength(3);
    // keeps indices 0,1 (the pair)
    expect(d).not.toContain(0);
    expect(d).not.toContain(1);
  });

  it('two pair → discards the odd card (rock)', () => {
    const hand = [c(9, 'h'), c(9, 'd'), c(5, 'c'), c(5, 's'), c(2, 'h')];
    expect(decideDiscard(hand, 'rock', seededRng(1))).toEqual([4]);
  });

  it('trips → discards the other 2 (rock)', () => {
    const hand = [c(9, 'h'), c(9, 'd'), c(9, 'c'), c(13, 's'), c(2, 'h')];
    expect(decideDiscard(hand, 'rock', seededRng(1)).sort()).toEqual([3, 4]);
  });

  it('4-to-a-flush → discards the off-suit card (rock)', () => {
    const hand = [c(14, 'h'), c(10, 'h'), c(7, 'h'), c(4, 'h'), c(2, 'c')];
    expect(decideDiscard(hand, 'rock', seededRng(1))).toEqual([4]);
  });

  it('4-to-an-open-straight → discards the 5th (rock)', () => {
    const hand = [c(9, 'h'), c(8, 'd'), c(7, 'c'), c(6, 's'), c(2, 'h')];
    expect(decideDiscard(hand, 'rock', seededRng(1))).toEqual([4]);
  });

  it('nothing → keeps top 2, discards 3 (rock)', () => {
    const hand = [c(14, 'h'), c(11, 'd'), c(7, 'c'), c(4, 's'), c(2, 'h')];
    const d = decideDiscard(hand, 'rock', seededRng(1));
    expect(d).toHaveLength(3);
    expect(d).not.toContain(0); // ace kept
    expect(d).not.toContain(1); // jack kept
  });

  it('never returns more than 3, never duplicates/out-of-range (fuzz across archetypes)', () => {
    const hands: Card[][] = [
      [c(9, 'h'), c(9, 'd'), c(13, 'c'), c(5, 's'), c(2, 'h')],
      [c(14, 'h'), c(11, 'd'), c(7, 'c'), c(4, 's'), c(2, 'h')],
      [c(9, 'h'), c(8, 'd'), c(7, 'c'), c(6, 's'), c(2, 'h')],
    ];
    for (const archetype of ['rock', 'station', 'maniac', 'shark'] as const) {
      for (const hand of hands) {
        for (let s = 0; s < 20; s += 1) {
          const d = decideDiscard(hand, archetype, seededRng(s));
          expect(d.length).toBeLessThanOrEqual(3);
          expect(new Set(d).size).toBe(d.length);
          d.forEach((i) => {
            expect(i).toBeGreaterThanOrEqual(0);
            expect(i).toBeLessThan(5);
          });
        }
      }
    }
  });

  it('deterministic per (hand, archetype, seed)', () => {
    const hand = [c(9, 'h'), c(9, 'd'), c(13, 'c'), c(5, 's'), c(2, 'h')];
    expect(decideDiscard(hand, 'maniac', seededRng(7))).toEqual(
      decideDiscard(hand, 'maniac', seededRng(7)),
    );
  });

  it('maniac sometimes stands pat on a weak hand (bluff)', () => {
    const hand = [c(14, 'h'), c(11, 'd'), c(7, 'c'), c(4, 's'), c(2, 'h')];
    let standPats = 0;
    for (let s = 0; s < 100; s += 1) {
      if (decideDiscard(hand, 'maniac', seededRng(s)).length === 0) standPats += 1;
    }
    expect(standPats).toBeGreaterThan(0); // bluffFactor 0.35 → several stand-pats in 100
  });

  it('station/shark occasionally keep an extra kicker (draw fewer)', () => {
    const hand = [c(9, 'h'), c(9, 'd'), c(13, 'c'), c(5, 's'), c(2, 'h')];
    let shorterDraws = 0;
    for (let s = 0; s < 100; s += 1) {
      const d = decideDiscard(hand, 'shark', seededRng(s));
      if (d.length < 3) shorterDraws += 1;
    }
    expect(shorterDraws).toBeGreaterThan(0); // 15% chance → several in 100
  });

  it('rock always plays textbook one pair (always draws 3)', () => {
    const hand = [c(9, 'h'), c(9, 'd'), c(13, 'c'), c(5, 's'), c(2, 'h')];
    for (let s = 0; s < 20; s += 1) {
      expect(decideDiscard(hand, 'rock', seededRng(s))).toHaveLength(3);
    }
  });

  it('4-to-a-flush has priority over 4-to-open-straight when both present', () => {
    // 9h 8h 7h 6h 2c → 4 hearts + consecutive 6-7-8-9 → flush draw takes priority
    const hand = [c(9, 'h'), c(8, 'h'), c(7, 'h'), c(6, 'h'), c(2, 'c')];
    const d = decideDiscard(hand, 'rock', seededRng(1));
    expect(d).toHaveLength(1);
    expect(d).toContain(4); // discard the 2c
  });

  it('two pair only discards the 1 odd card', () => {
    const hand = [c(14, 'h'), c(14, 'd'), c(13, 'c'), c(13, 's'), c(7, 'h')];
    const d = decideDiscard(hand, 'rock', seededRng(1));
    expect(d).toHaveLength(1);
    expect(d).toContain(4); // discard the 7h (last odd card)
  });
});
