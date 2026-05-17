import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import LobbyPage from './LobbyPage';
import { useSessionStore } from '@/store/sessionStore';
import type { User } from '@/db';

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

beforeEach(() => {
  useSessionStore.setState({
    currentUser: testUser,
    bootstrapping: false,
  });
});

describe('LobbyPage', () => {
  it('renders the PICK YOUR POISON heading', () => {
    render(
      <MemoryRouter>
        <LobbyPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/PICK YOUR POISON/)).toBeInTheDocument();
  });
});
