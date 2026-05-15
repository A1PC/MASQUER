import { describe, expect, it } from 'vitest';
import { AVATAR_PALETTE, pickRandomAvatarColor } from './avatar';

describe('avatar', () => {
  it('AVATAR_PALETTE has 10 distinct colors', () => {
    expect(AVATAR_PALETTE).toHaveLength(10);
    expect(new Set(AVATAR_PALETTE).size).toBe(10);
  });

  it('every entry is a 7-character hex code', () => {
    for (const color of AVATAR_PALETTE) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('pickRandomAvatarColor returns a color from the palette', () => {
    for (let i = 0; i < 50; i++) {
      const color = pickRandomAvatarColor();
      expect(AVATAR_PALETTE).toContain(color);
    }
  });

  it('pickRandomAvatarColor produces variety over many calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(pickRandomAvatarColor());
    }
    // With 10 colors and 200 picks, we should hit at least 5 unique values
    // (probability of fewer is astronomically small).
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });
});
