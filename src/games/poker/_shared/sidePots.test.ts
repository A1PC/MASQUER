import { describe, it, expect } from 'vitest';
import { computeSidePots } from './sidePots';

describe('computeSidePots', () => {
  it('single pot when all contribute equally', () => {
    const pots = computeSidePots([
      { seatId: 0, committed: 100, folded: false },
      { seatId: 1, committed: 100, folded: false },
      { seatId: 2, committed: 100, folded: false },
    ]);
    expect(pots).toHaveLength(1);
    expect(pots[0]!.amount).toBe(300);
    expect(pots[0]!.eligibleSeatIds.sort()).toEqual([0, 1, 2]);
  });

  it('one all-in for less creates a main + side pot', () => {
    // seat 0 all-in 50, seats 1+2 put in 200 each
    const pots = computeSidePots([
      { seatId: 0, committed: 50, folded: false },
      { seatId: 1, committed: 200, folded: false },
      { seatId: 2, committed: 200, folded: false },
    ]);
    // main pot: 50×3 = 150, eligible 0,1,2; side pot: 150×2 = 300, eligible 1,2
    expect(pots).toHaveLength(2);
    expect(pots[0]!.amount).toBe(150);
    expect(pots[0]!.eligibleSeatIds.sort()).toEqual([0, 1, 2]);
    expect(pots[1]!.amount).toBe(300);
    expect(pots[1]!.eligibleSeatIds.sort()).toEqual([1, 2]);
  });

  it('two all-ins at different amounts create three pots', () => {
    const pots = computeSidePots([
      { seatId: 0, committed: 50, folded: false },
      { seatId: 1, committed: 120, folded: false },
      { seatId: 2, committed: 300, folded: false },
    ]);
    // level 50: 50×3=150 elig {0,1,2}
    // level 120: 70×2 (seats1,2) + (seat0 already maxed at 50, contributes 0 more) = 140 elig {1,2}
    // level 300: 180×1 (seat2) + (seat1 maxed 120 contributes 0) = 180 elig {2}
    expect(pots).toHaveLength(3);
    expect(pots[0]).toEqual({ amount: 150, eligibleSeatIds: [0, 1, 2] });
    expect(pots[1]).toEqual({ amount: 140, eligibleSeatIds: [1, 2] });
    expect(pots[2]).toEqual({ amount: 180, eligibleSeatIds: [2] });
  });

  it('folded contributor stays in the pot but not eligible', () => {
    const pots = computeSidePots([
      { seatId: 0, committed: 100, folded: true },
      { seatId: 1, committed: 100, folded: false },
      { seatId: 2, committed: 100, folded: false },
    ]);
    expect(pots).toHaveLength(1);
    expect(pots[0]!.amount).toBe(300);
    expect(pots[0]!.eligibleSeatIds.sort()).toEqual([1, 2]);
  });

  it('empty contributions returns empty pots', () => {
    expect(computeSidePots([])).toEqual([]);
  });

  it('single player uncontested', () => {
    const pots = computeSidePots([{ seatId: 0, committed: 100, folded: false }]);
    expect(pots).toHaveLength(1);
    expect(pots[0]!.amount).toBe(100);
    expect(pots[0]!.eligibleSeatIds).toEqual([0]);
  });

  it('all-folded players roll chips into previous pot', () => {
    // seat 0 all-in 50 then folds (edge case — chips already in, eligible none at that level)
    // In practice this is seats 1,2 folding above seat 0's all-in level
    const pots = computeSidePots([
      { seatId: 0, committed: 100, folded: false },
      { seatId: 1, committed: 200, folded: true },
      { seatId: 2, committed: 200, folded: true },
    ]);
    // level 100: 100×3=300, eligible {0} (1 and 2 folded)
    // level 200: 100×2 from seats 1+2 = 200, eligible {} → rolled into prev pot
    expect(pots).toHaveLength(1);
    expect(pots[0]!.amount).toBe(500);
    expect(pots[0]!.eligibleSeatIds).toEqual([0]);
  });
});
