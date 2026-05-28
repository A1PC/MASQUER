import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminCoinFlipPage from './AdminCoinFlipPage';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

async function seedFlip(opts: {
  id: string;
  call: 'heads' | 'tails';
  landed: 'heads' | 'tails';
  bet: number;
  playedAt: number;
}): Promise<void> {
  const won = opts.call === opts.landed;
  const payout = won ? opts.bet * 2 : 0;
  const netChange = payout - opts.bet;
  await db.rounds.add({
    id: opts.id,
    userId: 'u-1',
    game: 'coin-flip',
    betAmount: opts.bet,
    payout,
    netChange,
    outcome: won ? 'win' : 'loss',
    details: { call: opts.call, landed: opts.landed },
    balanceAfter: 1000,
    playedAt: opts.playedAt,
  });
}

describe('AdminCoinFlipPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('admin.coin-flip.range');
  });

  it('renders the COIN-FLIP title and the four top StatCards', async () => {
    render(
      <MemoryRouter>
        <AdminCoinFlipPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('COIN-FLIP')).toBeInTheDocument());
    expect(screen.getByText(/flips played/i)).toBeInTheDocument();
    expect(screen.getByText(/total wagered/i)).toBeInTheDocument();
    expect(screen.getByText(/house net chips/i)).toBeInTheDocument();
    expect(screen.getByText(/actual rtp/i)).toBeInTheDocument();
    expect(screen.getByText(/no coin flips recorded yet/i)).toBeInTheDocument();
  });

  it('renders the secondary KPI grid with 5 labels', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminCoinFlipPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('COIN-FLIP')).toBeInTheDocument());
    expect(container.querySelector('[data-admin-kpi-grid]')).not.toBeNull();
    expect(screen.getByText(/longest streak/i)).toBeInTheDocument();
    expect(screen.getByText(/heads-call rate/i)).toBeInTheDocument();
    expect(screen.getByText(/tails-call rate/i)).toBeInTheDocument();
    expect(screen.getByText(/avg bet/i)).toBeInTheDocument();
    expect(screen.getByText(/biggest single win/i)).toBeInTheDocument();
  });

  it('renders the TopPlayersPanel for coin-flip', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminCoinFlipPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-top-players-panel="coin-flip"]')).not.toBeNull(),
    );
  });

  it('renders the DateRangeFilter', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminCoinFlipPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(container.querySelector('[data-date-range-filter]')).not.toBeNull());
  });

  it('renders hero chart + recent flips when seeded', async () => {
    await seedFlip({ id: 'cf-1', call: 'heads', landed: 'heads', bet: 100, playedAt: 1000 });
    await seedFlip({ id: 'cf-2', call: 'tails', landed: 'heads', bet: 50, playedAt: 2000 });
    const { container } = render(
      <MemoryRouter>
        <AdminCoinFlipPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-coin-flip-face-bar]')).not.toBeNull(),
    );
    expect(screen.queryByText(/no flips yet/i)).not.toBeInTheDocument();
  });
});
