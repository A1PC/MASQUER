import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import LobbyPage from './LobbyPage';
import { useSessionStore } from '@/store/sessionStore';
import type { User } from '@/db';
import { db } from '@/db';

const testUser: User = {
  id: 'u',
  username: 'A',
  usernameLower: 'a',
  passwordHash: '',
  passwordSalt: '',
  pbkdf2Iterations: 600_000,
  avatarColor: '#a3122a',
  createdAt: Date.now(),
};

beforeEach(() => {
  useSessionStore.setState({
    currentUser: testUser,
    bootstrapping: false,
  });
});

describe('LobbyPage', () => {
  it('renders heading and all 5 cabinets', () => {
    render(
      <MemoryRouter>
        <LobbyPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/PICK YOUR POISON/)).toBeInTheDocument();
    expect(screen.getByText('COIN FLIP')).toBeInTheDocument();
    expect(screen.getByText('BLACKJACK')).toBeInTheDocument();
    expect(screen.getByText('ROULETTE')).toBeInTheDocument();
    expect(screen.getByText('SLOTS')).toBeInTheDocument();
    expect(screen.getByText('BACCARAT')).toBeInTheDocument();
  });

  it('shows empty-state recent-activity strip when no rounds played', () => {
    render(
      <MemoryRouter>
        <LobbyPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/No rounds played yet/)).toBeInTheDocument();
  });

  it('renders the lottery tile with a countdown when no draw exists', async () => {
    render(
      <MemoryRouter>
        <LobbyPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/daily lottery/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/draw in/i)).toBeInTheDocument());
  });

  it('shows the drawn numbers when today has a draw', async () => {
    const today = new Date();
    const id = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await db.lotteryDraws.put({
      id,
      drawAt: Date.now(),
      mainNumbers: [3, 12, 25, 41, 49],
      bonus: 7,
      totalLines: 0,
      totalRevenue: 0,
      totalPayout: 0,
    });
    render(
      <MemoryRouter>
        <LobbyPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/3 · 12 · 25 · 41 · 49/)).toBeInTheDocument());
  });
});
