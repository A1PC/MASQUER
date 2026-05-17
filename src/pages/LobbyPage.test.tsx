import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import LobbyPage from './LobbyPage';
import { useSessionStore } from '@/store/sessionStore';
import type { User } from '@/db';

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
});
