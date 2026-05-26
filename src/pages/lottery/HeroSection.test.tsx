import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import HeroSection from './HeroSection';
import { resetDb } from '@/test/db-helpers';
import { db } from '@/db';

// useSound is a thin store-backed hook. We mock at the module level so the
// per-ball reveal animation's audio cadence is observable in tests.
const playMock = vi.fn();
vi.mock('@/systems/sound/useSound', () => ({
  useSound: () => ({ play: playMock }),
}));

describe('HeroSection', () => {
  beforeEach(async () => {
    await resetDb();
    playMock.mockClear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 4, 19, 12, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('renders pre-draw countdown when today has no draw', () => {
    render(<HeroSection />);
    expect(screen.getByText(/next draw in/i)).toBeInTheDocument();
    expect(screen.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeInTheDocument();
  });

  it("renders 7 ball slots (6 main + 1 bonus) when today's draw is settled", async () => {
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [3, 12, 25, 41, 49, 33],
      bonus: 7,
      totalLines: 0,
      totalRevenue: 0,
      totalPayout: 0,
    });
    render(<HeroSection />);
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
    render(<HeroSection />);
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
    render(<HeroSection />);
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
});
