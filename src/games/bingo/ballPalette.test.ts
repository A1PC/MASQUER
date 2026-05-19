import { describe, it, expect } from 'vitest';
import { ballPaletteFor } from './ballPalette';

describe('ballPaletteFor - british', () => {
  it('1-9 white/cream', () => {
    const s = ballPaletteFor(5, 'british');
    expect(s.fill).toContain('fffaf0');
  });

  it('10-19 red', () => {
    expect(ballPaletteFor(15, 'british').fill).toContain('ff5050');
  });

  it('80-90 light grey', () => {
    expect(ballPaletteFor(85, 'british').fill).toContain('c0c0c0');
    expect(ballPaletteFor(90, 'british').fill).toContain('c0c0c0');
  });

  it('boundary values use the correct decile', () => {
    expect(ballPaletteFor(10, 'british').fill).toContain('ff5050'); // red, not white
    expect(ballPaletteFor(9, 'british').fill).toContain('fffaf0'); // white, not red
  });

  it('returns a radial gradient + ring + text color', () => {
    const s = ballPaletteFor(50, 'british');
    expect(s.fill).toMatch(/radial-gradient/);
    expect(s.ring).toBeDefined();
    expect(s.textColor).toBeDefined();
  });
});

describe('ballPaletteFor - american', () => {
  it('B column (1-15) red', () => {
    expect(ballPaletteFor(7, 'american').fill).toContain('ff5050');
  });

  it('I column (16-30) blue', () => {
    expect(ballPaletteFor(20, 'american').fill).toContain('5080d0');
  });

  it('N column (31-45) yellow', () => {
    expect(ballPaletteFor(35, 'american').fill).toContain('fff070');
  });

  it('G column (46-60) green', () => {
    expect(ballPaletteFor(50, 'american').fill).toContain('60d060');
  });

  it('O column (61-75) purple', () => {
    expect(ballPaletteFor(70, 'american').fill).toContain('a060c0');
  });
});
