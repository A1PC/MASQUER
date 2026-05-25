import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import RoulettePage from './RoulettePage';
import { seed, unseed } from '@/systems/rng';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { db } from '@/db';
import type { User } from '@/db/schema';
import { ROULETTE_CONFIG } from './config';

// Reduced-motion: collapses the spin to 0 duration (so the machine settles
// immediately on SPIN_NOW) and the countdown ring to a static label. The
// 30 s / 10 s windows themselves still tick — the spec is explicit that
// reduced-motion preserves the betting windows.
vi.mock('@/motion/useEffectiveReducedMotion', () => ({
  useEffectiveReducedMotion: () => true,
}));

const { playSpy } = vi.hoisted(() => ({ playSpy: vi.fn() }));
vi.mock('@/systems/sound/useSound', () => ({
  useSound: () => ({ play: playSpy }),
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

describe('<RoulettePage /> skeleton', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
    playSpy.mockReset();
  });
  afterEach(() => unseed());

  it('renders title, wheel, felt, chip selector, LobbyButton, OddsInfoBox, SPIN NOW', async () => {
    render(
      <MemoryRouter>
        <RoulettePage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/ROULETTE/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /roulette wheel/i })).toBeInTheDocument();
    expect(document.querySelector('[data-roulette-felt]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select 5-chip/i })).toBeInTheDocument();
    // Shared shell primitives
    expect(screen.getByRole('link', { name: /back to lobby/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /odds/i })).toBeInTheDocument();
    // SPIN NOW button — replaces the old SPIN + New round.
    expect(screen.getByRole('button', { name: /spin the wheel now/i })).toBeInTheDocument();
    // No legacy "New round" affordance.
    expect(screen.queryByRole('button', { name: /new round/i })).toBeNull();
  });

  it('renders the auto-spin countdown text during placing_bets (reduced-motion path)', async () => {
    render(
      <MemoryRouter>
        <RoulettePage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Auto-spin in/i)).toBeInTheDocument();
  });
});

describe('<RoulettePage /> SPIN_NOW + zero-bet auto-spin', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
    playSpy.mockReset();
  });
  afterEach(() => unseed());

  it('clicking SPIN NOW with zero bets writes ONE zero-stake rounds row (ADR-0046 amendment)', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RoulettePage />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: /spin the wheel now/i }));
    // Wait for the settle bridge + Dexie transaction to drain.
    await waitFor(async () => {
      const rows = await db.rounds.toArray();
      expect(rows).toHaveLength(1);
    });
    const rows = await db.rounds.toArray();
    expect(rows[0]!.betAmount).toBe(0);
    expect(rows[0]!.payout).toBe(0);
    expect(rows[0]!.netChange).toBe(0);
    expect(rows[0]!.outcome).toBe('push');
    expect(rows[0]!.game).toBe('roulette');
    expect(rows[0]!.id.startsWith('spin-only-')).toBe(true);
    // Balance untouched — recordSpinOnly does not move chips.
    expect(useWalletStore.getState().balance).toBe(500);
  });
});

describe('<RoulettePage /> wallet bridge — placed bets settle', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
    playSpy.mockReset();
  });
  afterEach(() => unseed());

  it('placing red + black, hitting SPIN NOW, settles a single rounds row (push)', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RoulettePage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /select 25-chip/i }));
    await user.click(screen.getByRole('button', { name: /^red$/i }));
    await user.click(screen.getByRole('button', { name: /^black$/i }));

    expect(useWalletStore.getState().balance).toBe(500);

    await user.click(screen.getByRole('button', { name: /spin the wheel now/i }));

    // Wait for place-bet bridge to drain.
    await waitFor(() => {
      expect(useWalletStore.getState().balance).toBe(450);
    });

    // seed(1) → 23 (red): red wins (50), black loses → push → 500.
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

  it('insufficient chips on SPIN NOW aborts; balance untouched, no rounds row', async () => {
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
    await user.click(screen.getByRole('button', { name: /spin the wheel now/i }));

    await new Promise((r) => setTimeout(r, 100));
    expect(useWalletStore.getState().balance).toBe(10);
    const rows = await db.rounds.toArray();
    expect(rows).toHaveLength(0);
  });
});

describe('<RoulettePage /> auto-spin via the 30 s window (fake timers)', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
    playSpy.mockReset();
  });
  afterEach(() => unseed());

  it('after INITIAL_BET_WINDOW_MS, the wheel auto-spins (zero bets → one zero-stake row)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let restored = false;
    try {
      render(
        <MemoryRouter>
          <RoulettePage />
        </MemoryRouter>,
      );
      await screen.findByText(/Auto-spin in/i);
      await act(async () => {
        // Bet window timer → spinning (entry: setSpinResult).
        await vi.advanceTimersByTimeAsync(ROULETTE_CONFIG.INITIAL_BET_WINDOW_MS + 50);
      });
      // Switch back to real timers BEFORE the spin's after(0) fires so the
      // React effect that calls `recordSpinOnly` runs against real
      // microtasks (Dexie's transaction relies on the real microtask
      // queue). The 0-ms after-delay in reduced-motion mode fires on the
      // next macrotask, which real timers process naturally.
      vi.useRealTimers();
      restored = true;
      // ADR-0046 amendment: zero-bet auto-spin writes a single zero-stake
      // `rounds` row so the recent-results feed stays in sync with the wheel.
      // Poll for up to 2 s — the settle effect schedules the Dexie write as
      // a microtask after the React render that follows the timer-driven
      // state transition.
      await waitFor(
        async () => {
          const rows = await db.rounds.toArray();
          expect(rows).toHaveLength(1);
          expect(rows[0]!.betAmount).toBe(0);
        },
        { timeout: 2_000 },
      );
    } finally {
      if (!restored) vi.useRealTimers();
    }
  });
});

describe('<RoulettePage /> rules-modal pause / resume', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
    playSpy.mockReset();
  });
  afterEach(() => unseed());

  it('opening the rules modal opens the dialog (PAUSE_TIMER is wired)', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RoulettePage />
      </MemoryRouter>,
    );
    await screen.findByText(/Auto-spin in/i);

    await user.click(screen.getByRole('button', { name: /show game rules/i }));
    // Modal renders + countdown still mounted while paused (PAUSE_TIMER snapshots).
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Auto-spin in/i)).toBeInTheDocument();
  });
});
