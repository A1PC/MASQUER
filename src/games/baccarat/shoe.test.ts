import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  build8DeckShoe,
  cardsToCut,
  drawFromShoe,
  markCutIfPassed,
  shouldReshuffleBeforeNextRound,
} from './shoe';
import { CUT_CARD_RANGE_FROM_END, DECKS_PER_SHOE } from './config';
import { seed, unseed } from '@/systems/rng';

describe('build8DeckShoe', () => {
  beforeEach(() => seed(12345));
  afterEach(() => unseed());

  it('builds 416 cards (8 decks × 52)', () => {
    const s = build8DeckShoe();
    expect(s.cards.length).toBe(DECKS_PER_SHOE * 52);
    expect(s.initialSize).toBe(DECKS_PER_SHOE * 52);
  });

  it('cut position falls in [initialSize - rangeMax, initialSize - rangeMin]', () => {
    const s = build8DeckShoe();
    const min = s.initialSize - CUT_CARD_RANGE_FROM_END.max;
    const max = s.initialSize - CUT_CARD_RANGE_FROM_END.min;
    expect(s.cutPosition).toBeGreaterThanOrEqual(min);
    expect(s.cutPosition).toBeLessThanOrEqual(max);
  });

  it('starts with cutCardPassed = false', () => {
    expect(build8DeckShoe().cutCardPassed).toBe(false);
  });

  it('different RNG seeds produce different shuffles', () => {
    seed(1);
    const a = build8DeckShoe();
    seed(2);
    const b = build8DeckShoe();
    expect(a.cards).not.toEqual(b.cards);
  });
});

describe('drawFromShoe', () => {
  beforeEach(() => seed(12345));
  afterEach(() => unseed());

  it('returns next card + shoe with one less card', () => {
    const s0 = build8DeckShoe();
    const { card, shoe: s1 } = drawFromShoe(s0);
    expect(card).toBeDefined();
    expect(s1.cards.length).toBe(s0.cards.length - 1);
    expect(card).toEqual(s0.cards[0]);
  });

  it('throws when shoe is empty', () => {
    const empty = { ...build8DeckShoe(), cards: [] };
    expect(() => drawFromShoe(empty)).toThrow(/empty/);
  });
});

describe('markCutIfPassed + shouldReshuffleBeforeNextRound', () => {
  beforeEach(() => seed(12345));
  afterEach(() => unseed());

  it('does nothing when fewer cards dealt than cutPosition', () => {
    let s = build8DeckShoe();
    for (let i = 0; i < 4; i++) s = drawFromShoe(s).shoe;
    s = markCutIfPassed(s);
    expect(s.cutCardPassed).toBe(false);
    expect(shouldReshuffleBeforeNextRound(s)).toBe(false);
  });

  it('marks cutCardPassed once dealt count reaches cutPosition', () => {
    let s = build8DeckShoe();
    while (s.initialSize - s.cards.length < s.cutPosition) {
      s = drawFromShoe(s).shoe;
    }
    s = markCutIfPassed(s);
    expect(s.cutCardPassed).toBe(true);
    expect(shouldReshuffleBeforeNextRound(s)).toBe(true);
  });

  it('markCutIfPassed is idempotent', () => {
    let s = build8DeckShoe();
    while (s.initialSize - s.cards.length < s.cutPosition) {
      s = drawFromShoe(s).shoe;
    }
    const once = markCutIfPassed(s);
    const twice = markCutIfPassed(once);
    expect(twice).toBe(once);
  });
});

describe('cardsToCut', () => {
  beforeEach(() => seed(12345));
  afterEach(() => unseed());

  it('returns cutPosition when no cards drawn', () => {
    const s = build8DeckShoe();
    expect(cardsToCut(s)).toBe(s.cutPosition);
  });

  it('counts down as cards are drawn', () => {
    let s = build8DeckShoe();
    const initial = cardsToCut(s);
    for (let i = 0; i < 5; i++) s = drawFromShoe(s).shoe;
    expect(cardsToCut(s)).toBe(initial - 5);
  });

  it('goes negative once cut is crossed', () => {
    let s = build8DeckShoe();
    while (s.initialSize - s.cards.length < s.cutPosition + 3) {
      s = drawFromShoe(s).shoe;
    }
    expect(cardsToCut(s)).toBe(-3);
  });
});
