import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import LeaderboardPerGamePage from './LeaderboardPerGamePage';
import { register } from '@/systems/auth';
import { useSessionStore } from '@/store/sessionStore';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

function renderAt(game: string) {
  const router = createMemoryRouter(
    [{ path: '/leaderboard/:game', element: <LeaderboardPerGamePage /> }],
    { initialEntries: [`/leaderboard/${game}`] },
  );
  return render(<RouterProvider router={router} />);
}

describe('LeaderboardPerGamePage', () => {
  beforeEach(async () => {
    await resetDb();
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
  });

  it('renders empty state for a game with no rounds', async () => {
    const r = await register({ username: 'me', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    renderAt('blackjack');
    expect(await screen.findByText(/no blackjack rounds yet/i)).toBeInTheDocument();
  });

  it('renders 3 bar-chart sections in Graphs view for the scoped game', async () => {
    const r = await register({ username: 'gview2', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    const { useUIStore } = await import('@/store/uiStore');
    useUIStore.setState({ statsViewMode: 'graphs' });
    await db.rounds.add({
      id: 'r-1',
      userId: r.user.id,
      game: 'roulette',
      betAmount: 25,
      payout: 50,
      netChange: 25,
      outcome: 'win',
      details: {},
      balanceAfter: 1025,
      playedAt: 1000,
    });
    renderAt('roulette');
    await waitFor(() => expect(screen.getByText(/ROULETTE — BEST PLAYER/i)).toBeInTheDocument());
    expect(screen.getByText(/ROULETTE — BIGGEST SINGLE WIN/i)).toBeInTheDocument();
    expect(screen.getByText(/ROULETTE — MOST ROUNDS PLAYED/i)).toBeInTheDocument();
    useUIStore.setState({ statsViewMode: 'cards' });
  });

  it('renders 3 game-scoped boards when data exists', async () => {
    const r = await register({ username: 'me', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    await db.rounds.add({
      id: 'r-1',
      userId: r.user.id,
      game: 'roulette',
      betAmount: 25,
      payout: 50,
      netChange: 25,
      outcome: 'win',
      details: {},
      balanceAfter: 1025,
      playedAt: 1000,
    });
    renderAt('roulette');
    await waitFor(() => expect(screen.getByText(/ROULETTE — BEST PLAYER/i)).toBeInTheDocument());
    expect(screen.getByText(/ROULETTE — BIGGEST SINGLE WIN/i)).toBeInTheDocument();
    expect(screen.getByText(/ROULETTE — MOST ROUNDS PLAYED/i)).toBeInTheDocument();
  });
});
