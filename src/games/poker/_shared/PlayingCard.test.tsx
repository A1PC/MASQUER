import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlayingCard from './PlayingCard';

describe('PlayingCard (MasquerCard adapter)', () => {
  it('renders an Ace of spades face-up (poker rank 14 → brand rank 1)', () => {
    const { container } = render(<PlayingCard card={{ rank: 14, suit: 's' }} />);
    // Brand card renders rank "A" in the corner labels
    const aces = screen.getAllByText('A');
    expect(aces.length).toBeGreaterThanOrEqual(1);
    // Spade glyph appears at least once (centre + corners)
    const spades = screen.getAllByText('♠');
    expect(spades.length).toBeGreaterThanOrEqual(1);
    // Wrapper has data-playing-card
    expect(container.querySelector('[data-playing-card]')).toBeInTheDocument();
  });

  it('maps numeric ranks to face labels correctly (J/Q/K)', () => {
    const { rerender } = render(<PlayingCard card={{ rank: 11, suit: 'c' }} />);
    expect(screen.getAllByText('J').length).toBeGreaterThanOrEqual(1);
    rerender(<PlayingCard card={{ rank: 12, suit: 'd' }} />);
    expect(screen.getAllByText('Q').length).toBeGreaterThanOrEqual(1);
    rerender(<PlayingCard card={{ rank: 13, suit: 'h' }} />);
    expect(screen.getAllByText('K').length).toBeGreaterThanOrEqual(1);
  });

  it('renders face-down (Masquer mask back) when faceDown=true', () => {
    const { container } = render(<PlayingCard card={{ rank: 10, suit: 'c' }} faceDown />);
    expect(container.querySelector('[data-face-down]')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Face-down card"]')).toBeInTheDocument();
    // No "10" rank label visible
    expect(screen.queryByText('10')).not.toBeInTheDocument();
  });

  it('renders an empty placeholder slot when card=null and not faceDown', () => {
    const { container } = render(<PlayingCard card={null} />);
    expect(container.querySelector('[data-card-empty]')).toBeInTheDocument();
  });

  it('renders the brand face-down back when card=null AND faceDown', () => {
    const { container } = render(<PlayingCard card={null} faceDown />);
    expect(container.querySelector('[data-face-down]')).toBeInTheDocument();
  });

  it('adds data-highlight attribute on the wrapper when highlight=true', () => {
    const { container } = render(<PlayingCard card={{ rank: 5, suit: 'h' }} highlight />);
    const el = container.querySelector('[data-playing-card]') as HTMLElement;
    expect(el.hasAttribute('data-highlight')).toBe(true);
    expect(el.className).toContain('ring-2');
  });

  it('does NOT add data-highlight when highlight omitted', () => {
    const { container } = render(<PlayingCard card={{ rank: 5, suit: 'h' }} />);
    const el = container.querySelector('[data-playing-card]') as HTMLElement;
    expect(el.hasAttribute('data-highlight')).toBe(false);
  });

  it('renders different sizes without crashing', () => {
    const { rerender } = render(<PlayingCard card={{ rank: 9, suit: 's' }} size="hole" />);
    expect(screen.getAllByText('9').length).toBeGreaterThanOrEqual(1);
    rerender(<PlayingCard card={{ rank: 9, suit: 's' }} size="mini" />);
    expect(screen.getAllByText('9').length).toBeGreaterThanOrEqual(1);
    rerender(<PlayingCard card={{ rank: 9, suit: 's' }} size="table" />);
    expect(screen.getAllByText('9').length).toBeGreaterThanOrEqual(1);
  });
});
