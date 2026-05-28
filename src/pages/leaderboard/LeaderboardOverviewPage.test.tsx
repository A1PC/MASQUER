import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import LeaderboardOverviewPage from './LeaderboardOverviewPage';
import { register } from '@/systems/auth';
import { useSessionStore } from '@/store/sessionStore';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

describe('LeaderboardOverviewPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('masquer.session.userId');
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
  });

  it('renders empty state when no users have rounds', async () => {
    const r = await register({ username: 'lonely', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    render(
      <MemoryRouter>
        <LeaderboardOverviewPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/no rounds yet/i)).toBeInTheDocument();
  });

  it('renders 5 board titles when data exists', async () => {
    const r = await register({ username: 'me', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    await db.rounds.add({
      id: 'r-1',
      userId: r.user.id,
      game: 'blackjack',
      betAmount: 50,
      payout: 100,
      netChange: 50,
      outcome: 'win',
      details: {},
      balanceAfter: 1050,
      playedAt: 1000,
    });
    render(
      <MemoryRouter>
        <LeaderboardOverviewPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('BIGGEST NET WINNER')).toBeInTheDocument());
    expect(screen.getByText('MOST ROUNDS PLAYED')).toBeInTheDocument();
    expect(screen.getByText('BIGGEST SINGLE WIN')).toBeInTheDocument();
    expect(screen.getByText('LONGEST WIN STREAK')).toBeInTheDocument();
    expect(screen.getByText('MOST VARIETY')).toBeInTheDocument();
  });

  it('renders 5 bar-chart sections in Graphs view', async () => {
    const r = await register({ username: 'gview', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    // Switch to graphs mode
    const { useUIStore } = await import('@/store/uiStore');
    useUIStore.setState({ statsViewMode: 'graphs' });
    await db.rounds.add({
      id: 'r-1',
      userId: r.user.id,
      game: 'blackjack',
      betAmount: 50,
      payout: 100,
      netChange: 50,
      outcome: 'win',
      details: {},
      balanceAfter: 1050,
      playedAt: 1000,
    });
    render(
      <MemoryRouter>
        <LeaderboardOverviewPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('BIGGEST NET WINNER')).toBeInTheDocument());
    expect(screen.getByText('MOST ROUNDS PLAYED')).toBeInTheDocument();
    expect(screen.getByText('BIGGEST SINGLE WIN')).toBeInTheDocument();
    expect(screen.getByText('LONGEST WIN STREAK')).toBeInTheDocument();
    expect(screen.getByText('MOST VARIETY')).toBeInTheDocument();
    // Reset for other tests
    useUIStore.setState({ statsViewMode: 'cards' });
  });

  it('excludes banned users from boards', async () => {
    const me = await register({ username: 'me', password: 'password123' });
    const cheater = await register({ username: 'cheater', password: 'password123' });
    if (!me.ok || !cheater.ok) throw new Error();
    useSessionStore.setState({ currentUser: me.user });
    await db.users.update(cheater.user.id, { isBanned: true });
    await db.rounds.bulkAdd([
      {
        id: 'me-1',
        userId: me.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 20,
        netChange: 10,
        outcome: 'win',
        details: {},
        balanceAfter: 1010,
        playedAt: 1000,
      },
      {
        id: 'ch-1',
        userId: cheater.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 10000,
        netChange: 9990,
        outcome: 'win',
        details: {},
        balanceAfter: 11000,
        playedAt: 2000,
      },
    ]);
    render(
      <MemoryRouter>
        <LeaderboardOverviewPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('BIGGEST NET WINNER')).toBeInTheDocument());
    expect(screen.queryByText('cheater')).not.toBeInTheDocument();
  });
});
