import type { ReactNode } from 'react';
import type * as FramerMotion from 'framer-motion';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HandView from './HandView';
import type { Card } from '@/games/blackjack/types';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof FramerMotion>('framer-motion');
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

const cards: Card[] = [
  { rank: '3', suit: '♠', faceUp: true },
  { rank: '4', suit: '♥', faceUp: true },
];

function render_(node: ReactNode) {
  return render(<>{node}</>);
}

describe('HandView', () => {
  it('renders the label and running total of revealed cards', () => {
    render_(<HandView label="PLAYER" cards={cards} revealedCount={2} />);
    expect(screen.getByText('PLAYER')).toBeInTheDocument();
    // 3 + 4 = 7 → total 7 (rendered in the header, plus rank text in the
    // card corners — getAllByText covers either)
    expect(screen.getAllByText('7').length).toBeGreaterThan(0);
  });

  it('total only counts revealed cards', () => {
    render_(<HandView label="BANKER" cards={cards} revealedCount={1} />);
    // Only card[0] = 3 revealed → header total 3 (with rank-3 corners too).
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    // The 7 header total should NOT appear yet.
    expect(screen.queryByText('7')).toBeNull();
  });

  it('shows the DRAW pill when revealedCount < cards.length', () => {
    render_(<HandView label="PLAYER" cards={cards} revealedCount={1} />);
    expect(screen.getByText(/draw/i)).toBeInTheDocument();
  });

  it('hides the DRAW pill when all cards are revealed', () => {
    render_(<HandView label="PLAYER" cards={cards} revealedCount={2} />);
    expect(screen.queryByText(/draw/i)).toBeNull();
  });

  it('applies highlight styling when highlight=true', () => {
    const { container } = render_(
      <HandView label="PLAYER" cards={cards} revealedCount={2} highlight />,
    );
    expect(container.querySelector('.border-gold')).toBeInTheDocument();
  });

  it('sets the data-baccarat-hand attribute', () => {
    const { container } = render_(<HandView label="BANKER" cards={cards} revealedCount={2} />);
    expect(container.querySelector('[data-baccarat-hand="banker"]')).toBeInTheDocument();
  });
});
