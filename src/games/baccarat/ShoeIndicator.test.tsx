import type { ReactNode } from 'react';
import type * as FramerMotion from 'framer-motion';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShoeIndicator from './ShoeIndicator';
import type { ShoeState } from './types';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof FramerMotion>('framer-motion');
  return { ...actual, useReducedMotion: () => true };
});

function shoe(overrides: Partial<ShoeState>): ShoeState {
  return {
    cards: Array.from({ length: 416 }, () => ({
      rank: '2' as const,
      suit: '♠' as const,
      faceUp: true,
    })),
    initialSize: 416,
    cutPosition: 400,
    cutCardPassed: false,
    ...overrides,
  };
}

function render_(node: ReactNode) {
  return render(<>{node}</>);
}

describe('ShoeIndicator', () => {
  it('shows depth + cards-to-cut by default', () => {
    render_(<ShoeIndicator shoe={shoe({})} freshShoeBanner={false} />);
    expect(screen.getByText(/Shoe: 416 cards/i)).toBeInTheDocument();
    expect(screen.getByText(/cut in 400/i)).toBeInTheDocument();
  });

  it('clamps cards-to-cut to 0 when negative', () => {
    render_(<ShoeIndicator shoe={shoe({ cards: [], cutPosition: 100 })} freshShoeBanner={false} />);
    expect(screen.getByText(/cut in 0/i)).toBeInTheDocument();
  });

  it('shows CUT banner when cutCardPassed=true', () => {
    render_(<ShoeIndicator shoe={shoe({ cutCardPassed: true })} freshShoeBanner={false} />);
    expect(screen.getByText(/cut — reshuffling/i)).toBeInTheDocument();
  });

  it('shows FRESH SHOE banner when freshShoeBanner=true', () => {
    render_(<ShoeIndicator shoe={shoe({})} freshShoeBanner={true} />);
    expect(screen.getByText(/fresh shoe/i)).toBeInTheDocument();
  });
});
