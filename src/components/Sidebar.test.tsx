import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import Sidebar from './Sidebar';
import { useSessionStore } from '@/store/sessionStore';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { markDrawSeen } from '@/systems/lottery-unread';
import type { User } from '@/db';
import type { LotteryDraw } from '@/db';

const testUser: User = {
  id: 'u-sidebar-test',
  username: 'TestUser',
  usernameLower: 'testuser',
  passwordHash: '',
  passwordSalt: '',
  pbkdf2Iterations: 600_000,
  avatarColor: '#a3122a',
  createdAt: Date.now(),
};

function makeDraw(id: string): LotteryDraw {
  return {
    id,
    drawAt: Date.now(),
    mainNumbers: [1, 2, 3, 4, 5],
    bonus: 3,
    totalLines: 0,
    totalRevenue: 0,
    totalPayout: 0,
  };
}

/** Render Sidebar inside a memory router at the given path. Extra paths are
 *  included so the router has somewhere to navigate when testing /lottery. */
function renderAtPath(path: string, collapsed = false) {
  const router = createMemoryRouter(
    [
      { path: '/lobby', element: <Sidebar collapsed={collapsed} /> },
      { path: '/play/coin-flip', element: <Sidebar collapsed={collapsed} /> },
      { path: '/play/bingo', element: <Sidebar collapsed={collapsed} /> },
      { path: '/lottery', element: <Sidebar collapsed={collapsed} /> },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

beforeEach(async () => {
  await resetDb();
  localStorage.clear();
  useSessionStore.setState({ currentUser: testUser, bootstrapping: false });
});

afterEach(async () => {
  await resetDb();
  localStorage.clear();
});

describe('Sidebar', () => {
  it('renders all 11 nav items when expanded', () => {
    renderAtPath('/lobby', false);
    expect(screen.getByText(/Lobby/)).toBeInTheDocument();
    expect(screen.getByText(/Coin Flip/)).toBeInTheDocument();
    expect(screen.getByText(/Blackjack/)).toBeInTheDocument();
    expect(screen.getByText(/Roulette/)).toBeInTheDocument();
    expect(screen.getByText(/Slots/)).toBeInTheDocument();
    expect(screen.getByText(/Baccarat/)).toBeInTheDocument();
    expect(screen.getByText(/Bingo/)).toBeInTheDocument();
    expect(screen.getByText(/Plinko/)).toBeInTheDocument();
    expect(screen.getByText(/Lottery/)).toBeInTheDocument();
    expect(screen.getByText(/Stats/)).toBeInTheDocument();
    expect(screen.getByText(/Leaderboard/)).toBeInTheDocument();
  });

  it('renders Bingo NavLink pointing to /play/bingo', () => {
    renderAtPath('/lobby');
    const link = screen.getByRole('link', { name: /bingo/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/play/bingo');
  });

  it('renders Plinko NavLink pointing to /play/plinko', () => {
    renderAtPath('/lobby');
    const link = screen.getByRole('link', { name: /plinko/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/play/plinko');
  });

  it('shows NEW badge on Baccarat (most recent ship)', () => {
    renderAtPath('/lobby');
    const badge = screen.getByText('NEW');
    expect(badge).toBeInTheDocument();
    // Badge sits in the Baccarat row.
    expect(badge.closest('a')).toHaveAttribute('href', '/play/baccarat');
  });

  it('does not show any stale phase tags (all games shipped)', () => {
    renderAtPath('/lobby');
    expect(screen.queryByText('P3')).not.toBeInTheDocument();
    expect(screen.queryByText('P4')).not.toBeInTheDocument();
    expect(screen.queryByText('P5')).not.toBeInTheDocument();
    expect(screen.queryByText('P6')).not.toBeInTheDocument();
  });

  it('hides content visually when collapsed (aria-hidden)', () => {
    const { container } = renderAtPath('/lobby', true);
    const aside = container.querySelector('aside');
    expect(aside?.getAttribute('aria-hidden')).toBe('true');
  });

  // --- LOTTERY entry + unread dot ---

  it('renders the LOTTERY link pointing to /lottery', () => {
    renderAtPath('/lobby');
    const link = screen.getByRole('link', { name: /LOTTERY/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/lottery');
  });

  it('shows the unread dot when a draw exists and has not been seen', async () => {
    await db.lotteryDraws.add(makeDraw('2026-05-18'));
    renderAtPath('/lobby');
    await waitFor(() => {
      expect(screen.getByTestId('unread-dot')).toBeInTheDocument();
    });
  });

  it('does not show the unread dot when the latest draw has already been seen', async () => {
    await db.lotteryDraws.add(makeDraw('2026-05-18'));
    markDrawSeen(testUser.id, '2026-05-18');
    renderAtPath('/lobby');
    // Give the live query time to settle — dot must remain absent.
    await waitFor(() => {
      expect(screen.queryByTestId('unread-dot')).not.toBeInTheDocument();
    });
  });

  it('clears the unread dot when the user navigates to /lottery', async () => {
    await db.lotteryDraws.add(makeDraw('2026-05-18'));
    // Render at /lottery — the useEffect should mark it seen immediately.
    renderAtPath('/lottery');
    // Dot should not appear (or should disappear) after marking.
    await waitFor(() => {
      expect(screen.queryByTestId('unread-dot')).not.toBeInTheDocument();
    });
  });
});
