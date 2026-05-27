import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PokerOddsHeader from './PokerOddsHeader';

describe('PokerOddsHeader', () => {
  it("renders Hold'em copy when variant=holdem", () => {
    const { container } = render(<PokerOddsHeader variant="holdem" />);
    expect(screen.getByText(/No-Limit Hold'em/)).toBeInTheDocument();
    const el = container.querySelector('[data-poker-odds-variant]') as HTMLElement;
    expect(el.getAttribute('data-poker-odds-variant')).toBe('holdem');
  });

  it('renders Draw copy when variant=five-card-draw', () => {
    const { container } = render(<PokerOddsHeader variant="five-card-draw" />);
    expect(screen.getByText(/No-Limit Five-Card Draw/)).toBeInTheDocument();
    const el = container.querySelector('[data-poker-odds-variant]') as HTMLElement;
    expect(el.getAttribute('data-poker-odds-variant')).toBe('five-card-draw');
  });

  it('renders Omaha copy when variant=omaha', () => {
    const { container } = render(<PokerOddsHeader variant="omaha" />);
    expect(screen.getByText(/No-Limit Omaha/)).toBeInTheDocument();
    const el = container.querySelector('[data-poker-odds-variant]') as HTMLElement;
    expect(el.getAttribute('data-poker-odds-variant')).toBe('omaha');
  });
});
