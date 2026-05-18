import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type * as FramerMotion from 'framer-motion';
import CardReveal from './CardReveal';
import type { Card } from '@/games/blackjack/types';

// jsdom doesn't fire prefers-reduced-motion; MotionConfig alone doesn't
// propagate to useReducedMotion(). Force the hook to true so we exercise the
// reduced-motion path (synchronous reveal + onRevealDone via microtask).
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof FramerMotion>('framer-motion');
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

const SEVEN_SPADES: Card = { rank: '7', suit: '♠', faceUp: true };

function render_(node: ReactNode) {
  return render(<>{node}</>);
}

describe('CardReveal — reduced-motion path', () => {
  it('renders the card face-up immediately when revealed=true', () => {
    render_(<CardReveal card={SEVEN_SPADES} revealed={true} />);
    // Phase 3's Card renders the rank text in both corners.
    expect(screen.getAllByText('7').length).toBeGreaterThan(0);
  });

  it('renders the back when revealed=false', () => {
    render_(<CardReveal card={SEVEN_SPADES} revealed={false} />);
    // Card back hides the rank text.
    expect(screen.queryAllByText('7')).toHaveLength(0);
  });

  it('calls onRevealDone when revealed=true (microtask flush)', async () => {
    const cb = vi.fn();
    render_(<CardReveal card={SEVEN_SPADES} revealed={true} onRevealDone={cb} />);
    await new Promise((r) => setTimeout(r, 5));
    expect(cb).toHaveBeenCalled();
  });

  it('does NOT call onRevealDone when revealed=false', async () => {
    const cb = vi.fn();
    render_(<CardReveal card={SEVEN_SPADES} revealed={false} onRevealDone={cb} />);
    await new Promise((r) => setTimeout(r, 5));
    expect(cb).not.toHaveBeenCalled();
  });

  it('renders an empty slot when card is null', () => {
    const { container } = render_(<CardReveal card={null} revealed={false} />);
    expect(container.querySelector('div[aria-hidden="true"]')).toBeInTheDocument();
  });
});
