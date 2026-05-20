import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import EndScreen from './EndScreen';
import type { HistoryEntry } from './machine';

function e(
  bet: number,
  payout: number,
  multiplier: number,
  bin = 10,
  ballId = `b-${crypto.randomUUID()}`,
): HistoryEntry {
  return { ballId, risk: 'low', bin, multiplier, bet, payout };
}

describe('EndScreen', () => {
  it('completed shows correct label + DROP MORE / BACK TO LOBBY', () => {
    render(
      <MemoryRouter>
        <EndScreen reason="completed" entries={[e(50, 75, 1.5)]} onPlayMore={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/AUTO SESSION COMPLETE/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /DROP MORE/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /BACK TO LOBBY/ })).toBeInTheDocument();
  });

  it('insufficient-chips shows the right label', () => {
    render(
      <MemoryRouter>
        <EndScreen reason="insufficient-chips" entries={[]} onPlayMore={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/INSUFFICIENT CHIPS/)).toBeInTheDocument();
  });

  it('aggregates stake, payout, net correctly', () => {
    render(
      <MemoryRouter>
        <EndScreen
          reason="completed"
          entries={[e(50, 100, 2), e(50, 0, 0), e(50, 75, 1.5)]}
          onPlayMore={vi.fn()}
        />
      </MemoryRouter>,
    );
    // Stake: 150, Payout: 175, Net: +25
    expect(screen.getByText(/Balls/).parentElement!.textContent).toContain('3');
    expect(screen.getByText('−150')).toBeInTheDocument();
    expect(screen.getByText('+175')).toBeInTheDocument();
    expect(screen.getByText('+25')).toBeInTheDocument();
  });
});
