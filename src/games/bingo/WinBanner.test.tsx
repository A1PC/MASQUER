import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type * as FramerMotion from 'framer-motion';
import WinBanner from './WinBanner';

describe('WinBanner', () => {
  it.each([
    ['1-line', 'LINE!'],
    ['2-line', 'DOUBLE LINE!'],
    ['full-house', 'BINGO!'],
    ['fast-full-house', 'FAST BINGO!'],
  ] as const)('renders %s tier as "%s"', (tier, text) => {
    render(<WinBanner tier={tier} cardId="c-1" />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('exposes data-tier and data-card-id attributes', () => {
    const { container } = render(<WinBanner tier="full-house" cardId="my-card" />);
    const banner = container.querySelector('[data-win-banner]');
    expect(banner).toHaveAttribute('data-tier', 'full-house');
    expect(banner).toHaveAttribute('data-card-id', 'my-card');
  });
});

describe('WinBanner — reduced motion', () => {
  it('still renders the tier text when reduced motion is on', async () => {
    vi.resetModules();
    vi.doMock('framer-motion', async () => {
      const actual = await vi.importActual<typeof FramerMotion>('framer-motion');
      return { ...actual, useReducedMotion: () => true };
    });
    const { default: ReducedWinBanner } = await import('./WinBanner');
    render(<ReducedWinBanner tier="fast-full-house" cardId="c-1" />);
    expect(screen.getByText('FAST BINGO!')).toBeInTheDocument();
  });
});
