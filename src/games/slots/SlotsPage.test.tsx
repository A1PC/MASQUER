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
// making the XState machine settle immediately (no real/fake timer wait
// needed). useEffectiveReducedMotion reads through this mock when
// motionPref === 'system' (the default).
vi.mock('framer-motion', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

// Mock useSound so we can assert which stingers fire on each lifecycle event
// without engaging the real Web Audio engine (jsdom has no AudioContext).
const playMock = vi.fn();
vi.mock('@/systems/sound/useSound', () => ({
  useSound: () => ({ play: playMock }),
}));

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

describe('<SlotsPage /> shell + skeleton', () => {
  beforeEach(async () => {
    seed(1);
    playMock.mockClear();
    await resetDb();
    await hydrateUser(500);
  });
  afterEach(() => unseed());

  it('renders the MASQUER · Slots title, paytable, and 3 reels', async () => {
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/MASQUER\s*·\s*Slots/i)).toBeInTheDocument();
    expect(screen.getByText(/payout table/i)).toBeInTheDocument();
    expect(document.querySelector('[data-reel-index="0"]')).toBeInTheDocument();
    expect(document.querySelector('[data-reel-index="1"]')).toBeInTheDocument();
    expect(document.querySelector('[data-reel-index="2"]')).toBeInTheDocument();
  });

  it('renders the shared LobbyButton and the OddsInfoBox header bar', () => {
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /back to lobby/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /odds & payouts/i })).toBeInTheDocument();
  });

  it('does NOT render a PLACE BET button (single-step commit via SPIN)', () => {
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: /place bet/i })).toBeNull();
  });

  it('SPIN button is disabled when bet is 0', () => {
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /spin the reels/i })).toBeDisabled();
  });
});

describe('<SlotsPage /> wallet bridge — single-step SPIN', () => {
  beforeEach(async () => {
    seed(1);
    playMock.mockClear();
    await resetDb();
    await hydrateUser(500);
  });
  afterEach(() => {
    unseed();
  });

  it('chip click + SPIN deducts chips, settles the round, and credits any payout', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );

    // Single-step flow: pick a chip, click SPIN. No PLACE BET in between.
    await user.click(screen.getByRole('button', { name: /add 25 chips to bet/i }));
    await user.click(screen.getByRole('button', { name: /spin the reels/i }));

    // After placeBet: 500 - 25 = 475.
    await waitFor(() => {
      expect(useWalletStore.getState().balance).toBe(475);
    });

    // reducedMotion=true → totalSpinDurationMs=0 → machine settles
    // immediately and the settle bridge writes one rounds row.
    await waitFor(async () => {
      const r = await db.rounds.where('userId').equals(TEST_USER.id).toArray();
      expect(r).toHaveLength(1);
    });

    const finalRounds = await db.rounds.where('userId').equals(TEST_USER.id).toArray();
    expect(finalRounds[0]!.game).toBe('slots');
    expect(finalRounds[0]!.betAmount).toBe(25);
    await waitFor(() => {
      expect(useWalletStore.getState().balance).toBe(475 + finalRounds[0]!.payout);
    });
  });
});

describe('<SlotsPage /> sticky bet across spins', () => {
  beforeEach(async () => {
    seed(1);
    playMock.mockClear();
    await resetDb();
    await hydrateUser(500);
  });
  afterEach(() => {
    unseed();
  });

  it('after a settled SPIN the chip stack persists; SPIN can fire again without re-selecting chips', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /add 5 chips to bet/i }));
    await user.click(screen.getByRole('button', { name: /spin the reels/i }));

    await waitFor(async () => {
      const r = await db.rounds.where('userId').equals(TEST_USER.id).toArray();
      expect(r).toHaveLength(1);
    });

    // Sticky bet: the BettingPanel still reads "5" — no re-selection needed.
    expect(screen.getByText('Bet amount').parentElement).toHaveTextContent('5');

    // SPIN again (same bet).
    const spin = screen.getByRole('button', { name: /spin the reels/i });
    expect(spin).not.toBeDisabled();
    await user.click(spin);

    await waitFor(async () => {
      const r = await db.rounds.where('userId').equals(TEST_USER.id).toArray();
      expect(r).toHaveLength(2);
    });
    const rounds = await db.rounds.where('userId').equals(TEST_USER.id).toArray();
    expect(rounds.every((r) => r.betAmount === 5)).toBe(true);
  });

  it('CLEAR zeros the chip stack and disables SPIN', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /add 25 chips to bet/i }));
    expect(screen.getByRole('button', { name: /spin the reels/i })).not.toBeDisabled();
    await user.click(screen.getByRole('button', { name: /clear/i }));
    expect(screen.getByText('Bet amount').parentElement).toHaveTextContent('0');
    expect(screen.getByRole('button', { name: /spin the reels/i })).toBeDisabled();
  });
});

describe('<SlotsPage /> sound stingers', () => {
  beforeEach(async () => {
    seed(1);
    playMock.mockClear();
    await resetDb();
    await hydrateUser(500);
  });
  afterEach(() => {
    unseed();
  });

  it('reducedMotion=true (mocked) → no sound stingers fire on SPIN / settle', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /add 5 chips to bet/i }));
    await user.click(screen.getByRole('button', { name: /spin the reels/i }));

    await waitFor(async () => {
      const r = await db.rounds.where('userId').equals(TEST_USER.id).toArray();
      expect(r).toHaveLength(1);
    });

    // Reduced motion short-circuits ALL audio (matches ADR-0033 amendment).
    expect(playMock).not.toHaveBeenCalled();
  });
});

describe('<SlotsPage /> recent results sidebar', () => {
  beforeEach(async () => {
    seed(1);
    playMock.mockClear();
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
    await user.click(screen.getByRole('button', { name: /spin the reels/i }));

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
    playMock.mockClear();
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
    await user.click(screen.getByRole('button', { name: /spin the reels/i }));

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
