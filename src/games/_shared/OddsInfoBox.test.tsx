import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import OddsInfoBox from './OddsInfoBox';

describe('OddsInfoBox', () => {
  it('renders the default "ODDS & PAYOUTS" title', () => {
    render(<OddsInfoBox>Win 1:1</OddsInfoBox>);
    expect(screen.getByRole('heading', { name: /odds & payouts/i })).toBeInTheDocument();
  });

  it('renders the provided body content', () => {
    render(<OddsInfoBox>Blackjack 3:2 · Win 1:1</OddsInfoBox>);
    expect(screen.getByText(/Blackjack 3:2 · Win 1:1/)).toBeInTheDocument();
  });

  it('respects a custom title prop', () => {
    render(<OddsInfoBox title="HOUSE EDGE">0%</OddsInfoBox>);
    expect(screen.getByRole('heading', { name: /house edge/i })).toBeInTheDocument();
  });

  it('omits the title heading when title is null', () => {
    render(<OddsInfoBox title={null}>Win 1:1</OddsInfoBox>);
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('exposes itself as an aria-labelled group', () => {
    render(<OddsInfoBox>Win 1:1</OddsInfoBox>);
    expect(screen.getByRole('group', { name: /odds & payouts/i })).toBeInTheDocument();
  });

  it('caps width at 480px so long payout strings wrap rather than stretch', () => {
    render(
      <OddsInfoBox>
        Straight 35:1 · Split 17:1 · Street 11:1 · Corner 8:1 · Six-line 5:1 · Column 2:1 · Dozen
        2:1 · Red/Black/Odd/Even/Low/High 1:1
      </OddsInfoBox>,
    );
    // Tailwind compiles `max-w-[480px]` to a literal class on the wrapper —
    // assert via className rather than getComputedStyle (jsdom doesn't load
    // the Tailwind stylesheet, so style-based checks would be flaky).
    const group = screen.getByRole('group', { name: /odds & payouts/i });
    expect(group.className).toMatch(/max-w-\[480px\]/);
  });
});
