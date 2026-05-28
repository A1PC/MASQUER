import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import StatsPerGamePage from './StatsPerGamePage';
import { register } from '@/systems/auth';
import { useSessionStore } from '@/store/sessionStore';
import { useUIStore } from '@/store/uiStore';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

function renderAt(game: string) {
  const router = createMemoryRouter([{ path: '/stats/:game', element: <StatsPerGamePage /> }], {
    initialEntries: [`/stats/${game}`],
  });
  return render(<RouterProvider router={router} />);
}

describe('StatsPerGamePage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('masquer.session.userId');
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
    useUIStore.setState({ statsViewMode: 'cards' });
  });

  it('renders empty state with link to that game when no rounds in scope', async () => {
    const r = await register({ username: 'pg', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    renderAt('blackjack');
    expect(await screen.findByText(/no blackjack rounds yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /play blackjack/i })).toHaveAttribute(
      'href',
      '/play/blackjack',
    );
  });

  it('scopes the grid to that game only', async () => {
    const r = await register({ username: 'pg2', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    await db.rounds.bulkAdd([
      {
        id: 'b-1',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 100,
        payout: 200,
        netChange: 100,
        outcome: 'win',
        details: {},
        balanceAfter: 1100,
        playedAt: 1000,
      },
      {
        id: 's-1',
        userId: r.user.id,
        game: 'slots',
        betAmount: 50,
        payout: 0,
        netChange: -50,
        outcome: 'loss',
        details: {},
        balanceAfter: 1050,
        playedAt: 2000,
      },
    ]);
    renderAt('blackjack');
    await waitFor(() => expect(screen.getByText(/net change/i)).toBeInTheDocument());
    expect(screen.getAllByText('+100').length).toBeGreaterThan(0);
    expect(screen.queryByText('-50')).not.toBeInTheDocument();
  });

  it('renders 3 charts in Graphs view scoped to the game', async () => {
    const r = await register({ username: 'pg', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    useUIStore.setState({ statsViewMode: 'graphs' });
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
    renderAt('blackjack');
    await waitFor(() => expect(screen.getByText(/NET FLOW · Blackjack/i)).toBeInTheDocument());
    expect(screen.getByText(/RECENT OUTCOMES/i)).toBeInTheDocument();
    expect(screen.getByText(/BET-SIZE DISTRIBUTION/i)).toBeInTheDocument();
  });
});
