import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import BingoPage from './BingoPage';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { db } from '@/db';
import type { User } from '@/db';
import 'fake-indexeddb/auto';

async function setupUser() {
  const user = { id: 'u-test', username: 'tester' } as unknown as User;
  await db.balances.put({ userId: user.id, chips: 5000, updatedAt: Date.now() });
  useSessionStore.setState({ currentUser: user });
  await useWalletStore.getState().hydrate(user.id);
  return user;
}

describe('BingoPage', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useSessionStore.setState({ currentUser: null });
  });

  it('redirects to /lobby when no variant query param', () => {
    render(
      <MemoryRouter initialEntries={['/play/bingo']}>
        <BingoPage />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/BINGO — /)).toBeNull();
  });

  it('renders setup with British variant header', async () => {
    await setupUser();
    render(
      <MemoryRouter initialEntries={['/play/bingo?variant=british']}>
        <BingoPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/British 90-Ball/)).toBeInTheDocument();
  });

  it('clicking BUY & PLAY enters playing state', async () => {
    await setupUser();
    render(
      <MemoryRouter initialEntries={['/play/bingo?variant=british']}>
        <BingoPage />
      </MemoryRouter>,
    );
    const btn = screen.getByRole('button', { name: /BUY & PLAY/ });
    await userEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText(/Ball 0 of 90/i)).toBeInTheDocument();
    });
  });
});
