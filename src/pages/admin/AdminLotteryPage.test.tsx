import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminLotteryPage from './AdminLotteryPage';
import { resetDb } from '@/test/db-helpers';
import { db } from '@/db';

describe('AdminLotteryPage', () => {
  beforeEach(async () => {
    await resetDb();
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
      mainNumbers: [1, 2, 3, 4, 5],
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
      mainNumbers: [1, 2, 3, 4, 5],
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

  it('renders recent draws table when draws exist', async () => {
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [3, 12, 25, 41, 49],
      bonus: 7,
      totalLines: 1,
      totalRevenue: 10,
      totalPayout: 0,
    });
    render(
      <MemoryRouter>
        <AdminLotteryPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('2026-05-19')).toBeInTheDocument());
    expect(screen.getByText(/3 · 12 · 25 · 41 · 49/)).toBeInTheDocument();
  });
});
