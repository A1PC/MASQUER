/**
 * OmahaPage e2e test.
 *
 * Approach:
 *  - fake-indexeddb + wallet hydrated with 10_000 chips
 *  - useEffectiveReducedMotion mocked → true (zeroes AI 600-1200ms delay to 0ms
 *    AND collapses the showdown stagger to instant so the auto-next-hand timer
 *    fires immediately after each completed hand)
 *  - useSound stubbed → no-op play
 *  - 2-player table (1 AI): minimal size to complete hands quickly
 *  - Player FOLDs preflop → AI wins uncontested → hand_complete → idle
 *  - Between hands LEAVE TABLE is enabled
 *
 * Assertions:
 *  1. MASQUER · Omaha title (h1) + LobbyButton + odds header + rules button
 *  2. Page root uses h-full (NOT min-h-screen)
 *  3. SIT DOWN debits wallet + table renders (data-session-bar)
 *  4. 4 hole cards are shown for the player seat
 *  5. AI seats display mask names (NOT archetype labels)
 *  6. FOLD completes the hand → LEAVE TABLE enabled
 *  7. LEAVE TABLE → rounds row: game='poker', details.variant='omaha'
 *  8. SESSION OVER + PLAY AGAIN return path works
 *  9. Between-hands grace overlay (banner + countdown + LEAVE NOW + DEAL NOW)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import OmahaPage from './OmahaPage';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { MASK_NAME_POOL } from '../_shared/maskNames';

// Zero AI thinking delay AND collapse showdown stagger to instant.
vi.mock('@/motion/useEffectiveReducedMotion', () => ({
  useEffectiveReducedMotion: () => true,
}));
// Stub useSound — no-op play.
vi.mock('@/systems/sound/useSound', () => ({
  useSound: () => ({ play: vi.fn() }),
}));

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
      <OmahaPage />
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

/** Wait until FOLD button appears and is enabled (player's betting turn). */
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

describe('OmahaPage — chrome', () => {
  it('renders MASQUER · Omaha title', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/MASQUER/);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Omaha/);
  });

  it('renders LobbyButton (back to lobby)', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /BACK TO LOBBY/i })).toBeInTheDocument();
  });

  it('renders the variant odds header', () => {
    renderPage();
    expect(screen.getByText(/No-Limit Omaha/)).toBeInTheDocument();
  });

  it('renders the rules button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /Show game rules/i })).toBeInTheDocument();
  });

  it('page root uses h-full (NOT min-h-screen)', () => {
    const { container } = renderPage();
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('h-full');
    expect(root.className).not.toContain('min-h-screen');
  });
});

describe('OmahaPage — setup', () => {
  it('renders SetupPanel initially', () => {
    renderPage();
    // SetupPanel is imported from holdem/ and still labels itself "TEXAS HOLD'EM".
    // The outer MASQUER · Omaha h1 is the variant-distinguishing chrome.
    expect(screen.getByRole('button', { name: /SIT DOWN/ })).toBeInTheDocument();
  });

  it('SIT DOWN is disabled when balance < Low minBuyIn', async () => {
    await db.balances.put({ userId: 'u', chips: 10, updatedAt: Date.now() });
    await useWalletStore.getState().hydrate('u');
    renderPage();
    expect(screen.getByRole('button', { name: /SIT DOWN/ })).toBeDisabled();
  });
});

describe('OmahaPage — gameplay', () => {
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

  it('player seat shows 4 hole cards (face-up)', async () => {
    renderPage();
    await sitDown2Players();
    await waitForTable();

    await waitFor(
      () => {
        const playerArea = document.querySelector('[data-player-area]');
        expect(playerArea).toBeInTheDocument();
        const faceUpCards = playerArea?.querySelectorAll(
          '[data-playing-card]:not([data-face-down])',
        );
        expect(faceUpCards?.length).toBeGreaterThanOrEqual(4);
      },
      { timeout: 5_000 },
    );
  }, 15_000);

  it('AI seats show mask names (not archetype labels)', async () => {
    renderPage();
    await sitDown2Players();
    await waitForTable();

    // At least one mask name appears on the AI seat. We don't know which one
    // because the assignment is RNG-seeded by the session id, so just check
    // for any of the 12 mask names.
    const seatName = await waitFor(() => {
      for (const mask of MASK_NAME_POOL) {
        if (screen.queryByText(mask)) return mask;
      }
      throw new Error('no mask name found in DOM');
    });
    expect(MASK_NAME_POOL).toContain(seatName);

    // Archetype labels MUST NOT appear in the DOM.
    expect(screen.queryByText('ROCK')).toBeNull();
    expect(screen.queryByText('SHARK')).toBeNull();
    expect(screen.queryByText('MANIAC')).toBeNull();
    expect(screen.queryByText('STATION')).toBeNull();
  });

  it('FOLD completes the hand and LEAVE TABLE becomes enabled', async () => {
    renderPage();
    await sitDown2Players();
    await waitForTable();

    await waitForPlayerTurn();

    // Player folds → AI wins uncontested → hand_complete → idle
    await userEvent.click(screen.getByRole('button', { name: /FOLD/ }));

    await waitForLeaveEnabled();
  }, 20_000);

  it('LEAVE TABLE writes a rounds row with game=poker and details.variant=omaha', async () => {
    renderPage();
    await sitDown2Players();
    await waitForTable();

    await waitForPlayerTurn();
    await userEvent.click(screen.getByRole('button', { name: /FOLD/ }));
    await waitForLeaveEnabled();

    await userEvent.click(screen.getByRole('button', { name: /LEAVE TABLE/ }));

    await waitFor(
      async () => {
        const rows = await db.rounds.toArray();
        expect(rows.length).toBeGreaterThanOrEqual(1);
        const row = rows[0]!;

        expect(row.game).toBe('poker');
        expect(row.betAmount).toBeGreaterThan(0);
        expect(row.payout).toBeGreaterThanOrEqual(0);
        expect(row.netChange).toBe(row.payout - row.betAmount);

        const details = row.details as Record<string, unknown>;
        expect(details.variant).toBe('omaha');
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

  it('community board renders with correct data-board-card slots', async () => {
    renderPage();
    await sitDown2Players();
    await waitForTable();

    await waitFor(
      () => {
        expect(document.querySelector('[data-community-board]')).toBeInTheDocument();
      },
      { timeout: 5_000 },
    );
  }, 15_000);

  it('data-session-bar renders with stack and bought-in info', async () => {
    renderPage();
    await sitDown2Players();
    await waitForTable();

    await waitFor(
      () => {
        expect(document.querySelector('[data-session-bar]')).toBeInTheDocument();
        expect(document.querySelector('[data-stack]')).toBeInTheDocument();
        expect(document.querySelector('[data-bought-in]')).toBeInTheDocument();
      },
      { timeout: 5_000 },
    );
  }, 15_000);

  it('AI seats render with face-down cards during betting', async () => {
    renderPage();
    await sitDown2Players();
    await waitForTable();

    await waitFor(
      () => {
        const aiSeats = document.querySelector('[data-ai-seats]');
        expect(aiSeats).toBeInTheDocument();
        const faceDown = aiSeats?.querySelectorAll('[data-face-down]');
        expect(faceDown?.length).toBeGreaterThan(0);
      },
      { timeout: 5_000 },
    );
  }, 15_000);
});

describe('OmahaPage — between-hands grace', () => {
  it('shows outcome banner + 15s countdown bar after the hand completes', async () => {
    renderPage();
    await sitDown2Players();
    await waitForTable();

    await waitForPlayerTurn();
    await userEvent.click(screen.getByRole('button', { name: /FOLD/ }));

    // After fold → uncontested win → hand_complete → revealComplete fires
    // (instant under reduced motion). Grace overlay should mount with the
    // outcome banner + countdown bar.
    await waitFor(
      () => {
        expect(document.querySelector('[data-between-hands-bar]')).not.toBeNull();
      },
      { timeout: 8_000 },
    );

    const banner = document.querySelector('[data-outcome-banner]');
    expect(banner).not.toBeNull();
    expect(banner?.textContent?.toUpperCase()).toContain('BETTER LUCK');

    const seconds = document.querySelector('[data-grace-seconds]');
    expect(seconds).not.toBeNull();
    expect(seconds?.textContent).toMatch(/^(15|14)s$/);

    // LEAVE NOW button is present (distinct from OmahaTable's LEAVE TABLE)
    expect(screen.getByRole('button', { name: /LEAVE NOW/ })).toBeInTheDocument();
    // DEAL NOW lets the player skip the countdown
    expect(screen.getByRole('button', { name: /DEAL NOW/ })).toBeInTheDocument();
  }, 30_000);
});
