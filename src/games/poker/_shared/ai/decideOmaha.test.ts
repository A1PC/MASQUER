import { describe, it, expect } from 'vitest';
import { decideOmaha, omahaPreflopStrength, omahaPostflopStrength } from './decideOmaha';
import type { Card } from '../types';
import type { DecisionContext } from './decide';

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
function ctx(over: Partial<DecisionContext>): DecisionContext {
  return {
    holeCards: [c(14, 's'), c(14, 'h'), c(13, 's'), c(12, 'h')],
    board: [],
    street: 'preflop',
    potSize: 30,
    toCall: 0,
    minRaise: 20,
    stack: 1000,
    position: 'late',
    numActivePlayers: 2,
    archetype: 'shark',
    rng: seededRng(1),
    ...over,
  };
}

describe('omahaPreflopStrength', () => {
  it('double-suited connected high cards > random unconnected low cards', () => {
    const premium = omahaPreflopStrength([c(14, 's'), c(13, 's'), c(12, 'h'), c(11, 'h')]); // AKQJ double-suited
    const trash = omahaPreflopStrength([c(9, 's'), c(5, 'h'), c(3, 'c'), c(2, 'd')]);
    expect(premium).toBeGreaterThan(trash);
  });
  it('penalises trips in hand vs the same pair without the dead third', () => {
    const tripsInHand = omahaPreflopStrength([c(14, 's'), c(14, 'h'), c(14, 'c'), c(13, 'd')]);
    const justPair = omahaPreflopStrength([c(14, 's'), c(14, 'h'), c(13, 'c'), c(12, 'd')]);
    expect(justPair).toBeGreaterThan(tripsInHand);
  });
  it('rewards double-suited over rainbow with same ranks', () => {
    const ds = omahaPreflopStrength([c(14, 's'), c(13, 's'), c(12, 'h'), c(11, 'h')]);
    const rainbow = omahaPreflopStrength([c(14, 's'), c(13, 'h'), c(12, 'c'), c(11, 'd')]);
    expect(ds).toBeGreaterThan(rainbow);
  });
});

describe('omahaPostflopStrength uses the 2+3 rule', () => {
  it('quads-in-hand is weak (can only use 2 hole cards)', () => {
    // four aces in hand: on a blank board you can only make a pair of aces
    const quadsInHand = omahaPostflopStrength(
      [c(14, 's'), c(14, 'h'), c(14, 'c'), c(14, 'd')],
      [c(2, 's'), c(7, 'h'), c(9, 'c')],
    );
    // a real two-pair using exactly 2 hole + 3 board should beat it
    const legit = omahaPostflopStrength(
      [c(2, 'h'), c(7, 's'), c(13, 'c'), c(12, 'd')],
      [c(2, 's'), c(7, 'h'), c(9, 'c')],
    );
    expect(legit).toBeGreaterThan(quadsInHand);
  });
});

describe('decideOmaha', () => {
  it('never checks facing a bet', () => {
    const d = decideOmaha(
      ctx({ toCall: 100, holeCards: [c(9, 's'), c(5, 'h'), c(3, 'c'), c(2, 'd')] }),
    );
    expect(d.action).not.toBe('check');
  });
  it('raise never exceeds stack', () => {
    for (let s = 0; s < 20; s += 1) {
      const d = decideOmaha(
        ctx({ stack: 80, potSize: 500, archetype: 'maniac', rng: seededRng(s) }),
      );
      if (d.action === 'raise') expect(d.amount).toBeLessThanOrEqual(80);
    }
  });
  it('deterministic per seed', () => {
    expect(decideOmaha(ctx({ rng: seededRng(42) }))).toEqual(
      decideOmaha(ctx({ rng: seededRng(42) })),
    );
  });
  it('maniac raises more than rock with a marginal hand', () => {
    let m = 0;
    let r = 0;
    for (let s = 0; s < 50; s += 1) {
      const base = {
        holeCards: [c(11, 's'), c(10, 's'), c(9, 'h'), c(8, 'h')] as Card[],
        toCall: 0,
      };
      if (decideOmaha(ctx({ ...base, archetype: 'maniac', rng: seededRng(s) })).action === 'raise')
        m += 1;
      if (decideOmaha(ctx({ ...base, archetype: 'rock', rng: seededRng(s) })).action === 'raise')
        r += 1;
    }
    expect(m).toBeGreaterThan(r);
  });
  it('uses postflop strength when street is not preflop', () => {
    const d = decideOmaha(
      ctx({
        street: 'flop',
        board: [c(14, 'c'), c(13, 'd'), c(2, 'h')],
        holeCards: [c(14, 's'), c(14, 'h'), c(5, 'c'), c(6, 'd')], // set of aces using 2 hole
        toCall: 0,
        archetype: 'rock',
      }),
    );
    expect(['check', 'raise']).toContain(d.action); // strong hand → not a fold when checking is free
  });
});
