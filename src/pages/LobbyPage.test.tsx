import { describe, expect, it, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ToastProvider } from '@/components/ui';
import LobbyPage from './LobbyPage';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import type { User } from '@/db';
import { db } from '@/db';

vi.mock('@/systems/sound/useSound', () => ({ useSound: () => ({ play: vi.fn() }) }));

const testUser: User = {
  id: 'u',
  username: 'Adam',
  usernameLower: 'adam',
  passwordHash: '',
  passwordSalt: '',
  pbkdf2Iterations: 600_000,
  avatarColor: '#a3122a',
  createdAt: Date.now(),
};

function renderLobby(): void {
  render(
    <ToastProvider>
      <MemoryRouter>
        <LobbyPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  await db.lotteryTickets.clear();
  await db.lotteryLines.clear();
  await db.rounds.clear();
  useSessionStore.setState({ currentUser: testUser, bootstrapping: false });
  useWalletStore.setState({ balance: 1000, nextDailyEligibleAt: null, hydrating: false });
});

describe('LobbyPage', () => {
  it('renders the hero with the welcome message and balance', () => {
    renderLobby();
    expect(screen.getByRole('heading', { name: /welcome back, adam/i })).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();
  });

  it('renders a cabinet for every game, including Craps and Lottery', () => {
    renderLobby();
    for (const label of ['Coin Flip', 'Blackjack', 'Roulette', 'Slots', 'Baccarat', 'Craps']) {
      expect(screen.getByRole('link', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /poker/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bingo/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /lottery/i })).toBeInTheDocument();
  });

  it('shows the recent-activity empty message when no rounds have been played', () => {
    renderLobby();
    expect(screen.getByText(/no rounds played yet/i)).toBeInTheDocument();
  });

  it('shows the lottery prompt when the user has no tickets today', async () => {
    renderLobby();
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /lottery.*buy a ticket/i })).toBeInTheDocument(),
    );
  });

  it('renders the zero-balance empty state when the player is out of chips', () => {
    useWalletStore.setState({ balance: 0, nextDailyEligibleAt: null, hydrating: false });
    renderLobby();
    expect(screen.getByRole('heading', { name: /out of chips/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /claim daily top-up/i })).toBeInTheDocument();
  });
});
