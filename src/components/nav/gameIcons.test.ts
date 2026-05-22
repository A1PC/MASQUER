import { describe, it, expect } from 'vitest';
import { icons } from 'lucide-react';
import { NAV_ICON } from './gameIcons';

describe('NAV_ICON', () => {
  it('maps every nav key to a real lucide icon', () => {
    for (const [key, name] of Object.entries(NAV_ICON)) {
      expect(icons[name], `${key} → ${name}`).toBeDefined();
    }
  });
  it('covers the games + you-section routes', () => {
    for (const k of [
      'lobby',
      'coin-flip',
      'blackjack',
      'roulette',
      'slots',
      'baccarat',
      'bingo',
      'plinko',
      'poker',
      'craps',
      'lottery',
      'stats',
      'leaderboard',
      'settings',
    ])
      expect(NAV_ICON[k]).toBeDefined();
  });
});
