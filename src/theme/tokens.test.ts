import { describe, it, expect } from 'vitest';
import { colors, fonts, radius } from './tokens';

describe('Velvet Deco tokens', () => {
  it('exposes the core brand colours', () => {
    expect(colors.gold).toBe('#e6c068');
    expect(colors.velvet).toBe('#5a1320');
    expect(colors.ivory).toBe('#f2e7cc');
    expect(colors.porcelain).toBe('#ffffff');
  });
  it('win state is gold (winning glows gold)', () => {
    expect(colors.win).toBe(colors.gold);
  });
  it('body font is Montserrat, display leads with Cinzel Decorative', () => {
    expect(fonts.body[0]).toContain('Montserrat');
    expect(fonts.display[0]).toContain('Cinzel Decorative');
  });
  it('radius scale defined', () => {
    expect(radius.md).toBe('12px');
  });
});
