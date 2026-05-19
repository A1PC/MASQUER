import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { bingoMachine } from './machine';
import { BINGO_CONFIG, findCellByValue } from './logic';

describe('bingoMachine — initial state', () => {
  it('starts in setup', () => {
    const actor = createActor(bingoMachine).start();
    expect(actor.getSnapshot().value).toBe('setup');
  });

  it('has empty initial context', () => {
    const actor = createActor(bingoMachine).start();
    const ctx = actor.getSnapshot().context;
    expect(ctx.cardCount).toBe(1);
    expect(ctx.speed).toBe('normal');
    expect(ctx.cards).toEqual([]);
    expect(ctx.betAmount).toBe(0);
    expect(ctx.callIndex).toBe(0);
    expect(ctx.daubMode).toBe('auto');
  });
});

describe('bingoMachine — BUY_AND_START transition', () => {
  it('transitions setup → awaiting_bet_handle on BUY_AND_START', () => {
    const actor = createActor(bingoMachine).start();
    actor.send({ type: 'BUY_AND_START', cardCount: 2, speed: 'fast' });
    expect(actor.getSnapshot().value).toBe('awaiting_bet_handle');
  });

  it('seeds context with cards, callSequence, and bet amount', () => {
    const actor = createActor(bingoMachine).start();
    actor.send({ type: 'BUY_AND_START', cardCount: 3, speed: 'slow' });
    const ctx = actor.getSnapshot().context;
    expect(ctx.cardCount).toBe(3);
    expect(ctx.speed).toBe('slow');
    expect(ctx.cards).toHaveLength(3);
    expect(ctx.callSequence).toHaveLength(90);
    expect(ctx.betAmount).toBe(3 * BINGO_CONFIG.CARD_COST);
    expect(ctx.callIndex).toBe(0);
  });
});

describe('bingoMachine — BET_PLACED transition', () => {
  it('transitions awaiting_bet_handle → playing on BET_PLACED', () => {
    const actor = createActor(bingoMachine).start();
    actor.send({ type: 'BUY_AND_START', cardCount: 1, speed: 'normal' });
    actor.send({ type: 'BET_PLACED', betHandleId: 'handle-1' });
    expect(actor.getSnapshot().value).toBe('playing');
    expect(actor.getSnapshot().context.betHandleId).toBe('handle-1');
  });
});

describe('bingoMachine — CALL handling (auto mode)', () => {
  it('CALL increments callIndex and daubs the called number on cards that have it', () => {
    const actor = createActor(bingoMachine).start();
    actor.send({ type: 'BUY_AND_START', cardCount: 1, speed: 'normal' });
    actor.send({ type: 'BET_PLACED', betHandleId: 'h-1' });
    const ctxBefore = actor.getSnapshot().context;
    const firstBall = ctxBefore.callSequence[0]!;
    actor.send({ type: 'CALL' });
    const ctxAfter = actor.getSnapshot().context;
    expect(ctxAfter.callIndex).toBe(1);
    const card = ctxAfter.cards[0]!.card;
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        if (card.cells[r]![c]!.value === firstBall) {
          expect(ctxAfter.cards[0]!.daubed[r]![c]).toBe(true);
        }
      }
    }
  });

  it('drives through CALLs and ends in settling once any card hits FH', () => {
    const actor = createActor(bingoMachine).start();
    actor.send({ type: 'BUY_AND_START', cardCount: 1, speed: 'normal' });
    actor.send({ type: 'BET_PLACED', betHandleId: 'h-1' });
    let safety = 100;
    while (actor.getSnapshot().value === 'playing' && safety-- > 0) {
      actor.send({ type: 'CALL' });
    }
    expect(actor.getSnapshot().value).toBe('settling');
    const wins = actor.getSnapshot().context.wins;
    expect(wins.some((w) => w.tier === 'full-house' || w.tier === 'fast-full-house')).toBe(true);
  });
});

describe('bingoMachine — settling → done → PLAY_AGAIN', () => {
  function drivePastSettle() {
    const actor = createActor(bingoMachine).start();
    actor.send({ type: 'BUY_AND_START', cardCount: 1, speed: 'normal' });
    actor.send({ type: 'BET_PLACED', betHandleId: 'h-1' });
    let safety = 100;
    while (actor.getSnapshot().value === 'playing' && safety-- > 0) {
      actor.send({ type: 'CALL' });
    }
    return actor;
  }

  it('SETTLED moves settling → done', () => {
    const actor = drivePastSettle();
    expect(actor.getSnapshot().value).toBe('settling');
    actor.send({ type: 'SETTLED' });
    expect(actor.getSnapshot().value).toBe('done');
  });

  it('PLAY_AGAIN moves done → setup with a fresh empty context', () => {
    const actor = drivePastSettle();
    actor.send({ type: 'SETTLED' });
    const oldGameId = actor.getSnapshot().context.gameId;
    actor.send({ type: 'PLAY_AGAIN' });
    const ctx = actor.getSnapshot().context;
    expect(actor.getSnapshot().value).toBe('setup');
    expect(ctx.gameId).not.toBe(oldGameId);
    expect(ctx.cards).toEqual([]);
    expect(ctx.callIndex).toBe(0);
    expect(ctx.wins).toEqual([]);
  });
});

describe('bingoMachine — TOGGLE_DAUB', () => {
  function startPlaying() {
    const actor = createActor(bingoMachine).start();
    actor.send({ type: 'BUY_AND_START', cardCount: 1, speed: 'normal' });
    actor.send({ type: 'BET_PLACED', betHandleId: 'h-1' });
    return actor;
  }

  it('TOGGLE_DAUB flips auto → manual without losing existing daubed cells', () => {
    const actor = startPlaying();
    // Call a few balls so some cells get auto-daubed
    actor.send({ type: 'CALL' });
    actor.send({ type: 'CALL' });
    const ctxBefore = actor.getSnapshot().context;
    // Capture the daubed state before toggling
    const daubedBefore = ctxBefore.cards[0]!.daubed.map((r) => [...r]);
    expect(ctxBefore.daubMode).toBe('auto');

    actor.send({ type: 'TOGGLE_DAUB' });
    const ctxAfter = actor.getSnapshot().context;
    expect(ctxAfter.daubMode).toBe('manual');
    // All previously daubed cells must still be daubed
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        if (daubedBefore[r]![c]) {
          expect(ctxAfter.cards[0]!.daubed[r]![c]).toBe(true);
        }
      }
    }
    // State should remain 'playing'
    expect(actor.getSnapshot().value).toBe('playing');
  });

  it('TOGGLE_DAUB manual → auto daubs all called-but-undaubed cells', () => {
    const actor = startPlaying();
    // Switch to manual first so calls don't auto-daub
    actor.send({ type: 'TOGGLE_DAUB' });
    expect(actor.getSnapshot().context.daubMode).toBe('manual');

    // Call several balls — in manual mode, cells are NOT auto-daubed
    actor.send({ type: 'CALL' });
    actor.send({ type: 'CALL' });
    actor.send({ type: 'CALL' });
    const ctxAfterCalls = actor.getSnapshot().context;

    // In manual mode no cells should be daubed (callIndex > 0 but daubed all false)
    const allUndaubed = ctxAfterCalls.cards[0]!.daubed.every((row) => row.every((d) => !d));
    expect(allUndaubed).toBe(true);
    expect(ctxAfterCalls.callIndex).toBeGreaterThan(0);

    // Now switch back to auto — should daub all called numbers present on the card
    actor.send({ type: 'TOGGLE_DAUB' });
    const ctxAfterToggle = actor.getSnapshot().context;
    expect(ctxAfterToggle.daubMode).toBe('auto');

    const card = ctxAfterToggle.cards[0]!.card;
    const calledNums = ctxAfterToggle.callSequence.slice(0, ctxAfterToggle.callIndex);
    for (const num of calledNums) {
      const pos = findCellByValue(card, num);
      if (pos) {
        expect(ctxAfterToggle.cards[0]!.daubed[pos.row]![pos.col]).toBe(true);
      }
    }
  });
});

describe('bingoMachine — MANUAL_DAUB', () => {
  function startPlayingManual() {
    const actor = createActor(bingoMachine).start();
    actor.send({ type: 'BUY_AND_START', cardCount: 1, speed: 'normal' });
    actor.send({ type: 'BET_PLACED', betHandleId: 'h-1' });
    // Switch to manual mode
    actor.send({ type: 'TOGGLE_DAUB' });
    return actor;
  }

  it('MANUAL_DAUB in manual mode daubs a called cell and records the daub', () => {
    const actor = startPlayingManual();
    // Call one ball
    actor.send({ type: 'CALL' });
    const ctx = actor.getSnapshot().context;
    const card = ctx.cards[0]!.card;
    const calledNum = ctx.callSequence[0]!;
    const pos = findCellByValue(card, calledNum);
    // Only proceed if the called number is on this card
    if (pos) {
      expect(ctx.cards[0]!.daubed[pos.row]![pos.col]).toBe(false);
      actor.send({ type: 'MANUAL_DAUB', cardId: card.id, row: pos.row, col: pos.col });
      const ctxAfter = actor.getSnapshot().context;
      expect(ctxAfter.cards[0]!.daubed[pos.row]![pos.col]).toBe(true);
    } else {
      // Number not on card — that's fine, still in playing state
      expect(actor.getSnapshot().value).toBe('playing');
    }
  });

  it('MANUAL_DAUB in auto mode is a no-op (action guard rejects)', () => {
    const actor = createActor(bingoMachine).start();
    actor.send({ type: 'BUY_AND_START', cardCount: 1, speed: 'normal' });
    actor.send({ type: 'BET_PLACED', betHandleId: 'h-1' });
    // Stay in auto mode — call one ball, try to manually daub it
    actor.send({ type: 'CALL' });
    const ctx = actor.getSnapshot().context;
    const card = ctx.cards[0]!.card;
    const calledNum = ctx.callSequence[0]!;
    const pos = findCellByValue(card, calledNum);
    if (pos) {
      // In auto mode the cell is already daubed; capture wins count
      const winsBefore = ctx.wins.length;
      const daubedBefore = ctx.cards[0]!.daubed[pos.row]![pos.col];
      actor.send({ type: 'MANUAL_DAUB', cardId: card.id, row: pos.row, col: pos.col });
      const ctxAfter = actor.getSnapshot().context;
      // manualDaub action is a no-op when daubMode === 'auto'
      expect(ctxAfter.wins.length).toBe(winsBefore);
      // daub state should be unchanged (already true in auto, stays true)
      expect(ctxAfter.cards[0]!.daubed[pos.row]![pos.col]).toBe(daubedBefore);
    } else {
      expect(actor.getSnapshot().value).toBe('playing');
    }
  });
});
