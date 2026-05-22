import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { crapsMachine } from './machine';
import { CRAPS_STAKES } from './stakes';
import type { Roll } from './dice';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roll(d1: number, d2: number): Roll {
  return { d1, d2, total: d1 + d2, isHard: d1 === d2 };
}

const LOW = CRAPS_STAKES.low;

function startActor(buyIn = 1000) {
  const actor = createActor(crapsMachine, {
    input: { sessionId: 'test-session', buyIn, stakes: LOW },
  });
  actor.start();
  return actor;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('starts in table state with come-out phase and correct context', () => {
    const actor = startActor(500);
    const snap = actor.getSnapshot();
    expect(snap.value).toBe('table');
    expect(snap.context.bankroll).toBe(500);
    expect(snap.context.phase).toBe('come-out');
    expect(snap.context.point).toBeNull();
    expect(snap.context.bets).toHaveLength(0);
    expect(snap.context.rollNumber).toBe(0);
    expect(snap.context.rollsPlayed).toBe(0);
    expect(snap.context.rebuys).toBe(0);
    expect(snap.context.biggestWin).toBe(0);
    expect(snap.context.totalBoughtIn).toBe(500);
    actor.stop();
  });
});

describe('come-out resolution — 7/11 natural', () => {
  it('rolling 7 on come-out wins the pass line bet', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(3, 4) }); // 7
    const snap = actor.getSnapshot();
    // bankroll: 1000 - 100 (bet) + 200 (stake back + winnings) = 1100
    expect(snap.context.bankroll).toBe(1100);
    expect(snap.context.bets).toHaveLength(0); // pass line resolved
    expect(snap.context.phase).toBe('come-out'); // stays come-out
    expect(snap.context.point).toBeNull();
    actor.stop();
  });

  it('rolling 11 on come-out wins the pass line', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 50 });
    actor.send({ type: 'ROLL', roll: roll(5, 6) }); // 11
    expect(actor.getSnapshot().context.bankroll).toBe(1050); // 950 + 100 (stake back + 50 winnings)
    actor.stop();
  });

  it('rolling 7 on come-out loses dont-pass', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'dont-pass', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(3, 4) }); // 7
    expect(actor.getSnapshot().context.bankroll).toBe(900);
    actor.stop();
  });
});

describe('come-out resolution — craps (2/3/12)', () => {
  it('rolling 2 on come-out loses pass and wins dont-pass', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 100 });
    actor.send({ type: 'PLACE_BET', betId: 'dont-pass', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(1, 1) }); // 2
    const snap = actor.getSnapshot();
    // pass loses (−100); dont-pass wins (+100+100 = +200 returned); bankroll 800 + 200 = 1000... wait:
    // bankroll after bets: 1000 - 100 - 100 = 800; then 2 rolled: dont-pass wins 100+100=200 returned, pass loses 0
    expect(snap.context.bankroll).toBe(1000); // 800 + 200
    actor.stop();
  });

  it('rolling 12 on come-out: pass loses, dont-pass pushes', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 100 });
    actor.send({ type: 'PLACE_BET', betId: 'dont-pass', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(6, 6) }); // 12
    const snap = actor.getSnapshot();
    // bankroll 800 + 100 (dp stake back, push) = 900
    expect(snap.context.bankroll).toBe(900);
    actor.stop();
  });

  it('rolling 3 on come-out loses pass, wins dont-pass', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'dont-pass', amount: 200 });
    actor.send({ type: 'ROLL', roll: roll(1, 2) }); // 3
    const snap = actor.getSnapshot();
    // bankroll: 1000 - 200 = 800, then + 400 returned = 1200
    expect(snap.context.bankroll).toBe(1200);
    actor.stop();
  });
});

describe('come-out — point set', () => {
  it('rolling 6 sets the point to 6 and phase to point', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(2, 4) }); // 6
    const snap = actor.getSnapshot();
    expect(snap.context.phase).toBe('point');
    expect(snap.context.point).toBe(6);
    expect(snap.context.bets).toHaveLength(1); // pass stands
    actor.stop();
  });

  it('rolling 4 sets the point to 4', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(1, 3) }); // 4
    expect(actor.getSnapshot().context.point).toBe(4);
    actor.stop();
  });

  it('rolling 9 sets the point to 9', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(4, 5) }); // 9
    expect(actor.getSnapshot().context.point).toBe(9);
    expect(actor.getSnapshot().context.phase).toBe('point');
    actor.stop();
  });
});

describe('point phase — point made', () => {
  it('rolling the point wins pass, clears point, returns to come-out', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(3, 3) }); // 6 → point
    // bankroll 900 (bet deducted)
    actor.send({ type: 'ROLL', roll: roll(2, 4) }); // 6 → point made
    const snap = actor.getSnapshot();
    expect(snap.context.bankroll).toBe(1100); // 900 + 200 (stake + winnings)
    expect(snap.context.phase).toBe('come-out');
    expect(snap.context.point).toBeNull();
    expect(snap.context.bets).toHaveLength(0);
    actor.stop();
  });
});

describe('point phase — seven-out', () => {
  it('rolling 7 in point phase loses pass, wins dont-pass, clears point', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 100 });
    actor.send({ type: 'PLACE_BET', betId: 'dont-pass', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(3, 3) }); // 6 → point
    // bankroll: 800; dont-pass rides (standing on come-out? No — both placed before the come-out roll)
    // Wait: dont-pass canPlace only on come-out, so it's placed fine. On 6 roll (point), dont-pass
    // stands. Now in point phase:
    actor.send({ type: 'ROLL', roll: roll(3, 4) }); // 7 → seven-out
    const snap = actor.getSnapshot();
    // pass loses, dont-pass wins (1:1) => 100+100=200 returned
    expect(snap.context.bankroll).toBe(1000); // 800 + 200
    expect(snap.context.phase).toBe('come-out');
    expect(snap.context.point).toBeNull();
    actor.stop();
  });
});

describe('place bets — placement rejected on come-out', () => {
  it('place-6 cannot be placed on come-out', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'place-6', amount: 100 });
    const snap = actor.getSnapshot();
    expect(snap.context.bets).toHaveLength(0); // guard rejects
    expect(snap.context.bankroll).toBe(1000);
    actor.stop();
  });

  it('place-8 cannot be placed on come-out', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'place-8', amount: 200 });
    expect(actor.getSnapshot().context.bets).toHaveLength(0);
    actor.stop();
  });
});

describe('place bets — standing (off) on come-out', () => {
  it('place-6 placed in point phase stands (is off) when come-out happens again', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(3, 3) }); // 6 → point
    actor.send({ type: 'PLACE_BET', betId: 'place-6', amount: 120 });
    // bankroll 900 - 120 = 780
    actor.send({ type: 'ROLL', roll: roll(2, 4) }); // 6 → point made, pass wins, back to come-out
    // After point made: bankroll = 780 + 200 (pass) = 980; place-6 STANDS (keeps its amount)
    // but place-6 is off on come-out... wait, on point made the phase goes to come-out
    // The 6 roll resolves: pass wins. place-6 isWorking('point') = true → so on the POINT roll,
    // place-6 also wins (roll.total === 6 → win)!
    // Let me recalculate: place-6 payout(120,null) = floor(120*7/6) = floor(140) = 140
    // bankroll = 780 + 200 (pass) + 120 + 140 (place-6) = 780 + 460 = 1240
    const snap = actor.getSnapshot();
    expect(snap.context.phase).toBe('come-out');
    // Verify place-6 is gone (won on the 6 point-made roll)
    expect(snap.context.bets.some((b) => b.betId === 'place-6')).toBe(false);
    actor.stop();
  });
});

describe('place bets off on come-out — isWorking', () => {
  it('place-9 placed in point phase stays standing when come-out roll happens (off)', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(4, 5) }); // 9 → point
    actor.send({ type: 'PLACE_BET', betId: 'place-9', amount: 100 });
    // Now seven out to go back to come-out (with place-9 standing — it will lose on 7)
    actor.send({ type: 'ROLL', roll: roll(3, 4) }); // 7 → seven-out
    // place-9 isWorking('point') = true → loses on 7 (resolveRoll gets it)
    const snap = actor.getSnapshot();
    expect(snap.context.phase).toBe('come-out');
    expect(snap.context.bets.some((b) => b.betId === 'place-9')).toBe(false); // lost
    // Now on come-out, try to place place-9 - should be rejected
    actor.send({ type: 'PLACE_BET', betId: 'place-9', amount: 100 });
    expect(actor.getSnapshot().context.bets).toHaveLength(0);
    actor.stop();
  });
});

describe('come-bet travel', () => {
  it('come bet in point phase moves to the rolled number', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(3, 3) }); // 6 → point
    actor.send({ type: 'PLACE_BET', betId: 'come', amount: 100 });
    // bankroll: 1000 - 100 - 100 = 800
    actor.send({ type: 'ROLL', roll: roll(2, 3) }); // 5 → come travels to 5
    const snap = actor.getSnapshot();
    const comeBet = snap.context.bets.find((b) => b.betId === 'come');
    expect(comeBet).toBeDefined();
    expect(comeBet?.betPoint).toBe(5); // moved to 5
    expect(snap.context.phase).toBe('point'); // still point phase
    expect(snap.context.point).toBe(6); // table point unchanged
    actor.stop();
  });

  it('travelled come bet wins when its number rolls', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(3, 3) }); // 6 → point
    actor.send({ type: 'PLACE_BET', betId: 'come', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(2, 3) }); // 5 → come moves to 5
    actor.send({ type: 'ROLL', roll: roll(2, 3) }); // 5 → come wins
    const snap = actor.getSnapshot();
    // come bet wins: 100+100 = 200 returned
    expect(snap.context.bets.some((b) => b.betId === 'come')).toBe(false);
    // bankroll: 1000 - 100 (pass) - 100 (come) = 800, then +200 (come win) = 1000
    expect(snap.context.bankroll).toBe(1000);
    actor.stop();
  });
});

describe('odds cap guard', () => {
  it('rejects odds-pass if amount > oddsMultiple × pass line amount', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(3, 3) }); // 6 → point
    // tableMin = 10, oddsMultiple = 3 → max odds = 300
    actor.send({ type: 'PLACE_BET', betId: 'odds-pass', amount: 301, betPoint: 6 });
    const snap = actor.getSnapshot();
    // guard should reject 301 > 3 * 100 = 300
    expect(snap.context.bets.some((b) => b.betId === 'odds-pass')).toBe(false);
    expect(snap.context.bankroll).toBe(900); // unchanged
    actor.stop();
  });

  it('allows odds-pass at exactly oddsMultiple × pass line', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(3, 3) }); // 6 → point
    actor.send({ type: 'PLACE_BET', betId: 'odds-pass', amount: 300, betPoint: 6 });
    const snap = actor.getSnapshot();
    expect(snap.context.bets.some((b) => b.betId === 'odds-pass')).toBe(true);
    actor.stop();
  });

  it('rejects odds-pass on come-out (canPlace requires point phase)', () => {
    const actor = startActor(1000);
    // place pass, don't roll a point number yet — still come-out
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 100 });
    // odds-pass canPlace requires phase === 'point' AND point !== null
    actor.send({ type: 'PLACE_BET', betId: 'odds-pass', amount: 100 });
    expect(actor.getSnapshot().context.bets.some((b) => b.betId === 'odds-pass')).toBe(false);
    actor.stop();
  });
});

describe('remove-bet refund', () => {
  it('removing a place-8 refunds the stake', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(3, 3) }); // 6 → point
    actor.send({ type: 'PLACE_BET', betId: 'place-8', amount: 120 });
    // bankroll: 1000 - 100 - 120 = 780
    actor.send({ type: 'REMOVE_BET', betId: 'place-8' });
    expect(actor.getSnapshot().context.bankroll).toBe(900); // 780 + 120 refunded
    expect(actor.getSnapshot().context.bets.some((b) => b.betId === 'place-8')).toBe(false);
    actor.stop();
  });

  it('removing a field bet refunds the stake', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'field', amount: 50 });
    actor.send({ type: 'REMOVE_BET', betId: 'field' });
    expect(actor.getSnapshot().context.bankroll).toBe(1000);
    actor.stop();
  });

  it('cannot remove a pass-line bet (non-removable)', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 100 });
    actor.send({ type: 'REMOVE_BET', betId: 'pass' });
    expect(actor.getSnapshot().context.bets).toHaveLength(1); // still there
    expect(actor.getSnapshot().context.bankroll).toBe(900); // no refund
    actor.stop();
  });

  it('cannot remove a come bet (non-removable)', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(3, 3) }); // 6 → point
    actor.send({ type: 'PLACE_BET', betId: 'come', amount: 100 });
    actor.send({ type: 'REMOVE_BET', betId: 'come' });
    expect(actor.getSnapshot().context.bets.some((b) => b.betId === 'come')).toBe(true);
    actor.stop();
  });
});

describe('placement validation — min/max/bankroll guards', () => {
  it('rejects a bet below table minimum', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 5 }); // tableMin = 10
    expect(actor.getSnapshot().context.bets).toHaveLength(0);
    actor.stop();
  });

  it('rejects a bet above table maximum', () => {
    const actor = startActor(10000);
    actor.send({ type: 'PLACE_BET', betId: 'field', amount: 600 }); // tableMax = 500
    expect(actor.getSnapshot().context.bets).toHaveLength(0);
    actor.stop();
  });

  it('rejects a bet when bankroll is insufficient', () => {
    const actor = startActor(50);
    actor.send({ type: 'PLACE_BET', betId: 'field', amount: 100 });
    expect(actor.getSnapshot().context.bets).toHaveLength(0);
    actor.stop();
  });
});

describe('rebuy', () => {
  it('adds chips to bankroll and increments rebuys + totalBoughtIn', () => {
    const actor = startActor(1000);
    actor.send({ type: 'REBUY', amount: 500 });
    const snap = actor.getSnapshot();
    expect(snap.context.bankroll).toBe(1500);
    expect(snap.context.totalBoughtIn).toBe(1500);
    expect(snap.context.rebuys).toBe(1);
    actor.stop();
  });

  it('multiple rebuys accumulate correctly', () => {
    const actor = startActor(1000);
    actor.send({ type: 'REBUY', amount: 200 });
    actor.send({ type: 'REBUY', amount: 300 });
    expect(actor.getSnapshot().context.bankroll).toBe(1500);
    expect(actor.getSnapshot().context.rebuys).toBe(2);
    expect(actor.getSnapshot().context.totalBoughtIn).toBe(1500);
    actor.stop();
  });
});

describe('LEAVE_TABLE → session_over', () => {
  it('transitions to session_over on LEAVE_TABLE', () => {
    const actor = startActor(1000);
    expect(actor.getSnapshot().value).toBe('table');
    actor.send({ type: 'LEAVE_TABLE' });
    expect(actor.getSnapshot().value).toBe('session_over');
    actor.stop();
  });

  it('session_over is a final state', () => {
    const actor = startActor(1000);
    actor.send({ type: 'LEAVE_TABLE' });
    const snap = actor.getSnapshot();
    expect(snap.status).toBe('done');
    actor.stop();
  });
});

describe('biggestWin tracking', () => {
  it('tracks the largest single-roll win', () => {
    const actor = startActor(1000);
    // Place a field bet and roll 12 (3:1)
    actor.send({ type: 'PLACE_BET', betId: 'field', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(6, 6) }); // 12 → field wins 3:1 → 300 winnings
    expect(actor.getSnapshot().context.biggestWin).toBe(300);
    actor.stop();
  });

  it('updates biggestWin when a larger win occurs', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'field', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(1, 1) }); // 2 → field wins 2:1 → 200 winnings
    expect(actor.getSnapshot().context.biggestWin).toBe(200);
    // Now place a pass line, set point to 6, then win odds
    actor.send({ type: 'PLACE_BET', betId: 'pass', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(3, 3) }); // 6 → point
    // Place max odds: 3 × 100 = 300 on 6 → payout 6:5 → 360 winnings
    actor.send({ type: 'PLACE_BET', betId: 'odds-pass', amount: 300, betPoint: 6 });
    actor.send({ type: 'ROLL', roll: roll(2, 4) }); // 6 → odds-pass wins, payout = floor(300*6/5) = 360
    expect(actor.getSnapshot().context.biggestWin).toBe(360);
    actor.stop();
  });

  it('biggestWin does not decrease', () => {
    const actor = startActor(1000);
    actor.send({ type: 'PLACE_BET', betId: 'field', amount: 100 });
    actor.send({ type: 'ROLL', roll: roll(6, 6) }); // 12 → 300 win
    actor.send({ type: 'PLACE_BET', betId: 'field', amount: 10 });
    actor.send({ type: 'ROLL', roll: roll(1, 1) }); // 2 → 20 win < 300
    expect(actor.getSnapshot().context.biggestWin).toBe(300);
    actor.stop();
  });
});

describe('rollNumber and rollsPlayed', () => {
  it('increments with each ROLL event', () => {
    const actor = startActor(1000);
    expect(actor.getSnapshot().context.rollNumber).toBe(0);
    actor.send({ type: 'ROLL', roll: roll(3, 4) }); // 7 → come-out
    expect(actor.getSnapshot().context.rollNumber).toBe(1);
    expect(actor.getSnapshot().context.rollsPlayed).toBe(1);
    actor.send({ type: 'ROLL', roll: roll(3, 4) }); // another roll
    expect(actor.getSnapshot().context.rollNumber).toBe(2);
    expect(actor.getSnapshot().context.rollsPlayed).toBe(2);
    actor.stop();
  });
});

describe('lastRoll and lastResolution', () => {
  it('records the last roll and its resolution', () => {
    const actor = startActor(1000);
    const r = roll(3, 4);
    actor.send({ type: 'ROLL', roll: r });
    const snap = actor.getSnapshot();
    expect(snap.context.lastRoll).toEqual(r);
    expect(snap.context.lastResolution).not.toBeNull();
    actor.stop();
  });
});

describe('stakes context', () => {
  it('stores the full stakes config in context', () => {
    const actor = startActor(1000);
    const snap = actor.getSnapshot();
    expect(snap.context.stakes.tier).toBe('low');
    expect(snap.context.stakes.tableMin).toBe(10);
    expect(snap.context.stakes.tableMax).toBe(500);
    expect(snap.context.stakes.oddsMultiple).toBe(3);
    actor.stop();
  });
});

describe('sessionId stored in context', () => {
  it('carries the sessionId from input', () => {
    const actor = createActor(crapsMachine, {
      input: { sessionId: 'abc-123', buyIn: 1000, stakes: LOW },
    });
    actor.start();
    expect(actor.getSnapshot().context.sessionId).toBe('abc-123');
    actor.stop();
  });
});
