import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlayingCard from './PlayingCard';

describe('PlayingCard', () => {
  it('renders rank and suit glyph for a face-up card', () => {
    render(<PlayingCard card={{ rank: 14, suit: 's' }} />);
    // A is rendered in both corner positions
    const aces = screen.getAllByText('A');
    expect(aces.length).toBeGreaterThanOrEqual(1);
    const spades = screen.getAllByText('♠');
    expect(spades.length).toBeGreaterThanOrEqual(1);
  });

  it('maps numeric ranks to face labels correctly', () => {
    const { rerender } = render(<PlayingCard card={{ rank: 11, suit: 'c' }} />);
    expect(screen.getAllByText('J').length).toBeGreaterThanOrEqual(1);
    rerender(<PlayingCard card={{ rank: 12, suit: 'd' }} />);
    expect(screen.getAllByText('Q').length).toBeGreaterThanOrEqual(1);
    rerender(<PlayingCard card={{ rank: 13, suit: 'h' }} />);
    expect(screen.getAllByText('K').length).toBeGreaterThanOrEqual(1);
  });

  it('renders red suit glyphs for diamonds and hearts', () => {
    const { container } = render(<PlayingCard card={{ rank: 7, suit: 'd' }} />);
    const cardEl = container.querySelector('[data-playing-card]') as HTMLElement;
    expect(cardEl.className).toContain('text-casino-red');
  });

  it('renders the pinstripe back (no rank) when faceDown=true', () => {
    const { container } = render(<PlayingCard card={{ rank: 10, suit: 'c' }} faceDown />);
    expect(container.querySelector('[data-face-down]')).toBeInTheDocument();
    expect(screen.queryByText('10')).not.toBeInTheDocument();
    expect(screen.getByText('LG')).toBeInTheDocument();
  });

  it('renders the back when card is null', () => {
    const { container } = render(<PlayingCard card={null} />);
    expect(container.querySelector('[data-face-down]')).toBeInTheDocument();
    expect(screen.getByText('LG')).toBeInTheDocument();
  });

  it('adds data-highlight attribute when highlight=true', () => {
    const { container } = render(<PlayingCard card={{ rank: 5, suit: 'h' }} highlight />);
    const el = container.querySelector('[data-playing-card]') as HTMLElement;
    expect(el.hasAttribute('data-highlight')).toBe(true);
  });

  it('does NOT add data-highlight attribute when highlight is omitted', () => {
    const { container } = render(<PlayingCard card={{ rank: 5, suit: 'h' }} />);
    const el = container.querySelector('[data-playing-card]') as HTMLElement;
    expect(el.hasAttribute('data-highlight')).toBe(false);
  });

  it('renders different sizes without crashing', () => {
    const { rerender } = render(<PlayingCard card={{ rank: 9, suit: 's' }} size="hole" />);
    expect(screen.getAllByText('9').length).toBeGreaterThanOrEqual(1);
    rerender(<PlayingCard card={{ rank: 9, suit: 's' }} size="mini" />);
    expect(screen.getAllByText('9').length).toBeGreaterThanOrEqual(1);
  });
});
