import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import ProfileDropdown from './ProfileDropdown';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { usePrefsStore } from '@/store/prefsStore';
import * as account from '@/systems/account';
import type { User } from '@/db';

vi.mock('@/systems/account', () => ({
  deleteAccount: vi.fn(() => Promise.resolve()),
  clearHistory: vi.fn(() => Promise.resolve()),
}));

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
  vi.clearAllMocks();
  useSessionStore.setState({
    currentUser: testUser,
    bootstrapping: false,
  });
  useWalletStore.setState({ balance: 1_000, nextDailyEligibleAt: null, hydrating: false });
  usePrefsStore.setState({ prefs: null });
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

  it('Delete account opens a confirm modal and deletes + logs out on confirm', async () => {
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
    await userEvent.click(screen.getByText(/Delete account/));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/delete account\?/i)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: /delete forever/i }));
    await waitFor(() => expect(account.deleteAccount).toHaveBeenCalledWith('u'));
    expect(logout).toHaveBeenCalled();
    expect(clear).toHaveBeenCalled();
  });

  it('cancelling the delete-account modal does not delete or log out', async () => {
    const logout = vi.fn(() => Promise.resolve());
    useSessionStore.setState({ logout });
    render(
      <MemoryRouter>
        <ProfileDropdown />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByText(/Delete account/));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
    expect(account.deleteAccount).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });
});
