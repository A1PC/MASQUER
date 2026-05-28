import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminBlackjackPage from './AdminBlackjackPage';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

type Outcome = 'player-blackjack' | 'player-win' | 'push' | 'player-loss' | 'player-bust';

async function seedHand(opts: {
  id: string;
  bet: number;
  payout: number;
  outcome: Outcome;
  playedAt: number;
  fromSplit?: boolean;
}): Promise<void> {
  const netChange = opts.payout - opts.bet;
  const result: 'win' | 'loss' | 'push' = netChange > 0 ? 'win' : netChange < 0 ? 'loss' : 'push';
  await db.rounds.add({
    id: opts.id,
    userId: 'u-1',
    game: 'blackjack',
    betAmount: opts.bet,
    payout: opts.payout,
    netChange,
    outcome: result,
    details: {
      hands: [
        {
          cards: [],
          bet: opts.bet,
          doubled: false,
          fromSplit: opts.fromSplit ?? false,
          fromSplitAces: false,
          outcome: opts.outcome,
          payout: opts.payout,
          fiveCardCharlie: false,
        },
      ],
      insurance: { status: 'not-offered', bet: 0, payout: 0 },
      betHandleIds: [],
      config: { h17: false, maxHands: 4, das: true },
    },
    balanceAfter: 1000,
    playedAt: opts.playedAt,
  });
}

describe('AdminBlackjackPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('admin.blackjack.range');
  });

  it('renders the BLACKJACK title and four top StatCard labels even with no data', async () => {
    render(
      <MemoryRouter>
        <AdminBlackjackPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('BLACKJACK')).toBeInTheDocument());
    expect(screen.getByText(/hands played/i)).toBeInTheDocument();
    expect(screen.getByText(/total wagered/i)).toBeInTheDocument();
    expect(screen.getByText(/house net chips/i)).toBeInTheDocument();
    expect(screen.getByText(/actual rtp/i)).toBeInTheDocument();
    expect(screen.getByText(/no blackjack hands recorded yet/i)).toBeInTheDocument();
  });

  it('renders the secondary KPI grid with 5 labels', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminBlackjackPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('BLACKJACK')).toBeInTheDocument());
    expect(container.querySelector('[data-admin-kpi-grid]')).not.toBeNull();
    expect(screen.getByText(/avg hand value/i)).toBeInTheDocument();
    expect(screen.getByText(/win rate/i)).toBeInTheDocument();
    expect(screen.getByText(/bust rate/i)).toBeInTheDocument();
    expect(screen.getByText(/split rate/i)).toBeInTheDocument();
    expect(screen.getByText(/biggest hand won/i)).toBeInTheDocument();
  });

  it('renders the TopPlayersPanel for blackjack', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminBlackjackPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-top-players-panel="blackjack"]')).not.toBeNull(),
    );
  });

  it('renders the DateRangeFilter', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminBlackjackPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(container.querySelector('[data-date-range-filter]')).not.toBeNull());
  });

  it('computes stats from seeded hands', async () => {
    await seedHand({
      id: 'bj-1',
      bet: 100,
      payout: 250,
      outcome: 'player-blackjack',
      playedAt: 1000,
    });
    await seedHand({ id: 'bj-2', bet: 100, payout: 200, outcome: 'player-win', playedAt: 2000 });
    await seedHand({ id: 'bj-3', bet: 100, payout: 0, outcome: 'player-bust', playedAt: 3000 });
    await seedHand({ id: 'bj-4', bet: 100, payout: 100, outcome: 'push', playedAt: 4000 });
    render(
      <MemoryRouter>
        <AdminBlackjackPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.queryByText(/no blackjack hands/i)).not.toBeInTheDocument());
    // bust rate = 1/4 = 25%
    expect(screen.getByText('25.0%')).toBeInTheDocument();
    // 4 rounds, total wagered = 400
    expect(screen.getByText('400')).toBeInTheDocument();
  });

  it('renders the hero chart when data exists', async () => {
    await seedHand({ id: 'bj-1', bet: 50, payout: 100, outcome: 'player-win', playedAt: 1000 });
    const { container } = render(
      <MemoryRouter>
        <AdminBlackjackPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-blackjack-outcome-bar]')).not.toBeNull(),
    );
  });
});
