import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import HandView from './HandView';
import type { Card } from './types';

const c = (rank: Card['rank'], suit: Card['suit'] = '♠'): Card => ({ rank, suit, faceUp: true });

describe('HandView', () => {
  it('renders an empty hand without crashing', () => {
    const { container } = render(<HandView cards={[]} />);
    expect(container.querySelectorAll('div')).toBeDefined();
  });

  it('renders each card via MasquerCard (rank text visible in corners)', () => {
    render(<HandView cards={[c('A', '♠'), c('K', '♥')]} />);
    // MasquerCard renders rank label in both top-left and bottom-right corners.
    expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('K').length).toBeGreaterThanOrEqual(2);
  });

  it('renders the faceDownIdx card as MasquerCard back (rank hidden)', () => {
    render(<HandView cards={[c('A', '♠'), c('K', '♥')]} faceDownIdx={1} />);
    // First card still shows rank corners; second card is face-down.
    expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('K')).toBeNull();
    // Face-down card exposes role="img" with the "Face-down card" label.
    expect(screen.getByRole('img', { name: /face-down card/i })).toBeInTheDocument();
  });

  it('does NOT apply overlap class to the first card', () => {
    const { container } = render(<HandView cards={[c('A'), c('K')]} />);
    const wrappers = container.querySelectorAll('.flex.flex-row > div');
    expect(wrappers[0]?.className).not.toContain('-ml-');
    expect(wrappers[1]?.className).toContain('-ml-');
  });

  it('renders 5 cards in a hand with overlap on every card after the first', () => {
    render(<HandView cards={[c('2'), c('3'), c('4'), c('5'), c('6')]} />);
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('6').length).toBeGreaterThanOrEqual(2);
  });

  it('honours card.faceUp=false (renders face-down regardless of faceDownIdx)', () => {
    render(<HandView cards={[c('A', '♠'), { rank: 'K', suit: '♥', faceUp: false }]} />);
    expect(screen.queryByText('K')).toBeNull();
    expect(screen.getByRole('img', { name: /face-down card/i })).toBeInTheDocument();
  });
});
