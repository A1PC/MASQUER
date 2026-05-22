/**
 * CrapsPage e2e test.
 *
 * Strategy:
 *  - fake-indexeddb + wallet hydrated with 5_000 chips
 *  - useReducedMotion mocked → true (instant animations)
 *  - rollDice stubbed to a fixed sequence: [4,2]→6 (come-out sets point 6), then [3,3]→6 (point made → win)
 *  - Player sits down (Low tier) → places pass-line bet → rolls to set point → rolls point → win
 *  - LEAVE TABLE → assert one rounds row: game='craps', stake=buyIn, payout=finalBankroll
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

// Zero animation delay
vi.mock('framer-motion', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: () => true };
});

// Stub rollDice to a fixed sequence so the point lands deterministically
// Sequence: [4,2]→6 (come-out → sets point 6), [3,3]→6 (point phase → point made, win)
const rollSequence = [
  { d1: 4, d2: 2, total: 6, isHard: false },
  { d1: 3, d2: 3, total: 6, isHard: true },
  // fallback: any-7 to settle any edge case
  { d1: 3, d2: 4, total: 7, isHard: false },
  { d1: 3, d2: 4, total: 7, isHard: false },
];
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

describe('CrapsPage', () => {
  it('renders SetupPanel initially with CRAPS title and SIT DOWN button', () => {
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
        expect(screen.getByTestId !== undefined); // RTL available
        expect(screen.getByRole('button', { name: /LEAVE TABLE/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /ROLL/i })).toBeInTheDocument();
      },
      { timeout: 3_000 },
    );
  });

  it('full session: sit → pass-line → roll point → roll again → win → LEAVE → rounds row', async () => {
    renderPage();

    // Sit down on Low table
    await userEvent.click(screen.getByRole('button', { name: /SIT DOWN/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /ROLL/i })).toBeInTheDocument(), {
      timeout: 3_000,
    });

    // Place a pass-line bet (the Pass Line spot is clickable on come-out)
    const passSpot = document.querySelector('[data-bet-spot="pass"]');
    expect(passSpot).toBeTruthy();
    if (passSpot) await userEvent.click(passSpot);

    // Roll 1: [4,2]→6 → sets point to 6 (bankroll reduced by pass-line bet of 10)
    await userEvent.click(screen.getByRole('button', { name: /ROLL/i }));

    // Roll 2: [3,3]→6 → point made! Pass line wins (1:1). bankroll goes up.
    await userEvent.click(screen.getByRole('button', { name: /ROLL/i }));

    // Leave table
    await userEvent.click(screen.getByRole('button', { name: /LEAVE TABLE/i }));

    // Wait for session_over screen
    await waitFor(() => expect(screen.getByText(/SESSION OVER/i)).toBeInTheDocument(), {
      timeout: 5_000,
    });

    // Assert rounds row in DB
    await waitFor(
      async () => {
        const rows = await db.rounds.toArray();
        expect(rows).toHaveLength(1);
        const row = rows[0]!;
        expect(row.game).toBe('craps');
        expect(row.betAmount).toBe(BUY_IN); // stake = totalBoughtIn
        expect(row.payout).toBeGreaterThan(0); // payout = finalBankroll
        expect(row.netChange).toBe(row.payout - row.betAmount);
        const details = row.details as Record<string, unknown>;
        expect(details.tier).toBe('low');
        expect(details.rollsPlayed).toBe(2);
      },
      { timeout: 5_000 },
    );
  }, 30_000);

  it('PLAY AGAIN after SESSION OVER returns to SetupPanel', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /SIT DOWN/i }));
    await waitFor(
      () => expect(screen.getByRole('button', { name: /LEAVE TABLE/i })).toBeInTheDocument(),
      { timeout: 3_000 },
    );

    await userEvent.click(screen.getByRole('button', { name: /LEAVE TABLE/i }));
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

    // Initially puck is OFF
    expect(document.querySelector('[data-puck="off"]')).toBeTruthy();

    // Roll [4,2]→6 sets point
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

    // Pass line is enabled on come-out
    const passSpot = document.querySelector('[data-bet-spot="pass"]');
    expect(passSpot?.getAttribute('data-disabled')).toBe('false');

    // Roll [4,2]→6 → now in point phase → pass line disabled
    await userEvent.click(screen.getByRole('button', { name: /ROLL/i }));
    await waitFor(
      () => {
        const passSpotAfter = document.querySelector('[data-bet-spot="pass"]');
        expect(passSpotAfter?.getAttribute('data-disabled')).toBe('true');
      },
      { timeout: 3_000 },
    );
  });
});
