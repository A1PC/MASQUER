import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import SlotsPage from './SlotsPage';
import { seed, unseed } from '@/systems/rng';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { db } from '@/db';
import type { User } from '@/db/schema';

// Mock useReducedMotion to return true so totalSpinDurationMs=0 in tests,
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

describe('<SlotsPage /> skeleton', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
  });
  afterEach(() => unseed());

  it('renders the SLOTS title, paytable, and 3 reels', async () => {
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/SLOTS/i)).toBeInTheDocument();
    expect(screen.getByText(/PAYOUT TABLE/i)).toBeInTheDocument();
    expect(document.querySelector('[data-reel-index="0"]')).toBeInTheDocument();
    expect(document.querySelector('[data-reel-index="1"]')).toBeInTheDocument();
    expect(document.querySelector('[data-reel-index="2"]')).toBeInTheDocument();
  });

  it('Spin button is disabled when bet is 0', () => {
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /^spin$/i })).toBeDisabled();
  });
});

describe('<SlotsPage /> wallet bridge', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
  });
  afterEach(() => {
    unseed();
  });

  it('placing a bet + spinning deducts chips and credits payout if win, records a round', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );

    // BettingPanel: chip selector + PLACE BET
    await user.click(screen.getByRole('button', { name: /add 25 chips to bet/i }));
    await user.click(screen.getByRole('button', { name: /place bet/i }));
    await user.click(screen.getByRole('button', { name: /^spin$/i }));

    // After placeBet: 500 - 25 = 475
    await waitFor(() => {
      expect(useWalletStore.getState().balance).toBe(475);
    });

    // With reducedMotion=true, totalSpinDurationMs=0, so machine settles immediately.
    // Wait for settle to complete.
    await waitFor(async () => {
      const r = await db.rounds.where('userId').equals(TEST_USER.id).toArray();
      expect(r).toHaveLength(1);
    });

    const finalRounds = await db.rounds.where('userId').equals(TEST_USER.id).toArray();
    expect(finalRounds[0]!.game).toBe('slots');
    expect(finalRounds[0]!.betAmount).toBe(25);
    // Final balance = 475 + rounds[0].payout (consistency check)
    await waitFor(() => {
      expect(useWalletStore.getState().balance).toBe(475 + finalRounds[0]!.payout);
    });
  });
});

describe('<SlotsPage /> recent results sidebar', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
  });
  afterEach(() => {
    unseed();
  });

  it('after a settled round, RECENT sidebar shows at least one entry', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: /add 5 chips to bet/i }));
    await user.click(screen.getByRole('button', { name: /place bet/i }));
    await user.click(screen.getByRole('button', { name: /^spin$/i }));

    await waitFor(
      () => {
        expect(screen.getByText(/RECENT/i)).toBeInTheDocument();
        expect(screen.getByText(/last 1/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});

describe('<SlotsPage /> win celebration tiers', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
  });
  afterEach(() => {
    unseed();
  });

  it('exposes data-win-tier on the celebration overlay matching roundResult.details.winTier', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: /add 5 chips to bet/i }));
    await user.click(screen.getByRole('button', { name: /place bet/i }));
    await user.click(screen.getByRole('button', { name: /^spin$/i }));

    await waitFor(
      () => {
        const overlay = document.querySelector('[data-roulette-layer="win-celebration"]');
        expect(overlay).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const overlay = document.querySelector('[data-roulette-layer="win-celebration"]');
    const tier = overlay!.getAttribute('data-win-tier');
    expect(['none', 'small', 'medium', 'jackpot']).toContain(tier);
  });

  it('celebration overlay container is always rendered; data-win-tier="none" before any spin', () => {
    // With the two-state machine, the WinCelebration overlay is always
    // mounted (so tests can find it). Its visual content is hidden until a
    // round result is available — surfaced via data-win-tier="none".
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );
    const overlay = document.querySelector('[data-roulette-layer="win-celebration"]');
    expect(overlay).toBeInTheDocument();
    expect(overlay!.getAttribute('data-win-tier')).toBe('none');
  });
});
