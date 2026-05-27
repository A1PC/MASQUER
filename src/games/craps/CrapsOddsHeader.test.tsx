import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CrapsOddsHeader from './CrapsOddsHeader';

describe('CrapsOddsHeader', () => {
  it('renders Craps payout summary inside an OddsInfoBox', () => {
    const { container } = render(<CrapsOddsHeader />);
    expect(screen.getByText(/Pass\/Don't 1:1/)).toBeInTheDocument();
    expect(screen.getByText(/Hardways 7-9:1/)).toBeInTheDocument();
    const marker = container.querySelector('[data-craps-odds]');
    expect(marker).not.toBeNull();
  });
});
