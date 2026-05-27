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

async function setupUser(chips = 5000) {
  const user = { id: 'u-plinko', username: 'p' } as unknown as User;
  await db.balances.put({ userId: user.id, chips, updatedAt: Date.now() });
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

  it('renders MASQUER · Plinko title + LobbyButton + OddsInfoBox + RULES', async () => {
    await setupUser();
    render(
      <MemoryRouter>
        <PlinkoPage />
      </MemoryRouter>,
    );
    // MASQUER title — page header h1 (SetupPanel also has h2 with same text).
    expect(screen.getByRole('heading', { level: 1, name: /MASQUER.*Plinko/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /BACK TO LOBBY/i })).toBeInTheDocument();
    // OddsInfoBox eyebrow + body.
    expect(screen.getByRole('group', { name: /ODDS.*PAYOUTS/i })).toBeInTheDocument();
    // Rules button + modal trigger.
    expect(screen.getByRole('button', { name: /Show game rules/i })).toBeInTheDocument();
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

  it('bet input accepts up to MAX_BET (1,000,000) and clamps higher values', async () => {
    await setupUser(2_000_000);
    render(
      <MemoryRouter>
        <PlinkoPage />
      </MemoryRouter>,
    );
    const betInput = screen.getByDisplayValue('50');
    // Use fireEvent indirectly via userEvent.clear + type — clear and set to over-limit.
    await userEvent.clear(betInput);
    await userEvent.type(betInput, '9999999');
    expect(Number(betInput.value)).toBe(1_000_000);
  });

  it('auto-balls input accepts up to MAX_AUTO_BALLS (1,000) and clamps higher values', async () => {
    await setupUser();
    render(
      <MemoryRouter>
        <PlinkoPage />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('radio', { name: /AUTO/ }));
    const ballsInput = screen.getByDisplayValue('10');
    await userEvent.clear(ballsInput);
    await userEvent.type(ballsInput, '99999');
    expect(Number(ballsInput.value)).toBe(1_000);
  });

  it('opens the rules modal when RULES button is clicked', async () => {
    await setupUser();
    render(
      <MemoryRouter>
        <PlinkoPage />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Show game rules/i }));
    expect(screen.getByRole('dialog', { name: /Plinko.*Rules/i })).toBeInTheDocument();
  });
});
