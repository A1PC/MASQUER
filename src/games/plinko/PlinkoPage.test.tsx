import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import PlinkoPage from './PlinkoPage';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { db } from '@/db';
import type { User } from '@/db';
import 'fake-indexeddb/auto';

vi.mock('framer-motion', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: () => true };
});

async function setupUser() {
  const user = { id: 'u-plinko', username: 'p' } as unknown as User;
  await db.balances.put({ userId: user.id, chips: 5000, updatedAt: Date.now() });
  useSessionStore.setState({ currentUser: user });
  await useWalletStore.getState().hydrate(user.id);
  return user;
}

describe('PlinkoPage', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useSessionStore.setState({ currentUser: null });
  });

  it('renders nothing when no user logged in (returns null)', () => {
    const { container } = render(
      <MemoryRouter>
        <PlinkoPage />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders setup panel with default low risk', async () => {
    await setupUser();
    render(
      <MemoryRouter>
        <PlinkoPage />
      </MemoryRouter>,
    );
    // Both the page header h1 and SetupPanel h2 contain "🔻 PLINKO" — just check at least one exists.
    expect(screen.getAllByText(/🔻 PLINKO/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('radio', { name: /LOW/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('clicking DROP places a bet and writes a rounds row', async () => {
    await setupUser();
    render(
      <MemoryRouter>
        <PlinkoPage />
      </MemoryRouter>,
    );
    const drop = screen.getByRole('button', { name: /DROP \(50\)/ });
    await userEvent.click(drop);
    await waitFor(async () => {
      const rounds = await db.rounds.where({ game: 'plinko' }).toArray();
      expect(rounds.length).toBeGreaterThanOrEqual(1);
      expect(rounds[0]!.betAmount).toBe(50);
    });
  });

  it('switching to auto reveals balls + interval pickers', async () => {
    await setupUser();
    render(
      <MemoryRouter>
        <PlinkoPage />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('radio', { name: /AUTO/ }));
    expect(screen.getByLabelText(/Auto interval/i)).toBeInTheDocument();
  });
});
