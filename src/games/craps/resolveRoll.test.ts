import { describe, it, expect } from 'vitest';
import { resolveRoll } from './resolveRoll';
import type { Roll } from './dice';

function roll(d1: number, d2: number): Roll {
  return { d1, d2, total: d1 + d2, isHard: d1 === d2 };
}

describe('resolveRoll', () => {
  it('come-out 7: pass wins (stake+winnings), dont-pass loses', () => {
    const r = resolveRoll(
      [
        { betId: 'pass', amount: 100, betPoint: null },
        { betId: 'dont-pass', amount: 100, betPoint: null },
      ],
      roll(3, 4),
      'come-out',
      null,
    );
    // pass: 100 stake + 100 winnings = 200 returned; dont-pass: 0
    expect(r.netReturned).toBe(200);
    expect(r.perBet[0]!.outcome).toEqual({ kind: 'win' });
    expect(r.perBet[1]!.outcome).toEqual({ kind: 'lose' });
  });
  it('dont-pass 12 push returns the stake', () => {
    const r = resolveRoll(
      [{ betId: 'dont-pass', amount: 100, betPoint: null }],
      roll(6, 6),
      'come-out',
      null,
    );
    expect(r.netReturned).toBe(100);
    expect(r.perBet[0]!.outcome).toEqual({ kind: 'push' });
  });
  it('non-working bet (odds on come-out) stands, returns 0', () => {
    const r = resolveRoll(
      [{ betId: 'odds-pass', amount: 100, betPoint: 6 }],
      roll(3, 3),
      'come-out',
      null,
    );
    expect(r.netReturned).toBe(0);
    expect(r.perBet[0]!.outcome).toEqual({ kind: 'standing' });
  });
});
