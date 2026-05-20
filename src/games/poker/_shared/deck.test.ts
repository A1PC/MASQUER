import { describe, it, expect } from 'vitest';
import { freshDeck, deckFromSeed } from './deck';

describe('freshDeck', () => {
  it('has 52 unique cards', () => {
    const d = freshDeck();
    expect(d).toHaveLength(52);
    const keys = new Set(d.map((c) => `${c.rank}${c.suit}`));
    expect(keys.size).toBe(52);
  });
});

describe('deckFromSeed', () => {
  it('is deterministic for a given seed', () => {
    expect(deckFromSeed('s.1')).toEqual(deckFromSeed('s.1'));
  });
  it('differs across seeds', () => {
    expect(deckFromSeed('s.1')).not.toEqual(deckFromSeed('s.2'));
  });
  it('is a permutation of freshDeck (52 unique)', () => {
    const d = deckFromSeed('x');
    expect(d).toHaveLength(52);
    expect(new Set(d.map((c) => `${c.rank}${c.suit}`)).size).toBe(52);
  });
});
