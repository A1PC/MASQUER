import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { bingoMachine } from './machine';
import { BINGO_CONFIG } from './logic';

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
