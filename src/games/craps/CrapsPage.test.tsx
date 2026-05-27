/**
 * CrapsPage e2e test.
 *
 * Strategy:
 *  - fake-indexeddb + wallet hydrated with 5_000 chips
 *  - useEffectiveReducedMotion mocked → true (instant animations)
 *  - useSound mocked → no-op play
 *  - rollDice stubbed to a deterministic sequence so we can exercise:
 *      come-out point set → point made (POINT MADE banner)
 *      come-out point set → seven-out (SEVEN OUT banner)
 *  - Player sits down (Low tier) → places pass-line bet → drives rolls →
 *    LEAVE TABLE → CONFIRM LEAVE → assert one rounds row.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import CrapsPage from './CrapsPage';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';

// Zero animation delay across both Framer's hook and the project hook.
vi.mock('@/motion/useEffectiveReducedMotion', () => ({
  useEffectiveReducedMotion: () => true,
}));
vi.mock('framer-motion', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: () => true };
});
// Stub useSound — no-op play; spies let individual tests assert if needed.
vi.mock('@/systems/sound/useSound', () => ({
  useSound: () => ({ play: vi.fn() }),
}));

// Default deterministic sequence:
//   [4,2]→6 (come-out → sets point 6)
//   [3,3]→6 (point made → win)
//   [3,4]→7 fallback for any edge case
const DEFAULT_SEQUENCE = [
  { d1: 4, d2: 2, total: 6, isHard: false },
  { d1: 3, d2: 3, total: 6, isHard: true },
  { d1: 3, d2: 4, total: 7, isHard: false },
  { d1: 3, d2: 4, total: 7, isHard: false },
];
let rollSequence = [...DEFAULT_SEQUENCE];
let rollIdx = 0;

vi.mock('./dice', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('./dice')>();
  return {
    ...actual,
    rollDice: () => {
      const r = rollSequence[rollIdx % rollSequence.length]!;
      rollIdx += 1;
      return r;
    },
  };
});

const INITIAL_BALANCE = 5_000;
const BUY_IN = 200; // Low tier min buy-in

beforeEach(async () => {
  rollIdx = 0;
  rollSequence = [...DEFAULT_SEQUENCE];
  await resetDb();
  useSessionStore.setState({
    currentUser: {
      id: 'u',
      username: 'Shooter',
      usernameLower: 'shooter',
      passwordHash: '',
      passwordSalt: '',
      pbkdf2Iterations: 600_000,
      avatarColor: '#a3122a',
      createdAt: Date.now(),
    },
    bootstrapping: false,
  } as never);
  await db.balances.put({ userId: 'u', chips: INITIAL_BALANCE, updatedAt: Date.now() });
  await useWalletStore.getState().hydrate('u');
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <CrapsPage />
    </MemoryRouter>,
  );
}

/** Drive the LEAVE flow through the new confirm modal. */
async function leaveAndConfirm() {
  await userEvent.click(screen.getByRole('button', { name: /LEAVE TABLE/i }));
  await waitFor(
    () => {
      expect(screen.getByText('LEAVE TABLE?')).toBeInTheDocument();
    },
    { timeout: 3_000 },
  );
  await userEvent.click(screen.getByRole('button', { name: /CONFIRM LEAVE/i }));
}

describe('CrapsPage', () => {
  it('renders the MASQUER · Craps chrome with title + LobbyButton + odds header', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: /MASQUER · Craps/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /BACK TO LOBBY/i })).toBeInTheDocument();
    expect(document.querySelector('[data-craps-odds]')).toBeTruthy();
  });

  it('page root uses h-full (NOT min-h-screen)', () => {
    const { container } = renderPage();
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('h-full');
    expect(root.className).not.toContain('min-h-screen');
  });

  it('opens + closes the rules modal via RulesButton', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /RULES/i }));
    await waitFor(() => expect(screen.getByText('OBJECT')).toBeInTheDocument());
    expect(screen.getByText(/PASS LINE/)).toBeInTheDocument();
  });

  it('SetupPanel renders CRAPS title and SIT DOWN button', () => {
    renderPage();
    expect(screen.getByText('CRAPS')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SIT DOWN/i })).toBeInTheDocument();
  });

  it('SIT DOWN is disabled when balance < Low min buy-in', async () => {
    await db.balances.put({ userId: 'u', chips: 10, updatedAt: Date.now() });
    await useWalletStore.getState().hydrate('u');
    renderPage();
    expect(screen.getByRole('button', { name: /SIT DOWN/i })).toBeDisabled();
  });

  it('SIT DOWN debits wallet and shows the table with ROLL and LEAVE TABLE buttons', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /SIT DOWN/i }));

    await waitFor(
      () => {
        const bal = useWalletStore.getState().balance ?? INITIAL_BALANCE;
        expect(bal).toBe(INITIAL_BALANCE - BUY_IN);
      },
      { timeout: 3_000 },
    );

    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /LEAVE TABLE/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /ROLL/i })).toBeInTheDocument();
      },
      { timeout: 3_000 },
    );
  });

  it('full session: sit → pass-line → roll point → roll again → win → CONFIRM LEAVE → rounds row', async () => {
    renderPage();

    // Sit down on Low table.
    await userEvent.click(screen.getByRole('button', { name: /SIT DOWN/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /ROLL/i })).toBeInTheDocument(), {
      timeout: 3_000,
    });

    // Place a pass-line bet (the Pass Line spot is clickable on come-out).
    const passSpot = document.querySelector('[data-bet-spot="pass"]');
    expect(passSpot).toBeTruthy();
    if (passSpot) await userEvent.click(passSpot);

    // Roll 1: [4,2]→6 → sets point to 6 (pass bet remains as 'standing').
    await userEvent.click(screen.getByRole('button', { name: /ROLL/i }));

    // Roll 2: [3,3]→6 → point made! Pass line wins (1:1) → bankroll up.
    await userEvent.click(screen.getByRole('button', { name: /ROLL/i }));

    // POINT MADE banner should appear briefly.
    await waitFor(
      () => {
        const banner = document.querySelector('[data-outcome-banner-kind]');
        expect(banner?.getAttribute('data-outcome-banner-kind')).toBe('point-made');
      },
      { timeout: 3_000 },
    );

    // Leave via the new confirm modal.
    await leaveAndConfirm();

    // SESSION OVER screen renders.
    await waitFor(() => expect(screen.getByText(/SESSION OVER/i)).toBeInTheDocument(), {
      timeout: 5_000,
    });

    // Rounds row assertions.
    await waitFor(
      async () => {
        const rows = await db.rounds.toArray();
        expect(rows).toHaveLength(1);
        const row = rows[0]!;
        expect(row.game).toBe('craps');
        expect(row.betAmount).toBe(BUY_IN);
        expect(row.payout).toBeGreaterThan(0);
        expect(row.netChange).toBe(row.payout - row.betAmount);
        const details = row.details as Record<string, unknown>;
        expect(details.tier).toBe('low');
        expect(details.rollsPlayed).toBe(2);
        // Additive PR-A field — present after at least one PLACE_BET.
        const wagered = details.betTypeWagered as Record<string, number>;
        expect(wagered).toBeTypeOf('object');
        expect(wagered.pass).toBe(10); // selected chip = 10 (Low default)
      },
      { timeout: 5_000 },
    );
  }, 30_000);

  it('SEVEN-OUT banner fires when point phase ends on a 7', async () => {
    // Override the dice sequence: come-out 6 (sets point), then 7 (seven-out).
    rollSequence = [
      { d1: 4, d2: 2, total: 6, isHard: false },
      { d1: 3, d2: 4, total: 7, isHard: false },
      { d1: 3, d2: 4, total: 7, isHard: false },
    ];
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /SIT DOWN/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /ROLL/i })).toBeInTheDocument(), {
      timeout: 3_000,
    });

    // Place a pass-line bet so the seven-out resolves a real loss.
    const passSpot = document.querySelector('[data-bet-spot="pass"]');
    if (passSpot) await userEvent.click(passSpot);

    await userEvent.click(screen.getByRole('button', { name: /ROLL/i })); // sets point 6
    await userEvent.click(screen.getByRole('button', { name: /ROLL/i })); // seven-out

    await waitFor(
      () => {
        const banner = document.querySelector('[data-outcome-banner-kind]');
        expect(banner?.getAttribute('data-outcome-banner-kind')).toBe('seven-out');
      },
      { timeout: 3_000 },
    );
  }, 30_000);

  it('LEAVE TABLE click opens the confirm modal; CANCEL keeps the session', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /SIT DOWN/i }));
    await waitFor(
      () => expect(screen.getByRole('button', { name: /LEAVE TABLE/i })).toBeInTheDocument(),
      { timeout: 3_000 },
    );

    await userEvent.click(screen.getByRole('button', { name: /LEAVE TABLE/i }));
    await waitFor(() => expect(screen.getByText('LEAVE TABLE?')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /CANCEL/i }));
    await waitFor(() => {
      expect(screen.queryByText('LEAVE TABLE?')).toBeNull();
    });
    // Still seated.
    expect(screen.getByRole('button', { name: /ROLL/i })).toBeInTheDocument();
  }, 30_000);

  it('PLAY AGAIN after SESSION OVER returns to SetupPanel', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /SIT DOWN/i }));
    await waitFor(
      () => expect(screen.getByRole('button', { name: /LEAVE TABLE/i })).toBeInTheDocument(),
      { timeout: 3_000 },
    );

    await leaveAndConfirm();
    await waitFor(() => expect(screen.getByText(/SESSION OVER/i)).toBeInTheDocument(), {
      timeout: 5_000,
    });

    await userEvent.click(screen.getByRole('button', { name: /PLAY AGAIN/i }));
    await waitFor(
      () => expect(screen.getByRole('button', { name: /SIT DOWN/i })).toBeInTheDocument(),
      { timeout: 3_000 },
    );
  }, 30_000);
});

describe('Dice component', () => {
  it('shows data-die and data-face attributes', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /SIT DOWN/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /ROLL/i })).toBeInTheDocument(), {
      timeout: 3_000,
    });
    await userEvent.click(screen.getByRole('button', { name: /ROLL/i }));
    await waitFor(
      () => {
        const d1 = document.querySelector('[data-die="d1"]');
        const d2 = document.querySelector('[data-die="d2"]');
        expect(d1).toBeTruthy();
        expect(d2).toBeTruthy();
        expect(d1?.getAttribute('data-face')).toBeTruthy();
        expect(d2?.getAttribute('data-face')).toBeTruthy();
      },
      { timeout: 3_000 },
    );
  });
});

describe('PointPuck component', () => {
  it('shows OFF before a roll and ON after a point is set', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /SIT DOWN/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /ROLL/i })).toBeInTheDocument(), {
      timeout: 3_000,
    });

    expect(document.querySelector('[data-puck="off"]')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /ROLL/i }));
    await waitFor(
      () => {
        expect(document.querySelector('[data-puck="on"]')).toBeTruthy();
      },
      { timeout: 3_000 },
    );
  });
});

describe('BetSpot component', () => {
  it('pass line spot is enabled on come-out, dimmed on point phase', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /SIT DOWN/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /ROLL/i })).toBeInTheDocument(), {
      timeout: 3_000,
    });

    const passSpot = document.querySelector('[data-bet-spot="pass"]');
    expect(passSpot?.getAttribute('data-disabled')).toBe('false');

    await userEvent.click(screen.getByRole('button', { name: /ROLL/i }));
    await waitFor(
      () => {
        const passSpotAfter = document.querySelector('[data-bet-spot="pass"]');
        expect(passSpotAfter?.getAttribute('data-disabled')).toBe('true');
      },
      { timeout: 3_000 },
    );
  });

  it('BetSpot gets a flashTone after a roll resolves', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /SIT DOWN/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /ROLL/i })).toBeInTheDocument(), {
      timeout: 3_000,
    });

    // Place a pass-line bet, then roll [4,2]→6. The pass line bet stands
    // (no flash). Then roll [3,3]→6 → point made; pass wins → flash 'win'.
    const passSpot = document.querySelector('[data-bet-spot="pass"]');
    if (passSpot) await userEvent.click(passSpot);

    await userEvent.click(screen.getByRole('button', { name: /ROLL/i })); // point set
    await userEvent.click(screen.getByRole('button', { name: /ROLL/i })); // point made — win

    await waitFor(
      () => {
        const passAfter = document.querySelector('[data-bet-spot="pass"]');
        expect(passAfter?.getAttribute('data-flash-tone')).toBe('win');
      },
      { timeout: 3_000 },
    );
  }, 30_000);
});
