import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import StatsOverviewPage from './StatsOverviewPage';
import { register } from '@/systems/auth';
import { useSessionStore } from '@/store/sessionStore';
import { useUIStore } from '@/store/uiStore';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

describe('StatsOverviewPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
    localStorage.removeItem('localGamble.ui.statsViewMode');
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
    useUIStore.setState({ statsViewMode: 'cards' });
  });

  it('renders empty state for a user with 0 rounds', async () => {
    const r = await register({ username: 'newbie', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    render(
      <MemoryRouter>
        <StatsOverviewPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/no rounds yet/i)).toBeInTheDocument();
  });

  it('renders the 16-card grid when the user has rounds', async () => {
    const r = await register({ username: 'player', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
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
        <StatsOverviewPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/net change/i)).toBeInTheDocument());
    expect(screen.getAllByText('+100').length).toBeGreaterThan(0);
  });

  it('renders the Graphs stub when viewMode=graphs', async () => {
    const r = await register({ username: 'graphs', password: 'password123' });
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
    render(
      <MemoryRouter>
        <StatsOverviewPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/graphs view/i)).toBeInTheDocument());
  });
});
