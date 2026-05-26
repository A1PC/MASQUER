import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YourTicketsSlide from './YourTicketsSlide';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { register } from '@/systems/auth';

describe('YourTicketsSlide', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('shows empty state when user has no tickets', async () => {
    const r = await register({ username: 'a', password: 'password123' });
    if (!r.ok) throw new Error();
    render(<YourTicketsSlide userId={r.user.id} />);
    await waitFor(() => expect(screen.getByText(/no tickets yet/i)).toBeInTheDocument());
  });

  it('renders a ticket row with line count and purchase date', async () => {
    const r = await register({ username: 'b', password: 'password123' });
    if (!r.ok) throw new Error();
    const purchasedAt = new Date('2026-05-19T18:00:00').getTime();
    await db.lotteryTickets.put({
      id: 'tk-1',
      userId: r.user.id,
      drawId: '2026-05-19',
      purchasedAt,
      totalCost: 20,
      lineCount: 2,
    });
    render(<YourTicketsSlide userId={r.user.id} />);
    await waitFor(() => expect(screen.getByText('2026-05-19')).toBeInTheDocument());
    // lineCount is rendered
    expect(screen.getByText(/2 lines/i)).toBeInTheDocument();
    // purchase date is rendered (locale string will contain some date/time portion)
    expect(screen.getByText(new Date(purchasedAt).toLocaleString())).toBeInTheDocument();
  });

  it('expands to show per-line 6-number lines on click', async () => {
    const r = await register({ username: 'c', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.lotteryTickets.put({
      id: 'tk-2',
      userId: r.user.id,
      drawId: '2026-05-19',
      purchasedAt: Date.now(),
      totalCost: 5,
      lineCount: 1,
    });
    await db.lotteryLines.put({
      id: 'ln-1',
      ticketId: 'tk-2',
      userId: r.user.id,
      drawId: '2026-05-19',
      mainNumbers: [7, 14, 21, 35, 42, 9],
      bonusNumber: 5,
      isLuckyDip: false,
      isFreeReentry: false,
      settled: false,
      matchTier: null,
      payout: 0,
    });
    const user = userEvent.setup();
    render(<YourTicketsSlide userId={r.user.id} />);
    await waitFor(() => expect(screen.getByText('2026-05-19')).toBeInTheDocument());
    // Click the row button to expand
    await user.click(screen.getByRole('button', { name: /2026-05-19/i }));
    // All 6 main numbers + bonus visible in the expanded line.
    const lineText = screen.getByText(/7 · 14 · 21 · 35 · 42 · 9/);
    expect(lineText).toBeInTheDocument();
    // Status: unsettled = pending
    expect(screen.getByText('pending')).toBeInTheDocument();
  });
});
