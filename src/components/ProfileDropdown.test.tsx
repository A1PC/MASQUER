import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import ProfileDropdown from './ProfileDropdown';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
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
  useWalletStore.setState({ balance: 1_000, nextDailyEligibleAt: null, hydrating: false });
});

describe('ProfileDropdown', () => {
  it('shows username + avatar; toggles menu on click', async () => {
    render(
      <MemoryRouter>
        <ProfileDropdown />
      </MemoryRouter>,
    );
    expect(screen.getByText('Adam')).toBeInTheDocument();
    expect(screen.queryByText(/View profile/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/View profile/)).toBeInTheDocument();
    expect(screen.getByText(/Edit profile/)).toBeInTheDocument();
    expect(screen.getByText(/My stats/)).toBeInTheDocument();
    expect(screen.getByText(/Settings/)).toBeInTheDocument();
    expect(screen.getByText(/Log out/)).toBeInTheDocument();
  });

  it('logout clears session and wallet', async () => {
    const logout = vi.fn(() => Promise.resolve());
    const clear = vi.fn();
    useSessionStore.setState({ logout });
    useWalletStore.setState({ clear });
    render(
      <MemoryRouter>
        <ProfileDropdown />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByText(/Log out/));
    expect(logout).toHaveBeenCalled();
    expect(clear).toHaveBeenCalled();
  });
});
