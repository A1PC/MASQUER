import { describe, it, expect } from 'vitest';
import { decide, preflopStrength, postflopStrength, type DecisionContext } from './decide';
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
function card(rank: Card['rank'], suit: Card['suit']): Card {
  return { rank, suit };
}
function ctx(over: Partial<DecisionContext>): DecisionContext {
  return {
    holeCards: [card(14, 'h'), card(14, 'd')],
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

describe('preflopStrength ordering', () => {
  it('AA > AKs > 72o', () => {
    const aa = preflopStrength([card(14, 'h'), card(14, 'd')]);
    const aks = preflopStrength([card(14, 'h'), card(13, 'h')]);
    const o72 = preflopStrength([card(7, 'h'), card(2, 'd')]);
    expect(aa).toBeGreaterThan(aks);
    expect(aks).toBeGreaterThan(o72);
  });

  it('AA strength is 1', () => {
    expect(preflopStrength([card(14, 'h'), card(14, 'd')])).toBe(1);
  });

  it('72o strength is less than 0.25', () => {
    expect(preflopStrength([card(7, 'h'), card(2, 'd')])).toBeLessThan(0.25);
  });

  it('suited connector > offsuit gap', () => {
    const sc = preflopStrength([card(9, 'h'), card(8, 'h')]); // 98s
    const og = preflopStrength([card(9, 'h'), card(6, 'd')]); // 96o
    expect(sc).toBeGreaterThan(og);
  });

  it('pair > suited-connector with same high card', () => {
    const pp = preflopStrength([card(9, 'h'), card(9, 'd')]); // 99
    const sc = preflopStrength([card(9, 'h'), card(8, 'h')]); // 98s
    expect(pp).toBeGreaterThan(sc);
  });

  it('returns value in [0, 1]', () => {
    const hands: Card[][] = [
      [card(2, 'h'), card(2, 'd')],
      [card(14, 'h'), card(14, 's')],
      [card(7, 'c'), card(2, 'h')],
      [card(13, 'h'), card(12, 'h')],
    ];
    for (const h of hands) {
      const s = preflopStrength(h);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });
});

describe('postflopStrength', () => {
  it('returns value in [0.15, 1]', () => {
    // high card board
    const hc = postflopStrength(
      [card(7, 'h'), card(2, 'd')],
      [card(9, 'c'), card(11, 's'), card(14, 'h'), card(3, 'd'), card(6, 'c')],
    );
    expect(hc).toBeGreaterThanOrEqual(0.15);
    expect(hc).toBeLessThanOrEqual(1);
  });

  it('straight flush > pair', () => {
    const sf = postflopStrength(
      [card(9, 'h'), card(10, 'h')],
      [card(11, 'h'), card(12, 'h'), card(13, 'h'), card(3, 'd'), card(5, 'c')],
    );
    const pair = postflopStrength(
      [card(7, 'h'), card(7, 'd')],
      [card(9, 'c'), card(11, 's'), card(14, 'h'), card(3, 'd'), card(6, 'c')],
    );
    expect(sf).toBeGreaterThan(pair);
  });

  it('full house > trips', () => {
    const fh = postflopStrength(
      [card(8, 'h'), card(8, 'd')],
      [card(8, 'c'), card(5, 's'), card(5, 'h'), card(2, 'd'), card(3, 'c')],
    );
    const trips = postflopStrength(
      [card(8, 'h'), card(8, 'd')],
      [card(8, 'c'), card(11, 's'), card(14, 'h'), card(3, 'd'), card(6, 'c')],
    );
    expect(fh).toBeGreaterThan(trips);
  });
});

describe('decide legality', () => {
  it('never checks when facing a bet', () => {
    const d = decide(ctx({ toCall: 100, holeCards: [card(7, 'h'), card(2, 'd')] }));
    expect(d.action).not.toBe('check');
  });

  it('raise amount never exceeds stack', () => {
    for (let s = 0; s < 20; s += 1) {
      const d = decide(ctx({ stack: 80, potSize: 500, archetype: 'maniac', rng: seededRng(s) }));
      if (d.action === 'raise') expect(d.amount).toBeLessThanOrEqual(80);
    }
  });

  it('deterministic for a fixed seed', () => {
    expect(decide(ctx({ rng: seededRng(42) }))).toEqual(decide(ctx({ rng: seededRng(42) })));
  });

  it('never raises more than stack with small stack', () => {
    for (let s = 0; s < 30; s += 1) {
      const d = decide(
        ctx({ stack: 50, potSize: 1000, archetype: 'maniac', rng: seededRng(s), toCall: 0 }),
      );
      if (d.action === 'raise') expect(d.amount).toBeLessThanOrEqual(50);
    }
  });

  it('raise amount is positive when raised', () => {
    for (let s = 0; s < 50; s += 1) {
      const d = decide(ctx({ archetype: 'maniac', rng: seededRng(s) }));
      if (d.action === 'raise') expect(d.amount).toBeGreaterThan(0);
    }
  });

  it('no check when toCall > 0 with strong hand', () => {
    // AA should never check facing a bet
    for (let s = 0; s < 20; s += 1) {
      const d = decide(ctx({ toCall: 50, rng: seededRng(s) }));
      expect(d.action).not.toBe('check');
    }
  });
});

describe('archetype tendencies', () => {
  it('maniac raises more than rock with the same marginal hand', () => {
    let maniacRaises = 0;
    let rockRaises = 0;
    for (let s = 0; s < 50; s += 1) {
      const base: Partial<DecisionContext> = {
        holeCards: [card(11, 'h'), card(10, 'h')],
        toCall: 0,
        rng: seededRng(s),
      };
      if (decide(ctx({ ...base, archetype: 'maniac' })).action === 'raise') maniacRaises += 1;
      if (decide(ctx({ ...base, archetype: 'rock', rng: seededRng(s) })).action === 'raise')
        rockRaises += 1;
    }
    expect(maniacRaises).toBeGreaterThan(rockRaises);
  });

  it('rock folds a weak hand to a bet; station calls more', () => {
    const weak: Partial<DecisionContext> = {
      holeCards: [card(8, 'h'), card(3, 'd')],
      toCall: 60,
      potSize: 100,
    };
    let rockFolds = 0;
    let stationFolds = 0;
    for (let s = 0; s < 40; s += 1) {
      if (decide(ctx({ ...weak, archetype: 'rock', rng: seededRng(s) })).action === 'fold')
        rockFolds += 1;
      if (decide(ctx({ ...weak, archetype: 'station', rng: seededRng(s) })).action === 'fold')
        stationFolds += 1;
    }
    expect(rockFolds).toBeGreaterThan(stationFolds);
  });

  it('shark raises with strong hand', () => {
    let raises = 0;
    for (let s = 0; s < 30; s += 1) {
      const d = decide(ctx({ archetype: 'shark', rng: seededRng(s) }));
      if (d.action === 'raise') raises += 1;
    }
    expect(raises).toBeGreaterThan(10); // shark is aggressive with AA
  });

  it('station rarely raises preflop with marginal hand', () => {
    let raises = 0;
    for (let s = 0; s < 50; s += 1) {
      const d = decide(
        ctx({
          holeCards: [card(8, 'h'), card(7, 'h')],
          archetype: 'station',
          rng: seededRng(s),
          toCall: 0,
        }),
      );
      if (d.action === 'raise') raises += 1;
    }
    expect(raises).toBeLessThan(10); // station is passive
  });

  it('maniac bluffs more than rock in good spots', () => {
    let maniacBluffs = 0;
    let rockBluffs = 0;
    const weakCtx = {
      holeCards: [card(7, 'h'), card(2, 'd')],
      toCall: 20,
      potSize: 50,
      position: 'late' as const,
      numActivePlayers: 2,
    };
    for (let s = 0; s < 200; s += 1) {
      if (decide(ctx({ ...weakCtx, archetype: 'maniac', rng: seededRng(s) })).action === 'raise')
        maniacBluffs += 1;
      if (decide(ctx({ ...weakCtx, archetype: 'rock', rng: seededRng(s) })).action === 'raise')
        rockBluffs += 1;
    }
    expect(maniacBluffs).toBeGreaterThan(rockBluffs);
  });
});

describe('postflop decisions', () => {
  it('calls on the flop with a strong made hand', () => {
    // straight flush on the board
    const d = decide(
      ctx({
        street: 'flop',
        holeCards: [card(9, 'h'), card(10, 'h')],
        board: [card(11, 'h'), card(12, 'h'), card(13, 'h')],
        toCall: 10,
        archetype: 'shark',
        rng: seededRng(99),
      }),
    );
    expect(['call', 'raise']).toContain(d.action);
  });

  it('folds on the river with a weak hand vs large bet', () => {
    let folds = 0;
    for (let s = 0; s < 30; s += 1) {
      const d = decide(
        ctx({
          street: 'river',
          holeCards: [card(7, 'h'), card(2, 'd')],
          board: [card(9, 'c'), card(11, 's'), card(14, 'h'), card(3, 'd'), card(6, 'c')],
          toCall: 400,
          potSize: 100,
          archetype: 'rock',
          rng: seededRng(s),
        }),
      );
      if (d.action === 'fold') folds += 1;
    }
    expect(folds).toBeGreaterThan(20);
  });
});
