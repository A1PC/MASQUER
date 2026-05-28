import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import HeroSection from './HeroSection';
import { resetDb } from '@/test/db-helpers';
import { db } from '@/db';
import { lotterySeenKey, markDrawSeen } from '@/systems/lottery-unread';

// useSound is a thin store-backed hook. We mock at the module level so the
// per-ball reveal animation's audio cadence is observable in tests.
const playMock = vi.fn();
vi.mock('@/systems/sound/useSound', () => ({
  useSound: () => ({ play: playMock }),
}));

const TEST_USER = 'u-hero-test';

describe('HeroSection', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.clear();
    playMock.mockClear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 4, 19, 12, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('renders pre-draw countdown when today has no draw and no past draws', () => {
    render(<HeroSection userId={TEST_USER} />);
    expect(screen.getByText(/next draw in/i)).toBeInTheDocument();
    expect(screen.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeInTheDocument();
    expect(document.querySelector('[data-hero-state="pre-draw"]')).toBeInTheDocument();
    // No "last draw" strip
    expect(document.querySelector('[data-last-draw]')).toBeNull();
  });

  it("renders 7 ball slots (6 main + 1 bonus) when today's draw is settled and unseen", async () => {
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [3, 12, 25, 41, 49, 33],
      bonus: 7,
      totalLines: 0,
      totalRevenue: 0,
      totalPayout: 0,
    });
    render(<HeroSection userId={TEST_USER} />);
    await waitFor(() => {
      expect(screen.getByRole('listitem', { name: 'Winning ball 3' })).toBeInTheDocument();
    });
    expect(screen.getByRole('listitem', { name: /winning ball 12/i })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: /winning ball 25/i })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: /winning ball 41/i })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: /winning ball 49/i })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: /winning ball 33/i })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: /bonus ball 7/i })).toBeInTheDocument();
  });

  it("differentiates the bonus ball via data-ball-color='bonus'", async () => {
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [1, 2, 3, 4, 5, 6],
      bonus: 9,
      totalLines: 0,
      totalRevenue: 0,
      totalPayout: 0,
    });
    render(<HeroSection userId={TEST_USER} />);
    await waitFor(() => {
      const balls = screen.getAllByRole('listitem');
      expect(balls).toHaveLength(7);
    });
    const bonus = screen.getByRole('listitem', { name: /bonus ball 9/i });
    expect(bonus).toHaveAttribute('data-ball-color', 'bonus');
    const main = screen.getByRole('listitem', { name: /winning ball 1/i });
    expect(main).toHaveAttribute('data-ball-color', 'main');
  });

  it('plays the per-ball drop sound for each of the 7 balls on first reveal', async () => {
    // Use real timers for this case so the per-ball setTimeout cadence fires.
    // Drop-id is derived from `dateStringFor(Date.now())`, so the seeded draw
    // id must match today (the real current date).
    vi.useRealTimers();
    const todayId = (() => {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    })();
    await db.lotteryDraws.put({
      id: todayId,
      drawAt: Date.now(),
      mainNumbers: [1, 2, 3, 4, 5, 6],
      bonus: 9,
      totalLines: 0,
      totalRevenue: 0,
      totalPayout: 0,
    });
    render(<HeroSection userId={TEST_USER} />);
    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(7);
    });
    // Wait for the staggered ball.drop timers (250 ms × 7 = 1750 ms).
    await waitFor(
      () => {
        const dropCalls = playMock.mock.calls.filter((c) => c[0] === 'ball.drop');
        expect(dropCalls.length).toBeGreaterThanOrEqual(7);
      },
      { timeout: 3000 },
    );
  });

  it("marks today's draw as seen on mount so a re-mount shows the countdown view instead of replaying the reveal", async () => {
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [3, 12, 25, 41, 49, 33],
      bonus: 7,
      totalLines: 0,
      totalRevenue: 0,
      totalPayout: 0,
    });
    const { unmount } = render(<HeroSection userId={TEST_USER} />);
    // Wait for the post-draw reveal hero to appear.
    await waitFor(() => {
      expect(document.querySelector('[data-hero-state="post-draw"]')).toBeInTheDocument();
    });
    // localStorage should now contain the seen marker.
    await waitFor(() => {
      expect(localStorage.getItem(lotterySeenKey(TEST_USER))).toBe('2026-05-19');
    });
    unmount();

    // Re-mount: the seen marker should suppress the reveal and render the
    // countdown view with the most-recent draw's numbers underneath.
    render(<HeroSection userId={TEST_USER} />);
    await waitFor(() => {
      expect(document.querySelector('[data-hero-state="post-draw-seen"]')).toBeInTheDocument();
    });
    // No big balls — only small ones in the last-draw strip.
    expect(document.querySelector('[data-big-ball]')).toBeNull();
    const smallBalls = document.querySelectorAll('[data-small-ball]');
    expect(smallBalls).toHaveLength(7);
    // Countdown is still visible.
    expect(screen.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeInTheDocument();
    // Draw id label is visible in the last-draw strip.
    expect(screen.getByText('2026-05-19')).toBeInTheDocument();
  });

  it('renders the most-recent past draw underneath the countdown when there is no draw today', async () => {
    // Today (2026-05-19) has no draw, but yesterday does.
    await db.lotteryDraws.put({
      id: '2026-05-18',
      drawAt: new Date(2026, 4, 18, 20, 0, 0).getTime(),
      mainNumbers: [4, 11, 22, 33, 44, 50],
      bonus: 6,
      totalLines: 0,
      totalRevenue: 0,
      totalPayout: 0,
    });
    render(<HeroSection userId={TEST_USER} />);
    await waitFor(() => {
      expect(document.querySelector('[data-last-draw]')).toBeInTheDocument();
    });
    expect(document.querySelector('[data-hero-state="post-draw-seen"]')).toBeInTheDocument();
    // 6 main + 1 bonus small balls.
    expect(document.querySelectorAll('[data-small-ball]')).toHaveLength(7);
    // Bonus has the right color.
    const bonus = screen.getByRole('listitem', { name: /last bonus ball 6/i });
    expect(bonus).toHaveAttribute('data-ball-color', 'bonus');
  });

  it('does NOT mark seen / does NOT swap to countdown view for a different user', async () => {
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [1, 2, 3, 4, 5, 6],
      bonus: 9,
      totalLines: 0,
      totalRevenue: 0,
      totalPayout: 0,
    });
    // Mark seen for a different user.
    markDrawSeen('someone-else', '2026-05-19');
    render(<HeroSection userId={TEST_USER} />);
    // This user has NOT seen the draw → reveal hero renders.
    await waitFor(() => {
      expect(document.querySelector('[data-hero-state="post-draw"]')).toBeInTheDocument();
    });
  });
});
