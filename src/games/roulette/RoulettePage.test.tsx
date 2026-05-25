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

describe('<RoulettePage /> auto-spin via the 30 s window', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
    playSpy.mockReset();
  });
  afterEach(() => unseed());

  it('after INITIAL_BET_WINDOW_MS, the wheel auto-spins (zero bets → one zero-stake row)', async () => {
    // ── Why this test uses REAL timers (not fake) ─────────────────────────
    // The original implementation drove the 30 s bet-window forward with
    // `vi.useFakeTimers` + `vi.advanceTimersByTimeAsync`, then switched to
    // real timers to let Dexie/`recordSpinOnly` commit. That combination is
    // flaky in CI: XState `after(...)` delays + React commit/effect cycle +
    // fake-indexeddb's setImmediate-via-jsdom-escape all race in ways that
    // sometimes leave the `settled` state's `useEffect` un-run when we hand
    // control back to real timers (Phase-12 lesson: fake-timer bursts can
    // skip microtask deliveries; the symptom in CI was an empty
    // `db.rounds.toArray()` despite a 2 s waitFor).
    //
    // Instead we shrink the auto-spin window to ~50 ms by mutating
    // `ROULETTE_CONFIG.INITIAL_BET_WINDOW_MS` for this single test (and
    // restore it in `finally`). The machine reads the value lazily via its
    // `delays.initialBetWindow` thunk, so the override takes effect on the
    // next entry to `placing_bets`. Real timers + a generous `waitFor`
    // timeout then deterministically observe the Dexie write.
    const realBetWindowMs = ROULETTE_CONFIG.INITIAL_BET_WINDOW_MS;
    (ROULETTE_CONFIG as { INITIAL_BET_WINDOW_MS: number }).INITIAL_BET_WINDOW_MS = 50;
    try {
      render(
        <MemoryRouter>
          <RoulettePage />
        </MemoryRouter>,
      );
      await screen.findByText(/Auto-spin in/i);
      // ADR-0046 amendment: the zero-bet auto-spin writes a single
      // zero-stake `rounds` row so the recent-results feed stays in sync
      // with the wheel. 5 s timeout covers CI's slower jsdom +
      // fake-indexeddb pipeline.
      await waitFor(
        async () => {
          const rows = await db.rounds.toArray();
          expect(rows).toHaveLength(1);
          expect(rows[0]!.betAmount).toBe(0);
          expect(rows[0]!.payout).toBe(0);
          expect(rows[0]!.netChange).toBe(0);
          expect(rows[0]!.outcome).toBe('push');
          expect(rows[0]!.id.startsWith('spin-only-')).toBe(true);
        },
        { timeout: 5_000 },
      );
    } finally {
      (ROULETTE_CONFIG as { INITIAL_BET_WINDOW_MS: number }).INITIAL_BET_WINDOW_MS =
        realBetWindowMs;
    }
  }, 10_000);
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
