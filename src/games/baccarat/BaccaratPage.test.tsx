import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import BaccaratPage from './BaccaratPage';
import { register } from '@/systems/auth';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { seed, unseed } from '@/systems/rng';

vi.mock('framer-motion', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: () => true };
});

describe('BaccaratPage — integration', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
    seed(98765);
  });

  it('register → bet → DEAL → settles → writes a rounds row with game=baccarat', async () => {
    const reg = await register({ username: 'alice', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    useSessionStore.setState({ currentUser: reg.user });
    await useWalletStore.getState().hydrate(reg.user.id);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BaccaratPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/BACCARAT/i)).toBeInTheDocument());

    // Wait for wallet balance to hydrate into the page (DEAL is disabled until balance >= bet).
    await waitFor(() => {
      expect(useWalletStore.getState().balance).toBeGreaterThan(0);
    });

    // Pick the 5-chip denomination so a single click bets exactly 5.
    const chip5 = screen.getByRole('radio', { name: /chip 5$/i });
    await user.click(chip5);

    // Click the PLAYER bet zone twice — each click adds the selected chip (5).
    // Multiple "PLAYER" texts exist (HandView label + bet zone label); target by data attribute.
    const playerZone = document.querySelector<HTMLButtonElement>(
      'button[data-zone-label="PLAYER"]',
    )!;
    await user.click(playerZone);
    await user.click(playerZone);

    // Verify the bet went onto the zone.
    await waitFor(() => {
      const z = document.querySelector<HTMLButtonElement>('button[data-zone-label="PLAYER"]');
      expect(z!.getAttribute('data-zone-amount')).toBe('10');
    });

    // Press DEAL.
    const dealBtn = screen.getByRole('button', { name: /^DEAL$/i });
    expect(dealBtn).not.toBeDisabled();
    await user.click(dealBtn);

    // Allow microtasks to flush so the machine completes the round and the
    // wallet bridge useEffect fires (under reducedMotion bannerDisplay=0).
    await new Promise((r) => setTimeout(r, 100));

    // Wait for round to settle and a rounds row to be written.
    await waitFor(
      async () => {
        const rows = await db.rounds.where('userId').equals(reg.user.id).toArray();
        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0]!.game).toBe('baccarat');
      },
      { timeout: 3000 },
    );

    // Cleanup RNG seed.
    unseed();
  });
});
