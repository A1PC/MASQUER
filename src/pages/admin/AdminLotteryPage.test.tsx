import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminLotteryPage from './AdminLotteryPage';
import { resetDb } from '@/test/db-helpers';
import { db } from '@/db';

describe('AdminLotteryPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('admin.lottery.range');
  });

  it('renders all 4 stat card labels', async () => {
    render(
      <MemoryRouter>
        <AdminLotteryPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/tickets sold today/i)).toBeInTheDocument());
    expect(screen.getByText(/revenue \(all-time\)/i)).toBeInTheDocument();
    expect(screen.getByText(/payout \(all-time\)/i)).toBeInTheDocument();
    expect(screen.getByText(/house profit/i)).toBeInTheDocument();
  });

  it('renders profit card with positive tone when revenue > payout', async () => {
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [1, 2, 3, 4, 5, 6],
      bonus: 1,
      totalLines: 10,
      totalRevenue: 100,
      totalPayout: 30,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminLotteryPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/house profit/i)).toBeInTheDocument());
    await waitFor(() =>
      expect(container.querySelector('[data-tone="positive"]')).toBeInTheDocument(),
    );
  });

  it('renders profit card with negative tone when payout > revenue', async () => {
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [1, 2, 3, 4, 5, 6],
      bonus: 1,
      totalLines: 1,
      totalRevenue: 10,
      totalPayout: 100,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminLotteryPage />
      </MemoryRouter>,
    );
    // Scope the assertion to the House-profit card. "-90" also renders in the
    // RECENT DRAWS table P/L column (revenue 10 − payout 100), and the profit
    // card + table come from two independent useLiveQuery subscriptions that
    // resolve in nondeterministic order — a global getByText(/-90/) intermittently
    // matched both elements and threw "Found multiple elements" in CI.
    const card = await waitFor(() => {
      const el = container.querySelector('[data-tone="negative"]');
      expect(el).toBeInTheDocument();
      return el as HTMLElement;
    });
    expect(card.textContent).toContain('-90');
  });

  it('renders recent draws table when draws exist (with 6 main numbers per draw)', async () => {
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [3, 12, 25, 41, 49, 33],
      bonus: 7,
      totalLines: 1,
      totalRevenue: 5,
      totalPayout: 0,
    });
    render(
      <MemoryRouter>
        <AdminLotteryPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('2026-05-19')).toBeInTheDocument());
    expect(screen.getByText(/3 · 12 · 25 · 41 · 49 · 33/)).toBeInTheDocument();
  });

  it('shows a brand-consistent tier badge per draw (Phase 15 #9 restyle)', async () => {
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [1, 2, 3, 4, 5, 6],
      bonus: 1,
      totalLines: 1,
      totalRevenue: 5,
      totalPayout: 150,
    });
    await db.lotteryLines.put({
      id: 'line-1',
      ticketId: 'tkt',
      userId: 'u',
      drawId: '2026-05-19',
      mainNumbers: [1, 2, 3, 4, 7, 8],
      bonusNumber: 2,
      isLuckyDip: false,
      isFreeReentry: false,
      settled: true,
      matchTier: '4',
      payout: 150,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminLotteryPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('2026-05-19')).toBeInTheDocument());
    await waitFor(() =>
      expect(container.querySelector('[data-tier-badge="4"]')).toBeInTheDocument(),
    );
  });

  it('renders "None" tier badge when a draw has no winning lines', async () => {
    await db.lotteryDraws.put({
      id: '2026-05-20',
      drawAt: Date.now(),
      mainNumbers: [10, 20, 30, 40, 50, 11],
      bonus: 9,
      totalLines: 0,
      totalRevenue: 0,
      totalPayout: 0,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminLotteryPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('2026-05-20')).toBeInTheDocument());
    await waitFor(() =>
      expect(container.querySelector('[data-tier-badge="none"]')).toBeInTheDocument(),
    );
  });

  // Phase 15 #14 PR B — shared DateRangeFilter integration.
  it('renders the shared <DateRangeFilter> with the four preset tabs', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminLotteryPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-date-range-filter]')).not.toBeNull();
    });
    expect(container.querySelector('[data-range="7d"]')).not.toBeNull();
    expect(container.querySelector('[data-range="30d"]')).not.toBeNull();
    expect(container.querySelector('[data-range="90d"]')).not.toBeNull();
    expect(container.querySelector('[data-range="all"]')).not.toBeNull();
  });

  it('persists the clicked preset to localStorage under admin.lottery.range', async () => {
    localStorage.removeItem('admin.lottery.range');
    const { container } = render(
      <MemoryRouter>
        <AdminLotteryPage />
      </MemoryRouter>,
    );
    const btn = await waitFor(() => {
      const b = container.querySelector('[data-range="7d"]');
      expect(b).not.toBeNull();
      return b as HTMLButtonElement;
    });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(btn.getAttribute('aria-selected')).toBe('true');
    });
    expect(localStorage.getItem('admin.lottery.range')).toBe('7d');
  });
});
