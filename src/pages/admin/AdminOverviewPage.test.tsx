import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminOverviewPage from './AdminOverviewPage';
import { register } from '@/systems/auth';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

describe('AdminOverviewPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
  });

  it('renders the four stat cards and chart sections when data exists', async () => {
    const r = await register({ username: 'alice', password: 'password123' });
    if (!r.ok) throw new Error('register failed');
    await db.rounds.add({
      id: 'r-1',
      userId: r.user.id,
      game: 'blackjack',
      betAmount: 100,
      payout: 200,
      netChange: 100,
      outcome: 'win',
      details: {},
      balanceAfter: 1100,
      playedAt: 1000,
    });

    render(
      <MemoryRouter>
        <AdminOverviewPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/^users$/i)).toBeInTheDocument());
    expect(screen.getByText(/total wagered/i)).toBeInTheDocument();
    expect(screen.getByText(/total paid out/i)).toBeInTheDocument();
    expect(screen.getByText(/net house/i)).toBeInTheDocument();
    expect(screen.getByText(/net flow/i)).toBeInTheDocument();
    expect(screen.getByText(/top winners/i)).toBeInTheDocument();
    expect(screen.getByText(/game distribution/i)).toBeInTheDocument();
  });

  it('shows zero-state copy when no data exists', async () => {
    render(
      <MemoryRouter>
        <AdminOverviewPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/total wagered/i)).toBeInTheDocument());
    // Multiple "0" values across the stat cards.
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('renders TOP GAMES BY SESSIONS cards when rounds exist across multiple games', async () => {
    const r = await register({ username: 'alice', password: 'password123' });
    if (!r.ok) throw new Error('register failed');
    const baseRound = {
      userId: r.user.id,
      betAmount: 100,
      payout: 50,
      netChange: -50,
      outcome: 'loss' as const,
      details: {},
      balanceAfter: 900,
    };
    await db.rounds.bulkAdd([
      { id: 's-1', game: 'slots', playedAt: 1, ...baseRound },
      { id: 's-2', game: 'slots', playedAt: 2, ...baseRound },
      { id: 's-3', game: 'slots', playedAt: 3, ...baseRound },
      { id: 'r-1', game: 'roulette', playedAt: 4, ...baseRound },
      { id: 'r-2', game: 'roulette', playedAt: 5, ...baseRound },
      { id: 'p-1', game: 'plinko', playedAt: 6, ...baseRound },
    ]);

    const { container } = render(
      <MemoryRouter>
        <AdminOverviewPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/top games by sessions/i)).toBeInTheDocument());
    await waitFor(() => expect(container.querySelector('[data-top-game="slots"]')).not.toBeNull());
    expect(container.querySelector('[data-top-game="roulette"]')).not.toBeNull();
    expect(container.querySelector('[data-top-game="plinko"]')).not.toBeNull();
  });

  it('renders the ACTIVITY (LAST 14 DAYS) sparkline container', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminOverviewPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/activity \(last 14 days\)/i)).toBeInTheDocument());
    await waitFor(() =>
      expect(container.querySelector('[data-daily-activity-sparkline]')).not.toBeNull(),
    );
  });

  it('renders RECENT ADJUSTMENTS list when adjustments exist', async () => {
    const r = await register({ username: 'alice', password: 'password123' });
    if (!r.ok) throw new Error('register failed');
    await db.adjustments.bulkAdd([
      { id: 'adj-a', userId: r.user.id, amount: 100, reason: 'topup', adjustedAt: 1000 },
      { id: 'adj-b', userId: r.user.id, amount: -25, reason: 'clawback', adjustedAt: 2000 },
    ]);

    const { container } = render(
      <MemoryRouter>
        <AdminOverviewPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/recent adjustments/i)).toBeInTheDocument());
    await waitFor(() =>
      expect(container.querySelector('[data-recent-adjustments]')).not.toBeNull(),
    );
    expect(container.querySelector('[data-recent-adjustment-id="adj-a"]')).not.toBeNull();
    expect(container.querySelector('[data-recent-adjustment-id="adj-b"]')).not.toBeNull();
  });

  it('shows empty-state copy for RECENT ADJUSTMENTS when no adjustments exist', async () => {
    render(
      <MemoryRouter>
        <AdminOverviewPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/recent adjustments/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/no adjustments recorded/i)).toBeInTheDocument());
  });
});
