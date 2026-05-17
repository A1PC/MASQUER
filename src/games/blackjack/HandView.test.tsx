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

  it('renders each card', () => {
    render(<HandView cards={[c('A', '♠'), c('K', '♥')]} />);
    expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('K').length).toBeGreaterThanOrEqual(2);
  });

  it('renders the faceDownIdx card as back (no rank visible)', () => {
    render(<HandView cards={[c('A', '♠'), c('K', '♥')]} faceDownIdx={1} />);
    expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('K')).toBeNull();
    expect(screen.getByText('LG')).toBeInTheDocument();
  });

  it('does NOT apply overlap class to the first card', () => {
    const { container } = render(<HandView cards={[c('A'), c('K')]} />);
    const wrappers = container.querySelectorAll('.flex.flex-row > div');
    expect(wrappers[0]?.className).not.toContain('-ml-8');
    expect(wrappers[1]?.className).toContain('-ml-8');
  });

  it('renders 5 cards in a hand with appropriate overlap', () => {
    render(<HandView cards={[c('2'), c('3'), c('4'), c('5'), c('6')]} />);
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('6').length).toBeGreaterThanOrEqual(2);
  });
});
