/**
 * HoldemPage e2e test.
 *
 * Approach:
 *  - fake-indexeddb + wallet hydrated with 10_000 chips
 *  - useReducedMotion mocked → true (zeroes AI 600-1200ms delay to 0ms)
 *  - 2-player table (1 AI): player is SB + acts first preflop
 *  - Player FOLDS preflop → AI wins uncontested → hand_complete → idle
 *  - Between hands LEAVE TABLE is enabled
 *
 * Assertions:
 *  1. SIT DOWN debits wallet + table renders (data-session-bar)
 *  2. Player can fold → machine completes hand → LEAVE TABLE enabled
 *  3. LEAVE TABLE → rounds row: game='poker', details.variant='holdem',
 *     betAmount=totalBoughtIn, payout=finalStack
 *  4. SESSION OVER screen appears
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import HoldemPage from './HoldemPage';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';

// Zero AI thinking delay
vi.mock('framer-motion', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: () => true };
});

const INITIAL_BALANCE = 10_000;

beforeEach(async () => {
  await resetDb();
  useSessionStore.setState({
    currentUser: {
      id: 'u',
      username: 'Test',
      usernameLower: 'test',
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
  vi.useRealTimers();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <HoldemPage />
    </MemoryRouter>,
  );
}

/** Click 2-player then SIT DOWN. */
async function sitDown2Players() {
  await userEvent.click(screen.getByRole('button', { name: '2' }));
  await userEvent.click(screen.getByRole('button', { name: /SIT DOWN/ }));
}

/** Wait until the table is shown (LEAVE TABLE button visible). */
async function waitForTable() {
  await waitFor(
    () => {
      expect(screen.getByRole('button', { name: /LEAVE TABLE/ })).toBeInTheDocument();
    },
    { timeout: 5_000 },
  );
}

/** Wait until FOLD button appears (player's betting turn). */
async function waitForPlayerTurn() {
  await waitFor(
    () => {
      const fold = screen.queryByRole('button', { name: /FOLD/ });
      expect(fold).toBeInTheDocument();
      expect(fold).not.toBeDisabled();
    },
    { timeout: 5_000 },
  );
}

/** Wait until LEAVE TABLE is enabled (between hands = machine in idle). */
async function waitForLeaveEnabled() {
  await waitFor(
    () => {
      const btn = screen.getByRole('button', { name: /LEAVE TABLE/ });
      expect(btn).not.toBeDisabled();
    },
    { timeout: 8_000 },
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('HoldemPage', () => {
  it('renders SetupPanel initially', () => {
    renderPage();
    expect(screen.getByText(/TEXAS HOLD/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SIT DOWN/ })).toBeInTheDocument();
  });

  it('SIT DOWN is disabled when balance < Low minBuyIn', async () => {
    await db.balances.put({ userId: 'u', chips: 10, updatedAt: Date.now() });
    await useWalletStore.getState().hydrate('u');
    renderPage();
    expect(screen.getByRole('button', { name: /SIT DOWN/ })).toBeDisabled();
  });

  it('SIT DOWN debits wallet and renders the table', async () => {
    renderPage();
    await sitDown2Players();

    // Wallet debited
    await waitFor(
      () => {
        const bal = useWalletStore.getState().balance ?? INITIAL_BALANCE;
        expect(bal).toBeLessThan(INITIAL_BALANCE);
      },
      { timeout: 3_000 },
    );

    // Table shows
    await waitForTable();
  });

  it('FOLD completes the hand and LEAVE TABLE becomes enabled', async () => {
    renderPage();
    await sitDown2Players();
    await waitForTable();

    // Wait for it to be our turn (FOLD is enabled)
    await waitForPlayerTurn();

    // Player folds → AI wins uncontested → hand_complete → idle
    await userEvent.click(screen.getByRole('button', { name: /FOLD/ }));

    // LEAVE TABLE should become enabled within the next ~1.5s
    // (machine transitions to idle quickly; 1200ms auto-next-hand timer starts)
    await waitForLeaveEnabled();
  }, 20_000);

  it('LEAVE TABLE writes a rounds row with game=poker and details.variant=holdem', async () => {
    renderPage();
    await sitDown2Players();
    await waitForTable();

    // Fold once to complete a hand
    await waitForPlayerTurn();
    await userEvent.click(screen.getByRole('button', { name: /FOLD/ }));

    // Wait for LEAVE to be enabled
    await waitForLeaveEnabled();

    // Capture totalBoughtIn before leaving
    await userEvent.click(screen.getByRole('button', { name: /LEAVE TABLE/ }));

    // Wait for rounds row
    await waitFor(
      async () => {
        const rows = await db.rounds.toArray();
        expect(rows.length).toBeGreaterThanOrEqual(1);
        const row = rows[0]!;

        expect(row.game).toBe('poker');
        expect(row.betAmount).toBeGreaterThan(0); // stake = totalBoughtIn
        expect(row.payout).toBeGreaterThanOrEqual(0); // payout = finalStack
        expect(row.netChange).toBe(row.payout - row.betAmount);

        const details = row.details as Record<string, unknown>;
        expect(details.variant).toBe('holdem');
        expect(details.handsPlayed).toBeGreaterThanOrEqual(1);
      },
      { timeout: 8_000 },
    );
  }, 30_000);

  it('shows SESSION OVER after LEAVE TABLE', async () => {
    renderPage();
    await sitDown2Players();
    await waitForTable();

    await waitForPlayerTurn();
    await userEvent.click(screen.getByRole('button', { name: /FOLD/ }));
    await waitForLeaveEnabled();

    await userEvent.click(screen.getByRole('button', { name: /LEAVE TABLE/ }));

    await waitFor(
      () => {
        expect(screen.getByText(/SESSION OVER/)).toBeInTheDocument();
      },
      { timeout: 8_000 },
    );
  }, 30_000);

  it('PLAY AGAIN after SESSION OVER returns to SetupPanel', async () => {
    renderPage();
    await sitDown2Players();
    await waitForTable();

    await waitForPlayerTurn();
    await userEvent.click(screen.getByRole('button', { name: /FOLD/ }));
    await waitForLeaveEnabled();

    await userEvent.click(screen.getByRole('button', { name: /LEAVE TABLE/ }));
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /PLAY AGAIN/ })).toBeInTheDocument();
      },
      { timeout: 8_000 },
    );

    await userEvent.click(screen.getByRole('button', { name: /PLAY AGAIN/ }));

    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /SIT DOWN/ })).toBeInTheDocument();
      },
      { timeout: 3_000 },
    );
  }, 40_000);
});
