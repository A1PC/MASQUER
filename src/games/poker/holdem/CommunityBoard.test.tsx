import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CommunityBoard from './CommunityBoard';
import type { Card } from '../_shared/types';

const FIVE_CARDS: Card[] = [
  { rank: 14, suit: 's' },
  { rank: 13, suit: 'h' },
  { rank: 12, suit: 'd' },
  { rank: 11, suit: 'c' },
  { rank: 10, suit: 's' },
];

describe('CommunityBoard', () => {
  it('shows 0 board cards on preflop (5 placeholder slots)', () => {
    const { container } = render(<CommunityBoard board={FIVE_CARDS} street="preflop" pot={0} />);
    expect(container.querySelectorAll('[data-board-card]').length).toBe(0);
    expect(container.querySelectorAll('[data-board-slot]').length).toBe(5);
  });

  it('shows 3 board cards on flop', () => {
    const { container } = render(<CommunityBoard board={FIVE_CARDS} street="flop" pot={150} />);
    expect(container.querySelectorAll('[data-board-card]').length).toBe(3);
    expect(container.querySelectorAll('[data-board-slot]').length).toBe(2);
  });

  it('shows 4 board cards on turn', () => {
    const { container } = render(<CommunityBoard board={FIVE_CARDS} street="turn" pot={200} />);
    expect(container.querySelectorAll('[data-board-card]').length).toBe(4);
    expect(container.querySelectorAll('[data-board-slot]').length).toBe(1);
  });

  it('shows all 5 board cards on river', () => {
    const { container } = render(<CommunityBoard board={FIVE_CARDS} street="river" pot={300} />);
    expect(container.querySelectorAll('[data-board-card]').length).toBe(5);
    expect(container.querySelectorAll('[data-board-slot]').length).toBe(0);
  });

  it('displays pot amount', () => {
    render(<CommunityBoard board={FIVE_CARDS} street="flop" pot={450} />);
    expect(screen.getByText('POT: 450')).toBeInTheDocument();
  });

  it('highlights specified card indices', () => {
    const { container } = render(
      <CommunityBoard board={FIVE_CARDS} street="river" pot={100} highlightIndices={[0, 2]} />,
    );
    // data-highlight should appear on highlighted cards
    const highlighted = container.querySelectorAll('[data-highlight]');
    expect(highlighted.length).toBe(2);
  });
});
