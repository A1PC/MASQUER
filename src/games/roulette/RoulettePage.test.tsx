import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import RoulettePage from './RoulettePage';
import { seed, unseed } from '@/systems/rng';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { db } from '@/db';
import type { User } from '@/db/schema';

// Mock useReducedMotion to return true so spinDurationMs=0 in tests,
// making the XState machine settle immediately (no real/fake timer wait needed).
vi.mock('framer-motion', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

const TEST_USER: User = {
  id: 'u-test',
  username: 'tester',
  usernameLower: 'tester',
  passwordHash: 'x',
  passwordSalt: 'y',
  pbkdf2Iterations: 600000,
  avatarColor: '#3df0ff',
  createdAt: 0,
};

async function resetDb() {
  await db.balances.clear();
  await db.rounds.clear();
  await db.users.clear();
}

async function hydrateUser(balance = 500) {
  await db.users.put(TEST_USER);
  await db.balances.put({ userId: TEST_USER.id, chips: balance, updatedAt: Date.now() });
  useSessionStore.setState({ currentUser: TEST_USER } as never);
  await useWalletStore.getState().hydrate(TEST_USER.id);
}

describe('<RoulettePage /> skeleton', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
  });
  afterEach(() => unseed());

  it('renders the title and shows the felt + wheel + chip selector', async () => {
    render(
      <MemoryRouter>
        <RoulettePage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/ROULETTE/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /roulette wheel/i })).toBeInTheDocument();
    expect(document.querySelector('[data-roulette-felt]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select 5-chip/i })).toBeInTheDocument();
  });

  it('Spin button is disabled when no bets are placed', () => {
    render(
      <MemoryRouter>
        <RoulettePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /^spin$/i })).toBeDisabled();
  });
});

describe('<RoulettePage /> wallet bridge', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
  });
  afterEach(() => unseed());

  it('placing red + black bets, spinning, settles to a push (balance unchanged)', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RoulettePage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /select 25-chip/i }));
    await user.click(screen.getByRole('button', { name: /^red$/i }));
    await user.click(screen.getByRole('button', { name: /^black$/i }));

    // Balance before spin: still 500 (deferred placeBet model).
    expect(useWalletStore.getState().balance).toBe(500);

    await user.click(screen.getByRole('button', { name: /^spin$/i }));

    // Wait for placeBet to complete (balance drops as each bet is placed).
    await waitFor(() => {
      expect(useWalletStore.getState().balance).toBe(450);
    });

    // With spinDurationMs=0, machine settles immediately after SPIN.
    // Wait for settle to complete and balance to restore.
    // Bet 25 on red + 25 on black: spin=23 (red) → red wins (payout 50), black loses.
    // Total bet=50, payout=50, net=0 → push → balance restored to 500.
    await waitFor(
      () => {
        expect(useWalletStore.getState().balance).toBe(500);
      },
      { timeout: 5000 },
    );

    const rounds = await db.rounds.where('userId').equals(TEST_USER.id).toArray();
    expect(rounds).toHaveLength(1);
    expect(rounds[0]!.game).toBe('roulette');
    expect(rounds[0]!.betAmount).toBe(50);
    expect(rounds[0]!.payout).toBe(50);
    expect(rounds[0]!.netChange).toBe(0);
  });

  it('insufficient chips on SPIN aborts; balance untouched, no round row written', async () => {
    // Reseed user with low balance.
    await db.balances.put({ userId: TEST_USER.id, chips: 10, updatedAt: Date.now() });
    await useWalletStore.getState().hydrate(TEST_USER.id);
    expect(useWalletStore.getState().balance).toBe(10);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RoulettePage />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: /select 100-chip/i }));
    await user.click(screen.getByRole('button', { name: /^red$/i }));
    await user.click(screen.getByRole('button', { name: /^spin$/i }));

    // Give the async IIFE time to complete (placeBet fails, nothing changes).
    await waitFor(() => {
      expect(useWalletStore.getState().balance).toBe(10);
    });
    const rounds = await db.rounds.toArray();
    expect(rounds).toHaveLength(0);
  });
});

describe('<RoulettePage /> NEW_ROUND', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
  });
  afterEach(() => unseed());

  it('after settle + NEW_ROUND, losing bets remain on the felt, winning ones clear', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RoulettePage />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: /select 5-chip/i }));
    await user.click(screen.getByRole('button', { name: /^red$/i }));
    await user.click(screen.getByRole('button', { name: /^black$/i }));
    await user.click(screen.getByRole('button', { name: /^spin$/i }));

    // Wait for machine to reach settled (New round button becomes enabled).
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /new round/i })).not.toBeDisabled();
      },
      { timeout: 5000 },
    );

    await user.click(screen.getByRole('button', { name: /new round/i }));

    // Exactly one chip stack should remain (the losing one).
    // seed(1) → spin 23 (red): red wins (removed), black loses (remains).
    const stacks = document.querySelectorAll('[data-bet-stack]');
    expect(stacks).toHaveLength(1);
  });

  it('shows recent rounds in the GameShell sidebar after settle', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RoulettePage />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: /select 5-chip/i }));
    await user.click(screen.getByRole('button', { name: /^red$/i }));
    await user.click(screen.getByRole('button', { name: /^spin$/i }));

    // Wait for settle to complete and sidebar to update.
    await waitFor(
      () => {
        expect(screen.getByText(/RECENT/i)).toBeInTheDocument();
        expect(screen.getByText(/last 1/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
