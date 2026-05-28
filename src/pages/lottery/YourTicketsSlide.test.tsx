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

  it("highlights matched main numbers + bonus against the line's draw when expanded (settled ticket)", async () => {
    const r = await register({ username: 'h', password: 'password123' });
    if (!r.ok) throw new Error();
    // Draw exists for 2026-05-19. Winning mains: [7, 14, 21, 35, 42, 9]. Bonus: 5.
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [7, 14, 21, 35, 42, 9],
      bonus: 5,
      totalLines: 0,
      totalRevenue: 0,
      totalPayout: 0,
    });
    await db.lotteryTickets.put({
      id: 'tk-hl',
      userId: r.user.id,
      drawId: '2026-05-19',
      purchasedAt: Date.now(),
      totalCost: 5,
      lineCount: 1,
    });
    // Line picks: 7 and 21 are matches (from main draw). Bonus is 5 (match).
    // 1, 2, 3, 4 are non-matches.
    await db.lotteryLines.put({
      id: 'ln-hl',
      ticketId: 'tk-hl',
      userId: r.user.id,
      drawId: '2026-05-19',
      mainNumbers: [7, 21, 1, 2, 3, 4],
      bonusNumber: 5,
      isLuckyDip: false,
      isFreeReentry: false,
      settled: true,
      matchTier: '2',
      payout: 0,
    });
    const user = userEvent.setup();
    render(<YourTicketsSlide userId={r.user.id} />);
    await waitFor(() => expect(screen.getByText('2026-05-19')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /2026-05-19/i }));
    await waitFor(() => {
      expect(document.querySelectorAll('[data-matched="true"]')).toHaveLength(2); // 7, 21
    });
    // Bonus 5 is highlighted via data-matched-bonus.
    expect(document.querySelector('[data-matched-bonus="true"]')).toBeInTheDocument();
  });

  it('does NOT highlight any numbers for an unsettled (no-draw) ticket', async () => {
    const r = await register({ username: 'p', password: 'password123' });
    if (!r.ok) throw new Error();
    // No draw row for 2026-05-25 yet.
    await db.lotteryTickets.put({
      id: 'tk-pending',
      userId: r.user.id,
      drawId: '2026-05-25',
      purchasedAt: Date.now(),
      totalCost: 5,
      lineCount: 1,
    });
    await db.lotteryLines.put({
      id: 'ln-pending',
      ticketId: 'tk-pending',
      userId: r.user.id,
      drawId: '2026-05-25',
      mainNumbers: [1, 2, 3, 4, 5, 6],
      bonusNumber: 7,
      isLuckyDip: false,
      isFreeReentry: false,
      settled: false,
      matchTier: null,
      payout: 0,
    });
    const user = userEvent.setup();
    render(<YourTicketsSlide userId={r.user.id} />);
    await waitFor(() => expect(screen.getByText('2026-05-25')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /2026-05-25/i }));
    await waitFor(() => {
      expect(document.querySelector('[data-line-id="ln-pending"]')).toBeInTheDocument();
    });
    expect(document.querySelector('[data-matched="true"]')).toBeNull();
    expect(document.querySelector('[data-matched-bonus="true"]')).toBeNull();
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
    // All 6 main numbers + bonus visible in the expanded line. Each number is
    // wrapped in its own span (for match highlighting), so assert against the
    // textContent of the line element rather than a single text-node match.
    await waitFor(() => {
      const lineEl = document.querySelector('[data-line-id="ln-1"]');
      expect(lineEl).not.toBeNull();
      const txt = (lineEl?.textContent ?? '').replace(/\s+/g, ' ');
      for (const n of [7, 14, 21, 35, 42, 9, 5]) {
        expect(txt).toContain(String(n));
      }
    });
    // Status: unsettled = pending
    expect(screen.getByText('pending')).toBeInTheDocument();
  });
});
