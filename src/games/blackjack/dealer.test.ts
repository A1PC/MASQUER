import { describe, expect, it } from 'vitest';
import { dealerShouldHit } from './dealer';
import type { Card, Rank, Suit } from './types';

const card = (rank: Rank, suit: Suit = '♠', faceUp = true): Card => ({ rank, suit, faceUp });

describe('dealerShouldHit (H17 rule)', () => {
  it('hits on hard 16', () => {
    expect(dealerShouldHit([card('K'), card('6')])).toBe(true);
  });
  it('hits on hard 12', () => {
    expect(dealerShouldHit([card('7'), card('5')])).toBe(true);
  });
  it('stands on hard 17', () => {
    expect(dealerShouldHit([card('K'), card('7')])).toBe(false);
  });
  it('HITS on soft 17 (A-6) — the H17 rule', () => {
    expect(dealerShouldHit([card('A'), card('6')])).toBe(true);
  });
  it('HITS on soft 17 (A-2-4)', () => {
    expect(dealerShouldHit([card('A'), card('2'), card('4')])).toBe(true);
  });
  it('stands on soft 18 (A-7)', () => {
    expect(dealerShouldHit([card('A'), card('7')])).toBe(false);
  });
  it('stands on soft 19 (A-8)', () => {
    expect(dealerShouldHit([card('A'), card('8')])).toBe(false);
  });
  it('stands on hard 18', () => {
    expect(dealerShouldHit([card('K'), card('8')])).toBe(false);
  });
  it('stands on 21 natural', () => {
    expect(dealerShouldHit([card('A'), card('K')])).toBe(false);
  });
  it('stands on hard 20', () => {
    expect(dealerShouldHit([card('K'), card('J')])).toBe(false);
  });
});
