import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import EndScreen from './EndScreen';
import { BIN_COUNT } from './geometry';
import type { HistoryEntry } from './machine';

function e(
  bet: number,
  payout: number,
  multiplier: number,
  bin = 13,
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

  it('shows the Edge bin hits row when any edge bins were hit', () => {
    render(
      <MemoryRouter>
        <EndScreen
          reason="completed"
          entries={[e(100, 70000, 700, 0), e(100, 50, 0.5, 13)]}
          onPlayMore={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Edge bin hits/)).toBeInTheDocument();
  });

  it('omits the Edge bin hits row when no edge bins were hit', () => {
    render(
      <MemoryRouter>
        <EndScreen
          reason="completed"
          entries={[e(100, 70, 0.7, 13), e(100, 80, 0.8, 12)]}
          onPlayMore={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/Edge bin hits/)).toBeNull();
  });

  it('shows BIN_COUNT - 1 (26) as a valid edge bin too', () => {
    render(
      <MemoryRouter>
        <EndScreen
          reason="completed"
          entries={[e(100, 70000, 700, BIN_COUNT - 1)]}
          onPlayMore={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Edge bin hits/)).toBeInTheDocument();
  });
});
