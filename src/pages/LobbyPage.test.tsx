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
  it('renders heading and all 5 game cabinets', () => {
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

  it('renders LOTTERY cabinet in the carousel', () => {
    render(
      <MemoryRouter>
        <LobbyPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('LOTTERY')).toBeInTheDocument();
  });

  it('shows BUY A TICKET on the lottery cabinet when user has no tickets', async () => {
    render(
      <MemoryRouter>
        <LobbyPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/BUY A TICKET/)).toBeInTheDocument());
  });

  it('shows ticket and line counts on lottery cabinet when user has tickets for today', async () => {
    const today = new Date();
    const drawId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await db.lotteryTickets.add({
      id: 'tk-1',
      userId: testUser.id,
      drawId,
      purchasedAt: Date.now(),
      totalCost: 20,
      lineCount: 2,
    });
    await db.lotteryLines.bulkAdd([
      {
        id: 'ln-1',
        ticketId: 'tk-1',
        userId: testUser.id,
        drawId,
        mainNumbers: [1, 2, 3, 4, 5],
        bonusNumber: 1,
        isLuckyDip: false,
        isFreeReentry: false,
        settled: false,
        matchTier: null,
        payout: 0,
      },
      {
        id: 'ln-2',
        ticketId: 'tk-1',
        userId: testUser.id,
        drawId,
        mainNumbers: [6, 7, 8, 9, 10],
        bonusNumber: 2,
        isLuckyDip: false,
        isFreeReentry: false,
        settled: false,
        matchTier: null,
        payout: 0,
      },
    ]);
    render(
      <MemoryRouter>
        <LobbyPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/1 TICKET/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/2 LINES/)).toBeInTheDocument());
  });
});
