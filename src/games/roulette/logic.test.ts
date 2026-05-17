import { afterEach, describe, expect, it } from 'vitest';
import { seed, unseed } from '@/systems/rng';
import { makeBet } from './bets';
import { settleOne, spin } from './logic';
import type { PlacedBet, SpinResult } from './types';

function placed(bet: ReturnType<typeof makeBet>, amount: number): PlacedBet {
  return { ...bet, amount, betHandleId: 'test-handle' };
}

describe('spin', () => {
  afterEach(() => unseed());

  it('returns a SpinResult with number 0..36 and matching color', () => {
    seed(1);
    const r = spin();
    expect(r.number).toBeGreaterThanOrEqual(0);
    expect(r.number).toBeLessThanOrEqual(36);
    if (r.number === 0) expect(r.color).toBe('green');
    expect(r.pocketIndex).toBeGreaterThanOrEqual(0);
    expect(r.pocketIndex).toBeLessThanOrEqual(36);
  });

  it('is deterministic under a fixed seed', () => {
    seed(42);
    const a = spin();
    seed(42);
    const b = spin();
    expect(a).toEqual(b);
  });

  it('over many spins, hits every pocket at least once (sanity)', () => {
    seed(1);
    const seen = new Set<number>();
    for (let i = 0; i < 5_000; i++) seen.add(spin().number);
    expect(seen.size).toBe(37);
  });
});

describe('settleOne', () => {
  const spinResult = (n: number): SpinResult => ({
    number: n,
    color: n === 0 ? 'green' : 'red',
    pocketIndex: 0,
  });

  it('straight win pays 35:1 (gross 36×)', () => {
    const bet = placed(makeBet({ type: 'straight', n: 17 }), 10);
    expect(settleOne(bet, spinResult(17))).toEqual({
      key: 'straight:17',
      type: 'straight',
      amount: 10,
      won: true,
      payout: 360,
    });
  });

  it('straight loss returns 0', () => {
    const bet = placed(makeBet({ type: 'straight', n: 17 }), 10);
    expect(settleOne(bet, spinResult(18)).payout).toBe(0);
    expect(settleOne(bet, spinResult(18)).won).toBe(false);
  });

  it('split win pays 17:1 (gross 18×)', () => {
    const bet = placed(makeBet({ type: 'split', a: 17, b: 18 }), 10);
    expect(settleOne(bet, spinResult(18)).payout).toBe(180);
  });

  it('street win pays 11:1 (gross 12×)', () => {
    const bet = placed(makeBet({ type: 'street', rowStart: 16 }), 10);
    expect(settleOne(bet, spinResult(17)).payout).toBe(120);
  });

  it('corner win pays 8:1 (gross 9×)', () => {
    const bet = placed(makeBet({ type: 'corner', topLeft: 1 }), 10);
    expect(settleOne(bet, spinResult(5)).payout).toBe(90);
  });

  it('six-line win pays 5:1 (gross 6×)', () => {
    const bet = placed(makeBet({ type: 'six-line', rowStart: 1 }), 10);
    expect(settleOne(bet, spinResult(4)).payout).toBe(60);
  });

  it('column win pays 2:1 (gross 3×)', () => {
    const bet = placed(makeBet({ type: 'column', col: 2 }), 10);
    expect(settleOne(bet, spinResult(20)).payout).toBe(30);
  });

  it('dozen win pays 2:1', () => {
    const bet = placed(makeBet({ type: 'dozen', dozen: 1 }), 10);
    expect(settleOne(bet, spinResult(7)).payout).toBe(30);
  });

  it('red/black/odd/even/low/high pay 1:1 on hit', () => {
    for (const t of ['red', 'black', 'odd', 'even', 'low', 'high'] as const) {
      const bet = placed(makeBet({ type: t }), 10);
      const winningN = bet.numbers[0]!;
      expect(settleOne(bet, spinResult(winningN)).payout).toBe(20);
    }
  });

  it('0 loses all outside / even-money bets (no en prison)', () => {
    for (const t of ['red', 'black', 'odd', 'even', 'low', 'high'] as const) {
      const bet = placed(makeBet({ type: t }), 10);
      expect(settleOne(bet, spinResult(0)).payout).toBe(0);
    }
    expect(settleOne(placed(makeBet({ type: 'column', col: 1 }), 10), spinResult(0)).payout).toBe(
      0,
    );
    expect(settleOne(placed(makeBet({ type: 'dozen', dozen: 1 }), 10), spinResult(0)).payout).toBe(
      0,
    );
  });

  it('0 wins straight:0 and split:0-1 / 0-2 / 0-3', () => {
    expect(settleOne(placed(makeBet({ type: 'straight', n: 0 }), 5), spinResult(0)).payout).toBe(
      180,
    );
    expect(settleOne(placed(makeBet({ type: 'split', a: 0, b: 1 }), 5), spinResult(0)).payout).toBe(
      90,
    );
    expect(settleOne(placed(makeBet({ type: 'split', a: 0, b: 2 }), 5), spinResult(0)).payout).toBe(
      90,
    );
    expect(settleOne(placed(makeBet({ type: 'split', a: 0, b: 3 }), 5), spinResult(0)).payout).toBe(
      90,
    );
  });
});
