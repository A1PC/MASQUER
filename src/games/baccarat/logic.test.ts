import { describe, expect, it } from 'vitest';
import {
  bankerDrawsThird,
  cardValue,
  computePayouts,
  handTotal,
  isPair,
  makeHand,
  playerDrawsThird,
  resolveRound,
} from './logic';
import { EMPTY_BETS, type Card, type HandTotal, type Rank, type Suit } from './types';

function card(rank: Rank, suit: Suit = '♠'): Card {
  return { rank, suit, faceUp: true };
}

describe('cardValue', () => {
  it('A=1', () => expect(cardValue(card('A'))).toBe(1));
  it.each(['2', '3', '4', '5', '6', '7', '8', '9'] as Rank[])('%s = face', (r) => {
    expect(cardValue(card(r))).toBe(Number(r));
  });
  it.each(['10', 'J', 'Q', 'K'] as Rank[])('%s = 0', (r) => {
    expect(cardValue(card(r))).toBe(0);
  });
});

describe('handTotal', () => {
  it('empty hand = 0', () => expect(handTotal([])).toBe(0));
  it('single A = 1', () => expect(handTotal([card('A')])).toBe(1));
  it('two cards under 10 (3 + 4) = 7', () => expect(handTotal([card('3'), card('4')])).toBe(7));
  it('7 + 8 = 15 → ones digit 5', () => expect(handTotal([card('7'), card('8')])).toBe(5));
  it('K + Q = 0 (both worth 0)', () => expect(handTotal([card('K'), card('Q')])).toBe(0));
  it('A + 9 = 10 → ones digit 0', () => expect(handTotal([card('A'), card('9')])).toBe(0));
  it('9 + 9 + 9 = 27 → ones digit 7', () =>
    expect(handTotal([card('9'), card('9'), card('9')])).toBe(7));
});

describe('makeHand', () => {
  it('returns cards + total', () => {
    const h = makeHand([card('7'), card('8')]);
    expect(h.cards).toHaveLength(2);
    expect(h.total).toBe(5);
  });
});

describe('isPair', () => {
  it('two same-rank cards = pair', () =>
    expect(isPair([card('7', '♠'), card('7', '♥')])).toBe(true));
  it('two different ranks = not a pair', () => expect(isPair([card('7'), card('8')])).toBe(false));
  it('10 + J = not a pair (rank-based, not value-based)', () =>
    expect(isPair([card('10'), card('J')])).toBe(false));
  it('J + Q = not a pair', () => expect(isPair([card('J'), card('Q')])).toBe(false));
  it('K + K = pair', () => expect(isPair([card('K', '♠'), card('K', '♦')])).toBe(true));
  it('A + A = pair', () => expect(isPair([card('A', '♣'), card('A', '♥')])).toBe(true));
  it('1 card = not a pair', () => expect(isPair([card('7')])).toBe(false));
  it('0 cards = not a pair', () => expect(isPair([])).toBe(false));
  it('ignores the third card if present', () =>
    expect(isPair([card('7'), card('7'), card('K')])).toBe(true));
});

describe('playerDrawsThird', () => {
  it.each([0, 1, 2, 3, 4, 5] as HandTotal[])('total %i → draws', (t) => {
    expect(playerDrawsThird(t)).toBe(true);
  });
  it.each([6, 7] as HandTotal[])('total %i → stands', (t) => {
    expect(playerDrawsThird(t)).toBe(false);
  });
  it.each([8, 9] as HandTotal[])('throws on natural (%i) — caller bug', (t) => {
    expect(() => playerDrawsThird(t)).toThrow(/natural pre-empted/);
  });
});

describe('bankerDrawsThird — Player stood (playerThirdValue=null)', () => {
  it.each([0, 1, 2, 3, 4, 5] as HandTotal[])('banker %i → draws', (t) => {
    expect(bankerDrawsThird(t, null)).toBe(true);
  });
  it.each([6, 7] as HandTotal[])('banker %i → stands', (t) => {
    expect(bankerDrawsThird(t, null)).toBe(false);
  });
});

describe('bankerDrawsThird — Player drew (canonical tableau cells)', () => {
  // For each banker total 0..7, exhaustive over playerThirdValue 0..9.
  const TABLE: Array<{ banker: HandTotal; expected: ReadonlyArray<boolean> }> = [
    // index 0..9 = playerThirdValue
    { banker: 0, expected: [true, true, true, true, true, true, true, true, true, true] },
    { banker: 1, expected: [true, true, true, true, true, true, true, true, true, true] },
    { banker: 2, expected: [true, true, true, true, true, true, true, true, true, true] },
    { banker: 3, expected: [true, true, true, true, true, true, true, true, false, true] },
    { banker: 4, expected: [false, false, true, true, true, true, true, true, false, false] },
    { banker: 5, expected: [false, false, false, false, true, true, true, true, false, false] },
    { banker: 6, expected: [false, false, false, false, false, false, true, true, false, false] },
    { banker: 7, expected: [false, false, false, false, false, false, false, false, false, false] },
  ];

  for (const { banker, expected } of TABLE) {
    describe(`banker ${banker}`, () => {
      for (let v = 0; v <= 9; v++) {
        const want = expected[v]!;
        it(`player third = ${v} → ${want ? 'draws' : 'stands'}`, () => {
          expect(bankerDrawsThird(banker, v)).toBe(want);
        });
      }
    });
  }
});

describe('bankerDrawsThird — input validation', () => {
  it.each([8, 9] as HandTotal[])('throws on natural banker (%i)', (t) => {
    expect(() => bankerDrawsThird(t, 0)).toThrow(/natural pre-empted/);
  });
  it('throws on non-integer playerThirdValue', () => {
    expect(() => bankerDrawsThird(3, 1.5)).toThrow(/invalid playerThirdValue/);
  });
  it('throws on negative playerThirdValue', () => {
    expect(() => bankerDrawsThird(3, -1)).toThrow(/invalid playerThirdValue/);
  });
  it('throws on playerThirdValue > 9', () => {
    expect(() => bankerDrawsThird(3, 10)).toThrow(/invalid playerThirdValue/);
  });
});

describe('resolveRound', () => {
  it('Player 7 vs Banker 5 → player wins, margin 2', () => {
    const r = resolveRound([card('3'), card('4')], [card('2'), card('3')]);
    expect(r.winner).toBe('player');
    expect(r.margin).toBe(2);
    expect(r.winnerNatural).toBe(false);
    expect(r.bothNatural).toBe(false);
    expect(r.totalCards).toBe(4);
  });

  it('Player 8 (natural) vs Banker 5 → player wins natural', () => {
    const r = resolveRound([card('A'), card('7')], [card('2'), card('3')]);
    expect(r.winner).toBe('player');
    expect(r.winnerNatural).toBe(true);
    expect(r.bothNatural).toBe(false);
  });

  it('Player 8 vs Banker 8 → tie, both natural', () => {
    const r = resolveRound([card('A'), card('7')], [card('3'), card('5')]);
    expect(r.winner).toBe('tie');
    expect(r.bothNatural).toBe(true);
  });

  it('detects Player Pair on rank match', () => {
    const r = resolveRound([card('7', '♠'), card('7', '♥')], [card('K'), card('Q')]);
    expect(r.playerPair).toBe(true);
    expect(r.bankerPair).toBe(false);
  });

  it('totalCards counts all dealt cards including thirds', () => {
    const r = resolveRound([card('2'), card('3'), card('4')], [card('5'), card('6'), card('7')]);
    expect(r.totalCards).toBe(6);
  });
});

describe('computePayouts', () => {
  it('zero bets → all zeros', () => {
    const r = resolveRound([card('3'), card('4')], [card('2'), card('3')]);
    expect(computePayouts(EMPTY_BETS, r)).toEqual(EMPTY_BETS);
  });

  it('Player win, bet on Player: returns +bet (1:1 winnings)', () => {
    const r = resolveRound([card('3'), card('4')], [card('2'), card('3')]);
    const p = computePayouts({ ...EMPTY_BETS, player: 100 }, r);
    expect(p.player).toBe(100);
  });

  it('Banker win, bet on Banker 100: returns 95 (5% commission floor)', () => {
    const r = resolveRound([card('2'), card('3')], [card('3'), card('4')]);
    const p = computePayouts({ ...EMPTY_BETS, banker: 100 }, r);
    expect(p.banker).toBe(95);
  });

  it('Banker win, bet on Banker 17: returns 17 (floor(17*0.05) = 0 commission)', () => {
    const r = resolveRound([card('2'), card('3')], [card('3'), card('4')]);
    const p = computePayouts({ ...EMPTY_BETS, banker: 17 }, r);
    expect(p.banker).toBe(17);
  });

  it('Banker win, bet on Banker 21: returns 20 (floor(21*0.05) = 1 commission)', () => {
    const r = resolveRound([card('2'), card('3')], [card('3'), card('4')]);
    const p = computePayouts({ ...EMPTY_BETS, banker: 21 }, r);
    expect(p.banker).toBe(20);
  });

  it('Tie: Player and Banker push (return 0), Tie pays 8:1', () => {
    const r = resolveRound([card('3'), card('5')], [card('3'), card('5')]);
    const p = computePayouts({ ...EMPTY_BETS, player: 50, banker: 50, tie: 10 }, r);
    expect(p.player).toBe(0);
    expect(p.banker).toBe(0);
    expect(p.tie).toBe(80);
  });

  it('Player Pair fires: pays 11:1', () => {
    const r = resolveRound([card('7', '♠'), card('7', '♥')], [card('K'), card('Q')]);
    const p = computePayouts({ ...EMPTY_BETS, playerPair: 10 }, r);
    expect(p.playerPair).toBe(110);
  });

  it('No pair: pair bet loses', () => {
    const r = resolveRound([card('7'), card('8')], [card('K'), card('Q')]);
    const p = computePayouts({ ...EMPTY_BETS, playerPair: 10 }, r);
    expect(p.playerPair).toBe(-10);
  });

  it('Big (4 cards) loses; Small (4 cards) wins floor(bet*1.5)', () => {
    const r = resolveRound([card('3'), card('4')], [card('2'), card('3')]);
    expect(r.totalCards).toBe(4);
    const p = computePayouts({ ...EMPTY_BETS, big: 100, small: 100 }, r);
    expect(p.big).toBe(-100);
    expect(p.small).toBe(150);
  });

  it('Small (5 cards) loses; Big (5 cards) wins floor(bet*0.54)', () => {
    const r = resolveRound([card('2'), card('3'), card('4')], [card('2'), card('3')]);
    expect(r.totalCards).toBe(5);
    const p = computePayouts({ ...EMPTY_BETS, big: 100, small: 100 }, r);
    expect(p.small).toBe(-100);
    expect(p.big).toBe(54);
  });

  it('Dragon natural win pays 1:1', () => {
    const r = resolveRound([card('A'), card('7')], [card('2'), card('3')]);
    const p = computePayouts({ ...EMPTY_BETS, playerDragon: 100 }, r);
    expect(p.playerDragon).toBe(100);
  });

  it('Dragon non-natural margin-9 win pays 30:1', () => {
    const r = resolveRound([card('A'), card('2'), card('6')], [card('K'), card('K')]);
    expect(r.winner).toBe('player');
    expect(r.margin).toBe(9);
    expect(r.winnerNatural).toBe(false);
    const p = computePayouts({ ...EMPTY_BETS, playerDragon: 50 }, r);
    expect(p.playerDragon).toBe(1500);
  });

  it('Dragon margin-1/2/3 win → loses (real Dragon rule)', () => {
    const r = resolveRound([card('3'), card('4')], [card('2'), card('4')]);
    expect(r.winner).toBe('player');
    expect(r.margin).toBe(1);
    const p = computePayouts({ ...EMPTY_BETS, playerDragon: 100 }, r);
    expect(p.playerDragon).toBe(-100);
  });

  it('Dragon on tie with both natural → push', () => {
    const r = resolveRound([card('A'), card('7')], [card('3'), card('5')]);
    expect(r.bothNatural).toBe(true);
    const p = computePayouts({ ...EMPTY_BETS, playerDragon: 50, bankerDragon: 50 }, r);
    expect(p.playerDragon).toBe(0);
    expect(p.bankerDragon).toBe(0);
  });

  it('Dragon on losing side → loses', () => {
    const r = resolveRound([card('A'), card('7')], [card('2'), card('3')]);
    const p = computePayouts({ ...EMPTY_BETS, bankerDragon: 100 }, r);
    expect(p.bankerDragon).toBe(-100);
  });
});
