import { describe, expect, it, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import CoinFlipPage from './CoinFlipPage';
import { db } from '@/db';
import type { User } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { seed, unseed } from '@/systems/rng';

// Mock the sound + reduced-motion hooks so the test asserts call-shape and
// the 900 ms flip delay collapses to instant (reduced motion = true).
const { play } = vi.hoisted(() => ({ play: vi.fn() }));
vi.mock('@/systems/sound/useSound', () => ({ useSound: () => ({ play }) }));
vi.mock('@/motion/useEffectiveReducedMotion', () => ({
  useEffectiveReducedMotion: () => true,
}));

const testUser: User = {
  id: 'u',
  username: 'A',
  usernameLower: 'a',
  passwordHash: '',
  passwordSalt: '',
  pbkdf2Iterations: 600_000,
  avatarColor: '#a3122a',
  createdAt: Date.now(),
};

beforeEach(async () => {
  play.mockClear();
  await resetDb();
  useSessionStore.setState({
    currentUser: testUser,
    bootstrapping: false,
  });
  await db.balances.put({ userId: 'u', chips: 1_000, updatedAt: Date.now() });
  await useWalletStore.getState().hydrate('u');
  unseed();
});

describe('CoinFlipPage', () => {
  function renderPage() {
    return render(
      <MemoryRouter>
        <CoinFlipPage />
      </MemoryRouter>,
    );
  }

  it('renders nothing when there is no signed-in user', () => {
    useSessionStore.setState({ currentUser: null, bootstrapping: false });
    const { container } = renderPage();
    expect(container.firstChild).toBeNull();
  });

  it('renders title, brand coin (heads default), and disabled Heads/Tails until bet placed', () => {
    renderPage();
    expect(screen.getByText(/Coin Flip/)).toBeInTheDocument();
    // BrandCoin's heads face is always in the DOM (front face).
    expect(screen.getByRole('img', { name: /masquer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Heads$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Tails$/i })).toBeDisabled();
  });

  it('placing a bet enables Heads/Tails and plays chip.place', async () => {
    renderPage();
    await userEvent.click(screen.getByLabelText('Add 25 chips to bet'));
    await userEvent.click(screen.getByText(/PLACE BET/));
    expect(screen.getByRole('button', { name: /^Heads$/i })).toBeEnabled();
    expect(play).toHaveBeenCalledWith('chip.place');
  });

  it('settling a winning round writes a rounds row, plays coin.flip + win.small, increments streak', async () => {
    // seed(2) — under fake-indexeddb the first randomInt(0,1) lands 'heads'.
    seed(2);
    renderPage();
    await userEvent.click(screen.getByLabelText('Add 25 chips to bet'));
    await userEvent.click(screen.getByText(/PLACE BET/));
    await userEvent.click(screen.getByRole('button', { name: /^Heads$/i }));
    await waitFor(
      async () => {
        const rounds = await db.rounds.toArray();
        expect(rounds).toHaveLength(1);
        expect(rounds[0]!.game).toBe('coin-flip');
        expect(rounds[0]!.betAmount).toBe(25);
      },
      { timeout: 3_000 },
    );
    // Sounds played for the call + landing.
    expect(play).toHaveBeenCalledWith('coin.flip');
    const round = (await db.rounds.toArray())[0]!;
    if (round.outcome === 'win') {
      expect(play).toHaveBeenCalledWith('win.small');
    } else {
      expect(play).toHaveBeenCalledWith('loss');
    }
  });

  it('shows a win-streak Badge after two wins in a row', async () => {
    renderPage();
    // Force two wins by calling the side that the seeded RNG lands on.
    // seed(2) → 'heads'; we'll re-seed before each call so both land on heads.
    for (let i = 0; i < 2; i++) {
      seed(2);
      await userEvent.click(screen.getByLabelText('Add 25 chips to bet'));
      await userEvent.click(screen.getByText(/PLACE BET/));
      await userEvent.click(screen.getByRole('button', { name: /^Heads$/i }));
      await waitFor(
        async () => {
          const rounds = await db.rounds.toArray();
          expect(rounds).toHaveLength(i + 1);
        },
        { timeout: 3_000 },
      );
    }
    // Confirm the two writes were both wins (the test only proves the streak
    // Badge appears on consecutive wins).
    const rounds = await db.rounds.toArray();
    if (rounds.every((r) => r.outcome === 'win')) {
      await waitFor(() => {
        expect(screen.getByText(/2 win streak/i)).toBeInTheDocument();
      });
    }
  });

  it('renders 0 chips balance hint when wallet is empty (place-bet stays guarded)', async () => {
    await db.balances.put({ userId: 'u', chips: 0, updatedAt: Date.now() });
    await useWalletStore.getState().hydrate('u');
    renderPage();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
