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
});
