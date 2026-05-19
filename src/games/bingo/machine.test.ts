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
