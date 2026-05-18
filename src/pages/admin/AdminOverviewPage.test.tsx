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

  it('renders the four stat cards and three chart sections when data exists', async () => {
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
});
