import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import StubGamePage from './StubGamePage';

describe('StubGamePage', () => {
  it.each([
    ['blackjack', 3, 'BLACKJACK'],
    ['roulette', 4, 'ROULETTE'],
    ['slots', 5, 'SLOTS'],
    ['baccarat', 6, 'BACCARAT'],
  ] as const)('renders %s stub for phase %i', (game, phase, label) => {
    render(
      <MemoryRouter>
        <StubGamePage game={game} phase={phase} />
      </MemoryRouter>,
    );
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(`Coming in Phase ${phase}`)).toBeInTheDocument();
  });

  it('has back-to-lobby and try-coin-flip links', () => {
    render(
      <MemoryRouter>
        <StubGamePage game="blackjack" phase={3} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Back to lobby/)).toBeInTheDocument();
    expect(screen.getByText(/Try Coin Flip/)).toBeInTheDocument();
  });
});
