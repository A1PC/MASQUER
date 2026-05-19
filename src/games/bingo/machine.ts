// STUB: machine.ts is intentionally minimal for PR A.
// PR B will rewrite this for the competitive multi-player machine.
import { setup } from 'xstate';

// Placeholder context and events — PR B replaces entirely.
export interface BingoContext {
  _placeholder: true;
}

export type BingoEvent = { type: 'PLACEHOLDER' };

export const bingoMachine = setup({
  types: {
    context: {} as BingoContext,
    events: {} as BingoEvent,
  },
}).createMachine({
  id: 'bingo',
  initial: 'idle',
  context: { _placeholder: true },
  states: {
    idle: {},
  },
});
