import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HistorySlide from './HistorySlide';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { register } from '@/systems/auth';

describe('HistorySlide', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('shows the empty state when no draws exist', async () => {
    const r = await register({ username: 'a', password: 'password123' });
    if (!r.ok) throw new Error();
    render(<HistorySlide userId={r.user.id} />);
    await waitFor(() => expect(screen.getByText(/no draws yet/i)).toBeInTheDocument());
  });

  it('renders a draw row with winning numbers', async () => {
    const r = await register({ username: 'b', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [3, 12, 25, 41, 49],
      bonus: 7,
      totalLines: 0,
      totalRevenue: 0,
      totalPayout: 0,
    });
    render(<HistorySlide userId={r.user.id} />);
    await waitFor(() => expect(screen.getByText('2026-05-19')).toBeInTheDocument());
    expect(screen.getByText(/3 · 12 · 25 · 41 · 49/)).toBeInTheDocument();
  });

  it('expands to show per-line detail on click', async () => {
    const r = await register({ username: 'c', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [3, 12, 25, 41, 49],
      bonus: 7,
      totalLines: 1,
      totalRevenue: 10,
      totalPayout: 0,
    });
    await db.lotteryTickets.put({
      id: 't-1',
      userId: r.user.id,
      drawId: '2026-05-19',
      purchasedAt: Date.now(),
      totalCost: 10,
      lineCount: 1,
    });
    await db.lotteryLines.put({
      id: 'l-1',
      ticketId: 't-1',
      userId: r.user.id,
      drawId: '2026-05-19',
      mainNumbers: [1, 2, 3, 4, 5],
      bonusNumber: 7,
      isLuckyDip: false,
      isFreeReentry: false,
      settled: true,
      matchTier: '2+bonus',
      payout: 0,
    });
    const user = userEvent.setup();
    render(<HistorySlide userId={r.user.id} />);
    await waitFor(() => expect(screen.getByText('2026-05-19')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /2026-05-19/i }));
    expect(screen.getByText(/2\+bonus/i)).toBeInTheDocument();
  });
});
