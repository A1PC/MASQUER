import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import AdminPokerPage from './AdminPokerPage';
import { resetDb } from '@/test/db-helpers';
import { db } from '@/db';
import type { PokerVariant } from '@/systems/stats';

/** Mirrors the FLATTENED shape HoldemPage actually writes to rounds.details
 *  (see HoldemPage's `doSettle`). Re-declared here to keep the test
 *  decoupled from any internal types. */
interface PersistedPokerDetails {
  readonly variant: PokerVariant;
  readonly tableSize: number;
  readonly stakes: { sb: number; bb: number };
  readonly handsPlayed: number;
  readonly rebuys: number;
  readonly biggestPotWon: number;
  readonly sessionId: string;
}

async function seedRow(opts: {
  id: string;
  variant: PokerVariant;
  betAmount: number;
  payoutChips: number;
  handsPlayed: number;
  biggestPotWon: number;
  playedAt: number;
  tableSize?: number;
  rebuys?: number;
}): Promise<void> {
  const netChange = opts.payoutChips - opts.betAmount;
  const outcome: 'win' | 'loss' | 'push' = netChange > 0 ? 'win' : netChange < 0 ? 'loss' : 'push';
  const details: PersistedPokerDetails = {
    variant: opts.variant,
    tableSize: opts.tableSize ?? 6,
    stakes: { sb: 5, bb: 10 },
    handsPlayed: opts.handsPlayed,
    rebuys: opts.rebuys ?? 0,
    biggestPotWon: opts.biggestPotWon,
    sessionId: `poker-${opts.id}`,
  };
  await db.rounds.add({
    id: opts.id,
    userId: 'u-1',
    game: 'poker',
    betAmount: opts.betAmount,
    payout: opts.payoutChips,
    netChange,
    outcome,
    details,
    balanceAfter: 1000,
    playedAt: opts.playedAt,
  });
}

describe('AdminPokerPage', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('renders the four top stat-card labels even when there is no data', async () => {
    render(
      <MemoryRouter>
        <AdminPokerPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/sessions played/i)).toBeInTheDocument());
    expect(screen.getByText(/hands played/i)).toBeInTheDocument();
    expect(screen.getByText(/house net chips/i)).toBeInTheDocument();
    expect(screen.getByText(/actual rtp/i)).toBeInTheDocument();
  });

  it('renders the four variant tabs with All selected by default', async () => {
    render(
      <MemoryRouter>
        <AdminPokerPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/sessions played/i)).toBeInTheDocument());
    const allTab = screen.getByRole('tab', { name: /^all$/i });
    const holdemTab = screen.getByRole('tab', { name: /hold'em/i });
    const drawTab = screen.getByRole('tab', { name: /five-card draw/i });
    const omahaTab = screen.getByRole('tab', { name: /omaha/i });
    expect(allTab).toHaveAttribute('aria-selected', 'true');
    expect(holdemTab).toHaveAttribute('aria-selected', 'false');
    expect(drawTab).toHaveAttribute('aria-selected', 'false');
    expect(omahaTab).toHaveAttribute('aria-selected', 'false');
  });

  it('renders the hero chart wrapper', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminPokerPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument(),
    );
  });

  it('renders the sessions / hands cards summing across all variants by default', async () => {
    await seedRow({
      id: 'p-1',
      variant: 'holdem',
      betAmount: 500,
      payoutChips: 800,
      handsPlayed: 10,
      biggestPotWon: 1200,
      playedAt: 1_000_000,
    });
    await seedRow({
      id: 'p-2',
      variant: 'omaha',
      betAmount: 500,
      payoutChips: 100,
      handsPlayed: 6,
      biggestPotWon: 300,
      playedAt: 2_000_000,
    });
    render(
      <MemoryRouter>
        <AdminPokerPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      const sessionsLabel = screen.getByText(/sessions played/i);
      const card = sessionsLabel.closest('[data-tone]');
      expect(card).not.toBeNull();
      expect(within(card as HTMLElement).getByText('2')).toBeInTheDocument();
    });
    const handsLabel = screen.getByText(/hands played/i);
    const handsCard = handsLabel.closest('[data-tone]');
    expect(handsCard).not.toBeNull();
    expect(within(handsCard as HTMLElement).getByText('16')).toBeInTheDocument();
  });

  it('renders the house-net card with green (positive tone) when house is ahead', async () => {
    // Casino-operator perspective: house ahead reads GREEN → tone="positive".
    await seedRow({
      id: 'p-1',
      variant: 'holdem',
      betAmount: 500,
      payoutChips: 100,
      handsPlayed: 5,
      biggestPotWon: 200,
      playedAt: 1_000_000,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminPokerPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-tone="positive"]')).toBeInTheDocument();
    });
    const positive = container.querySelector('[data-tone="positive"]') as HTMLElement;
    expect(positive.textContent).toContain('+400');
    expect(positive.textContent?.toLowerCase()).toContain('house ahead');
  });

  it('renders the house-net card with red (negative tone) when house is behind', async () => {
    await seedRow({
      id: 'p-1',
      variant: 'holdem',
      betAmount: 500,
      payoutChips: 900,
      handsPlayed: 5,
      biggestPotWon: 1000,
      playedAt: 1_000_000,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminPokerPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-tone="negative"]')).toBeInTheDocument();
    });
    const negative = container.querySelector('[data-tone="negative"]') as HTMLElement;
    expect(negative.textContent).toContain('-400');
    expect(negative.textContent?.toLowerCase()).toContain('house behind');
  });

  it('filters the recent-sessions table when a variant tab is selected', async () => {
    await seedRow({
      id: 'p-h',
      variant: 'holdem',
      betAmount: 500,
      payoutChips: 800,
      handsPlayed: 10,
      biggestPotWon: 1200,
      playedAt: 3_000_000,
    });
    await seedRow({
      id: 'p-o',
      variant: 'omaha',
      betAmount: 500,
      payoutChips: 100,
      handsPlayed: 6,
      biggestPotWon: 300,
      playedAt: 2_000_000,
    });
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <AdminPokerPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      const rows = container.querySelectorAll('[data-recent-sessions] tbody tr');
      expect(rows.length).toBe(2);
    });
    // Click the Hold'em tab — table should shrink to 1 row.
    const holdemTab = screen.getByRole('tab', { name: /hold'em/i });
    await user.click(holdemTab);
    await waitFor(() => {
      const rows = container.querySelectorAll('[data-recent-sessions] tbody tr');
      expect(rows.length).toBe(1);
    });
    const rows = container.querySelectorAll('[data-recent-sessions] tbody tr');
    expect(rows[0]!.textContent).toContain("Hold'em");
  });

  it('renders the biggest pots panel sorted by amount desc', async () => {
    await seedRow({
      id: 'p-1',
      variant: 'holdem',
      betAmount: 500,
      payoutChips: 800,
      handsPlayed: 5,
      biggestPotWon: 1200,
      playedAt: 1_000,
    });
    await seedRow({
      id: 'p-2',
      variant: 'omaha',
      betAmount: 500,
      payoutChips: 1500,
      handsPlayed: 5,
      biggestPotWon: 1800,
      playedAt: 2_000,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminPokerPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      const rows = container.querySelectorAll('[data-biggest-pots] tbody tr');
      expect(rows.length).toBe(2);
    });
    const rows = container.querySelectorAll('[data-biggest-pots] tbody tr');
    // 1,800 should be the first row.
    expect(rows[0]!.textContent).toContain('1,800');
    expect(rows[0]!.textContent).toContain('Omaha');
  });

  it('orders the recent sessions table newest first by playedAt desc', async () => {
    await seedRow({
      id: 'p-OLD',
      variant: 'holdem',
      betAmount: 500,
      payoutChips: 600,
      handsPlayed: 5,
      biggestPotWon: 400,
      playedAt: 1_000,
    });
    await seedRow({
      id: 'p-NEW',
      variant: 'omaha',
      betAmount: 500,
      payoutChips: 800,
      handsPlayed: 5,
      biggestPotWon: 900,
      playedAt: 9_999_999,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminPokerPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      const rows = container.querySelectorAll('[data-recent-sessions] tbody tr');
      expect(rows.length).toBe(2);
    });
    const rows = container.querySelectorAll('[data-recent-sessions] tbody tr');
    // Newer row first — Omaha variant in row 0.
    expect(rows[0]!.textContent).toContain('Omaha');
  });
});
