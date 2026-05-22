import { describe, it, expect } from 'vitest';
import { BET_TYPES } from './bets';
import type { Roll } from './dice';

function roll(d1: number, d2: number): Roll {
  return { d1, d2, total: d1 + d2, isHard: d1 === d2 };
}

describe('pass line', () => {
  const pass = BET_TYPES.pass!;
  it('come-out 7 or 11 wins', () => {
    expect(pass.resolve(roll(3, 4), 'come-out', null, null)).toEqual({ kind: 'win' });
    expect(pass.resolve(roll(5, 6), 'come-out', null, null)).toEqual({ kind: 'win' });
  });
  it('come-out 2/3/12 loses', () => {
    expect(pass.resolve(roll(1, 1), 'come-out', null, null)).toEqual({ kind: 'lose' });
    expect(pass.resolve(roll(6, 6), 'come-out', null, null)).toEqual({ kind: 'lose' });
  });
  it('come-out point number stands', () => {
    expect(pass.resolve(roll(4, 2), 'come-out', null, null)).toEqual({ kind: 'standing' });
  });
  it('point made wins, seven-out loses, else stands', () => {
    expect(pass.resolve(roll(3, 3), 'point', 6, null)).toEqual({ kind: 'win' });
    expect(pass.resolve(roll(3, 4), 'point', 6, null)).toEqual({ kind: 'lose' });
    expect(pass.resolve(roll(5, 3), 'point', 6, null)).toEqual({ kind: 'standing' });
  });
  it('pays 1:1', () => {
    expect(pass.payout(100, null)).toBe(100);
  });
});

describe("don't pass", () => {
  const dp = BET_TYPES['dont-pass']!;
  it('come-out 12 pushes (bar 12)', () => {
    expect(dp.resolve(roll(6, 6), 'come-out', null, null)).toEqual({ kind: 'push' });
  });
  it('come-out 2/3 wins, 7/11 loses', () => {
    expect(dp.resolve(roll(1, 1), 'come-out', null, null)).toEqual({ kind: 'win' });
    expect(dp.resolve(roll(3, 4), 'come-out', null, null)).toEqual({ kind: 'lose' });
  });
  it('point: seven-out wins, point made loses', () => {
    expect(dp.resolve(roll(3, 4), 'point', 6, null)).toEqual({ kind: 'win' });
    expect(dp.resolve(roll(3, 3), 'point', 6, null)).toEqual({ kind: 'lose' });
  });
});

describe('come bet travels', () => {
  const come = BET_TYPES.come!;
  it('fresh come bet: 7/11 win, 2/3/12 lose, else move', () => {
    expect(come.resolve(roll(3, 4), 'point', 6, null)).toEqual({ kind: 'win' });
    expect(come.resolve(roll(1, 1), 'point', 6, null)).toEqual({ kind: 'lose' });
    expect(come.resolve(roll(2, 3), 'point', 6, null)).toEqual({ kind: 'move', toPoint: 5 });
  });
  it('travelled come bet: its number wins, 7 loses, else stands', () => {
    expect(come.resolve(roll(2, 3), 'point', 6, 5)).toEqual({ kind: 'win' });
    expect(come.resolve(roll(3, 4), 'point', 6, 5)).toEqual({ kind: 'lose' });
    expect(come.resolve(roll(6, 4), 'point', 6, 5)).toEqual({ kind: 'standing' });
  });
});

describe('pass odds true-odds payouts', () => {
  const odds = BET_TYPES['odds-pass']!;
  it('2:1 on 4/10, 3:2 on 5/9, 6:5 on 6/8', () => {
    expect(odds.payout(100, 4)).toBe(200);
    expect(odds.payout(100, 10)).toBe(200);
    expect(odds.payout(100, 5)).toBe(150);
    expect(odds.payout(100, 6)).toBe(120);
  });
  it('odds off on come-out (isWorking false)', () => {
    expect(odds.isWorking('come-out')).toBe(false);
    expect(odds.isWorking('point')).toBe(true);
  });
  it('wins when its number rolls, loses on 7', () => {
    expect(odds.resolve(roll(3, 3), 'point', 6, null)).toEqual({ kind: 'win' });
    expect(odds.resolve(roll(3, 4), 'point', 6, null)).toEqual({ kind: 'lose' });
  });
});

// ---- PR B tests ----

describe('place bets', () => {
  it('place-6 wins on 6, loses on 7, stands otherwise; off on come-out', () => {
    const p6 = BET_TYPES['place-6']!;
    expect(p6.isWorking('come-out')).toBe(false);
    expect(p6.isWorking('point')).toBe(true);
    expect(p6.resolve(roll(3, 3), 'point', 8, null)).toEqual({ kind: 'win' });
    expect(p6.resolve(roll(3, 4), 'point', 8, null)).toEqual({ kind: 'lose' });
    expect(p6.resolve(roll(5, 4), 'point', 8, null)).toEqual({ kind: 'standing' });
    expect(p6.payout(120, null)).toBe(140); // 7:6 → 120 * 7/6 = 140
  });
  it('place-4 pays 9:5', () => {
    expect(BET_TYPES['place-4']!.payout(100, null)).toBe(180);
  });
  it('place-5 pays 7:5', () => {
    expect(BET_TYPES['place-5']!.payout(100, null)).toBe(140);
  });
  it('place-8 pays 7:6', () => {
    expect(BET_TYPES['place-8']!.payout(120, null)).toBe(140);
  });
  it('place-9 pays 7:5', () => {
    expect(BET_TYPES['place-9']!.payout(100, null)).toBe(140);
  });
  it('place-10 pays 9:5', () => {
    expect(BET_TYPES['place-10']!.payout(100, null)).toBe(180);
  });
  it('place-4 cannot be placed on come-out', () => {
    expect(BET_TYPES['place-4']!.canPlace('come-out', { point: null })).toBe(false);
    expect(BET_TYPES['place-4']!.canPlace('point', { point: 8 })).toBe(true);
  });
  it('place-5 wins on 5, loses on 7, stands otherwise', () => {
    const p5 = BET_TYPES['place-5']!;
    expect(p5.resolve(roll(2, 3), 'point', 8, null)).toEqual({ kind: 'win' });
    expect(p5.resolve(roll(3, 4), 'point', 8, null)).toEqual({ kind: 'lose' });
    expect(p5.resolve(roll(4, 4), 'point', 8, null)).toEqual({ kind: 'standing' });
  });
  it('place-9 wins on 9, loses on 7, stands otherwise', () => {
    const p9 = BET_TYPES['place-9']!;
    expect(p9.resolve(roll(4, 5), 'point', 8, null)).toEqual({ kind: 'win' });
    expect(p9.resolve(roll(3, 4), 'point', 8, null)).toEqual({ kind: 'lose' });
    expect(p9.resolve(roll(2, 2), 'point', 8, null)).toEqual({ kind: 'standing' });
  });
  it('place-10 wins on 10, loses on 7, stands otherwise', () => {
    const p10 = BET_TYPES['place-10']!;
    expect(p10.resolve(roll(5, 5), 'point', 8, null)).toEqual({ kind: 'win' });
    expect(p10.resolve(roll(3, 4), 'point', 8, null)).toEqual({ kind: 'lose' });
    expect(p10.resolve(roll(2, 3), 'point', 8, null)).toEqual({ kind: 'standing' });
  });
  it('place payout floors fractional amounts', () => {
    // 6/8: floor(7 * 7 / 6) = floor(8.166...) = 8
    expect(BET_TYPES['place-6']!.payout(7, null)).toBe(8);
    // 5/9: floor(7 * 7 / 5) = floor(9.8) = 9
    expect(BET_TYPES['place-5']!.payout(7, null)).toBe(9);
    // 4/10: floor(7 * 9 / 5) = floor(12.6) = 12
    expect(BET_TYPES['place-4']!.payout(7, null)).toBe(12);
  });
});

describe('field', () => {
  const field = BET_TYPES['field']!;
  it('wins on 2/3/4/9/10/11/12, loses on 5/6/7/8', () => {
    expect(field.resolve(roll(1, 1), 'come-out', null, null).kind).toBe('win'); // 2
    expect(field.resolve(roll(1, 2), 'come-out', null, null).kind).toBe('win'); // 3
    expect(field.resolve(roll(2, 2), 'come-out', null, null).kind).toBe('win'); // 4
    expect(field.resolve(roll(4, 5), 'come-out', null, null).kind).toBe('win'); // 9
    expect(field.resolve(roll(5, 5), 'come-out', null, null).kind).toBe('win'); // 10
    expect(field.resolve(roll(5, 6), 'come-out', null, null).kind).toBe('win'); // 11
    expect(field.resolve(roll(6, 6), 'come-out', null, null).kind).toBe('win'); // 12
    expect(field.resolve(roll(2, 3), 'come-out', null, null).kind).toBe('lose'); // 5
    expect(field.resolve(roll(3, 3), 'come-out', null, null).kind).toBe('lose'); // 6
    expect(field.resolve(roll(3, 4), 'come-out', null, null).kind).toBe('lose'); // 7
    expect(field.resolve(roll(4, 4), 'come-out', null, null).kind).toBe('lose'); // 8
  });
  it('2 pays 2:1 via multiplier', () => {
    expect(field.resolve(roll(1, 1), 'come-out', null, null)).toEqual({
      kind: 'win',
      multiplier: 2,
    });
  });
  it('12 pays 3:1 via multiplier', () => {
    expect(field.resolve(roll(6, 6), 'come-out', null, null)).toEqual({
      kind: 'win',
      multiplier: 3,
    });
  });
  it('other winners return plain win (1:1 via payout)', () => {
    expect(field.resolve(roll(4, 5), 'come-out', null, null)).toEqual({ kind: 'win' }); // 9
    expect(field.resolve(roll(1, 2), 'come-out', null, null)).toEqual({ kind: 'win' }); // 3
    expect(field.resolve(roll(5, 6), 'come-out', null, null)).toEqual({ kind: 'win' }); // 11
  });
  it('payout is 1:1 for base case', () => {
    expect(field.payout(100, null)).toBe(100);
  });
  it('always working (isWorking always true)', () => {
    expect(field.isWorking('come-out')).toBe(true);
    expect(field.isWorking('point')).toBe(true);
  });
  it('can always be placed', () => {
    expect(field.canPlace('come-out', { point: null })).toBe(true);
    expect(field.canPlace('point', { point: 6 })).toBe(true);
  });
});

describe('hardways', () => {
  describe('hard-4', () => {
    const h4 = BET_TYPES['hard-4']!;
    it('wins if 4 rolls hard (2+2)', () => {
      expect(h4.resolve(roll(2, 2), 'point', 8, null)).toEqual({ kind: 'win' });
    });
    it('loses if 4 rolls easy (1+3)', () => {
      expect(h4.resolve(roll(1, 3), 'point', 8, null)).toEqual({ kind: 'lose' });
    });
    it('loses on 7', () => {
      expect(h4.resolve(roll(3, 4), 'point', 8, null)).toEqual({ kind: 'lose' });
    });
    it('stands on other totals', () => {
      expect(h4.resolve(roll(2, 3), 'point', 8, null)).toEqual({ kind: 'standing' });
    });
    it('pays 7:1', () => {
      expect(h4.payout(100, null)).toBe(700);
    });
    it('off on come-out', () => {
      expect(h4.isWorking('come-out')).toBe(false);
      expect(h4.isWorking('point')).toBe(true);
    });
  });

  describe('hard-6', () => {
    const h6 = BET_TYPES['hard-6']!;
    it('wins if 6 rolls hard (3+3)', () => {
      expect(h6.resolve(roll(3, 3), 'point', 8, null)).toEqual({ kind: 'win' });
    });
    it('loses if 6 rolls easy (2+4)', () => {
      expect(h6.resolve(roll(2, 4), 'point', 8, null)).toEqual({ kind: 'lose' });
    });
    it('loses on 7', () => {
      expect(h6.resolve(roll(3, 4), 'point', 8, null)).toEqual({ kind: 'lose' });
    });
    it('stands on other totals', () => {
      expect(h6.resolve(roll(4, 4), 'point', 8, null)).toEqual({ kind: 'standing' });
    });
    it('pays 9:1', () => {
      expect(h6.payout(100, null)).toBe(900);
    });
  });

  describe('hard-8', () => {
    const h8 = BET_TYPES['hard-8']!;
    it('wins if 8 rolls hard (4+4)', () => {
      expect(h8.resolve(roll(4, 4), 'point', 6, null)).toEqual({ kind: 'win' });
    });
    it('loses if 8 rolls easy (3+5)', () => {
      expect(h8.resolve(roll(3, 5), 'point', 6, null)).toEqual({ kind: 'lose' });
    });
    it('loses on 7', () => {
      expect(h8.resolve(roll(3, 4), 'point', 6, null)).toEqual({ kind: 'lose' });
    });
    it('stands on other totals', () => {
      expect(h8.resolve(roll(2, 3), 'point', 6, null)).toEqual({ kind: 'standing' });
    });
    it('pays 9:1', () => {
      expect(h8.payout(100, null)).toBe(900);
    });
  });

  describe('hard-10', () => {
    const h10 = BET_TYPES['hard-10']!;
    it('wins if 10 rolls hard (5+5)', () => {
      expect(h10.resolve(roll(5, 5), 'point', 6, null)).toEqual({ kind: 'win' });
    });
    it('loses if 10 rolls easy (4+6)', () => {
      expect(h10.resolve(roll(4, 6), 'point', 6, null)).toEqual({ kind: 'lose' });
    });
    it('loses on 7', () => {
      expect(h10.resolve(roll(3, 4), 'point', 6, null)).toEqual({ kind: 'lose' });
    });
    it('stands on other totals', () => {
      expect(h10.resolve(roll(2, 2), 'point', 6, null)).toEqual({ kind: 'standing' });
    });
    it('pays 7:1', () => {
      expect(h10.payout(100, null)).toBe(700);
    });
  });
});

describe('one-roll props', () => {
  describe('any-7', () => {
    const a7 = BET_TYPES['any-7']!;
    it('wins on 7, loses on any other total', () => {
      expect(a7.resolve(roll(3, 4), 'come-out', null, null)).toEqual({ kind: 'win' });
      expect(a7.resolve(roll(4, 4), 'come-out', null, null)).toEqual({ kind: 'lose' });
      expect(a7.resolve(roll(1, 1), 'come-out', null, null)).toEqual({ kind: 'lose' });
    });
    it('pays 4:1', () => {
      expect(a7.payout(100, null)).toBe(400);
    });
  });

  describe('any-craps', () => {
    const ac = BET_TYPES['any-craps']!;
    it('wins on 2, 3, 12; loses on others', () => {
      expect(ac.resolve(roll(1, 1), 'come-out', null, null)).toEqual({ kind: 'win' }); // 2
      expect(ac.resolve(roll(1, 2), 'come-out', null, null)).toEqual({ kind: 'win' }); // 3
      expect(ac.resolve(roll(6, 6), 'come-out', null, null)).toEqual({ kind: 'win' }); // 12
      expect(ac.resolve(roll(3, 4), 'come-out', null, null)).toEqual({ kind: 'lose' }); // 7
      expect(ac.resolve(roll(5, 6), 'come-out', null, null)).toEqual({ kind: 'lose' }); // 11
    });
    it('pays 7:1', () => {
      expect(ac.payout(100, null)).toBe(700);
    });
  });

  describe('prop-2', () => {
    const p2 = BET_TYPES['prop-2']!;
    it('wins only on 2', () => {
      expect(p2.resolve(roll(1, 1), 'come-out', null, null)).toEqual({ kind: 'win' });
      expect(p2.resolve(roll(1, 2), 'come-out', null, null)).toEqual({ kind: 'lose' });
    });
    it('pays 30:1', () => {
      expect(p2.payout(100, null)).toBe(3000);
    });
  });

  describe('prop-3', () => {
    const p3 = BET_TYPES['prop-3']!;
    it('wins only on 3', () => {
      expect(p3.resolve(roll(1, 2), 'come-out', null, null)).toEqual({ kind: 'win' });
      expect(p3.resolve(roll(1, 1), 'come-out', null, null)).toEqual({ kind: 'lose' });
    });
    it('pays 15:1', () => {
      expect(p3.payout(100, null)).toBe(1500);
    });
  });

  describe('prop-11', () => {
    const p11 = BET_TYPES['prop-11']!;
    it('wins only on 11', () => {
      expect(p11.resolve(roll(5, 6), 'come-out', null, null)).toEqual({ kind: 'win' });
      expect(p11.resolve(roll(6, 6), 'come-out', null, null)).toEqual({ kind: 'lose' });
    });
    it('pays 15:1', () => {
      expect(p11.payout(100, null)).toBe(1500);
    });
  });

  describe('prop-12', () => {
    const p12 = BET_TYPES['prop-12']!;
    it('wins only on 12', () => {
      expect(p12.resolve(roll(6, 6), 'come-out', null, null)).toEqual({ kind: 'win' });
      expect(p12.resolve(roll(5, 6), 'come-out', null, null)).toEqual({ kind: 'lose' });
    });
    it('pays 30:1', () => {
      expect(p12.payout(100, null)).toBe(3000);
    });
  });
});

describe('horn', () => {
  const horn = BET_TYPES['horn']!;
  it('wins on 2: winnings = 31*q - amount (q = floor(amount/4))', () => {
    // amount=100, q=25 → winnings = 31*25 - 100 = 775-100 = 675
    expect(horn.resolve(roll(1, 1), 'come-out', null, null, 100)).toEqual({
      kind: 'win',
      winnings: 675,
    });
  });
  it('wins on 12: same formula as 2', () => {
    // amount=100, q=25 → winnings = 31*25 - 100 = 675
    expect(horn.resolve(roll(6, 6), 'come-out', null, null, 100)).toEqual({
      kind: 'win',
      winnings: 675,
    });
  });
  it('wins on 3: winnings = 16*q - amount', () => {
    // amount=100, q=25 → winnings = 16*25 - 100 = 400-100 = 300
    expect(horn.resolve(roll(1, 2), 'come-out', null, null, 100)).toEqual({
      kind: 'win',
      winnings: 300,
    });
  });
  it('wins on 11: same formula as 3', () => {
    // amount=100, q=25 → winnings = 16*25 - 100 = 300
    expect(horn.resolve(roll(5, 6), 'come-out', null, null, 100)).toEqual({
      kind: 'win',
      winnings: 300,
    });
  });
  it('loses on any other number', () => {
    expect(horn.resolve(roll(3, 4), 'come-out', null, null, 100)).toEqual({ kind: 'lose' }); // 7
    expect(horn.resolve(roll(3, 3), 'come-out', null, null, 100)).toEqual({ kind: 'lose' }); // 6
    expect(horn.resolve(roll(4, 5), 'come-out', null, null, 100)).toEqual({ kind: 'lose' }); // 9
  });
  it('floors q when amount not divisible by 4', () => {
    // amount=9, q=floor(9/4)=2 → hit 2: winnings=31*2-9=62-9=53
    expect(horn.resolve(roll(1, 1), 'come-out', null, null, 9)).toEqual({
      kind: 'win',
      winnings: 53,
    });
  });
  it('defaults amount to 0 when not provided', () => {
    // amount=0, q=0 → winnings=0-0=0
    expect(horn.resolve(roll(1, 1), 'come-out', null, null)).toEqual({
      kind: 'win',
      winnings: 0,
    });
  });
  it('always working, can always place', () => {
    expect(horn.isWorking('come-out')).toBe(true);
    expect(horn.isWorking('point')).toBe(true);
    expect(horn.canPlace('come-out', { point: null })).toBe(true);
  });
});

describe('c-and-e', () => {
  const ce = BET_TYPES['c-and-e']!;
  it('wins on 2: winnings = 8*h - amount (h = floor(amount/2))', () => {
    // amount=100, h=50 → winnings = 8*50 - 100 = 400-100 = 300
    expect(ce.resolve(roll(1, 1), 'come-out', null, null, 100)).toEqual({
      kind: 'win',
      winnings: 300,
    });
  });
  it('wins on 3: same 8h formula', () => {
    // amount=100, h=50 → winnings = 300
    expect(ce.resolve(roll(1, 2), 'come-out', null, null, 100)).toEqual({
      kind: 'win',
      winnings: 300,
    });
  });
  it('wins on 12: same 8h formula', () => {
    // amount=100, h=50 → winnings = 300
    expect(ce.resolve(roll(6, 6), 'come-out', null, null, 100)).toEqual({
      kind: 'win',
      winnings: 300,
    });
  });
  it('wins on 11: winnings = 16*h - amount', () => {
    // amount=100, h=50 → winnings = 16*50 - 100 = 800-100 = 700
    expect(ce.resolve(roll(5, 6), 'come-out', null, null, 100)).toEqual({
      kind: 'win',
      winnings: 700,
    });
  });
  it('loses on any other number', () => {
    expect(ce.resolve(roll(3, 4), 'come-out', null, null, 100)).toEqual({ kind: 'lose' }); // 7
    expect(ce.resolve(roll(3, 3), 'come-out', null, null, 100)).toEqual({ kind: 'lose' }); // 6
    expect(ce.resolve(roll(4, 5), 'come-out', null, null, 100)).toEqual({ kind: 'lose' }); // 9
  });
  it('floors h when amount is odd', () => {
    // amount=9, h=floor(9/2)=4 → hit 11: winnings=16*4-9=64-9=55
    expect(ce.resolve(roll(5, 6), 'come-out', null, null, 9)).toEqual({
      kind: 'win',
      winnings: 55,
    });
  });
  it('defaults amount to 0 when not provided', () => {
    // amount=0, h=0 → winnings=0-0=0
    expect(ce.resolve(roll(1, 1), 'come-out', null, null)).toEqual({
      kind: 'win',
      winnings: 0,
    });
  });
  it('always working, can always place', () => {
    expect(ce.isWorking('come-out')).toBe(true);
    expect(ce.isWorking('point')).toBe(true);
    expect(ce.canPlace('come-out', { point: null })).toBe(true);
  });
});
