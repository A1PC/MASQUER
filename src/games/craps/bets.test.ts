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
