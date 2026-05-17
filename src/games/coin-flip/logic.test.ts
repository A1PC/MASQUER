import { afterEach, describe, expect, it } from 'vitest';
import { seed, unseed } from '@/systems/rng';
import { playRound, COIN_FLIP_CONFIG, type CoinFlipDetails } from './logic';

afterEach(() => unseed());

describe('playRound', () => {
  it('returns integer payouts and net change', () => {
    seed(1);
    for (let i = 0; i < 20; i++) {
      const r = playRound({ call: 'heads', betAmount: 10 });
      expect(Number.isInteger(r.payout)).toBe(true);
      expect(Number.isInteger(r.netChange)).toBe(true);
      expect(r.netChange).toBe(r.payout - r.betAmount);
    }
  });

  it('win when call matches: payout = bet*2, netChange = bet', () => {
    seed(2); // pick a seed that lands heads first
    // Determine landed by running once without checking outcome:
    unseed();
    seed(2);
    const a = playRound({ call: 'heads', betAmount: 10 });
    // a.details.landed is either 'heads' or 'tails'; verify the rule based on a.details
    const d = a.details as CoinFlipDetails;
    if (d.landed === 'heads') {
      expect(a.outcome).toBe('win');
      expect(a.payout).toBe(20);
      expect(a.netChange).toBe(10);
    } else {
      expect(a.outcome).toBe('loss');
      expect(a.payout).toBe(0);
      expect(a.netChange).toBe(-10);
    }
  });

  it('details include both call and landed', () => {
    seed(99);
    const r = playRound({ call: 'tails', betAmount: 5 });
    const d = r.details as CoinFlipDetails;
    expect(d.call).toBe('tails');
    expect(['heads', 'tails']).toContain(d.landed);
  });

  it('seeded determinism: same seed → same sequence of outcomes', () => {
    seed(42);
    const a = [
      playRound({ call: 'heads', betAmount: 10 }),
      playRound({ call: 'heads', betAmount: 10 }),
      playRound({ call: 'heads', betAmount: 10 }),
    ];
    unseed();
    seed(42);
    const b = [
      playRound({ call: 'heads', betAmount: 10 }),
      playRound({ call: 'heads', betAmount: 10 }),
      playRound({ call: 'heads', betAmount: 10 }),
    ];
    expect(a.map((r) => (r.details as CoinFlipDetails).landed)).toEqual(
      b.map((r) => (r.details as CoinFlipDetails).landed),
    );
  });

  it('over 1000 rolls under seed: roughly 50/50 H vs T', () => {
    seed(7);
    let heads = 0;
    for (let i = 0; i < 1000; i++) {
      const r = playRound({ call: 'heads', betAmount: 1 });
      if ((r.details as CoinFlipDetails).landed === 'heads') heads += 1;
    }
    expect(heads).toBeGreaterThan(400);
    expect(heads).toBeLessThan(600);
  });

  it('config exports MIN_BET=1 and MAX_BET=500', () => {
    expect(COIN_FLIP_CONFIG.MIN_BET).toBe(1);
    expect(COIN_FLIP_CONFIG.MAX_BET).toBe(500);
  });
});
