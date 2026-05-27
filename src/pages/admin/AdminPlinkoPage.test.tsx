import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminPlinkoPage from './AdminPlinkoPage';
import { resetDb } from '@/test/db-helpers';
import { db } from '@/db';
import type { PlinkoRisk } from '@/systems/stats';

/** Mirrors the FLATTENED shape plinko actually writes to rounds.details
 *  (see PlinkoPage's `settle` call). Re-declared here to keep the test
 *  decoupled from any internal types. */
interface PersistedPlinkoDetails {
  readonly risk: PlinkoRisk;
  readonly bin: number;
  readonly multiplier: number;
}

async function seedRow(opts: {
  id: string;
  risk: PlinkoRisk;
  bin: number;
  multiplier: number;
  betAmount: number;
  payoutChips: number;
  playedAt: number;
}): Promise<void> {
  const netChange = opts.payoutChips - opts.betAmount;
  const outcome: 'win' | 'loss' | 'push' = netChange > 0 ? 'win' : netChange < 0 ? 'loss' : 'push';
  const details: PersistedPlinkoDetails = {
    risk: opts.risk,
    bin: opts.bin,
    multiplier: opts.multiplier,
  };
  await db.rounds.add({
    id: opts.id,
    userId: 'u-1',
    game: 'plinko',
    betAmount: opts.betAmount,
    payout: opts.payoutChips,
    netChange,
    outcome,
    details,
    balanceAfter: 1000,
    playedAt: opts.playedAt,
  });
}

describe('AdminPlinkoPage', () => {
  beforeEach(async () => {
    await resetDb();
    // Phase 15 #14 PR B — the DateRangeFilter persists to localStorage; clear
    // it between cases so tests stay isolated (otherwise a prior case's
    // "30d" selection would hide fixture rows seeded with low playedAt
    // values).
    localStorage.removeItem('admin.plinko.range');
  });

  it('renders the four top stat-card labels even when there is no data', async () => {
    render(
      <MemoryRouter>
        <AdminPlinkoPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText(/balls dropped \(all-time\)/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/house net chips/i)).toBeInTheDocument();
    expect(screen.getByText(/actual rtp/i)).toBeInTheDocument();
    expect(screen.getByText(/jackpots hit/i)).toBeInTheDocument();
    expect(screen.getByText(/no plinko drops recorded yet/i)).toBeInTheDocument();
  });

  it('renders the four per-risk mini-bars and four multiplier curve sparklines', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminPlinkoPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/per-risk drops/i)).toBeInTheDocument());
    expect(container.querySelector('[data-mini-bar="Safe"]')).toBeInTheDocument();
    expect(container.querySelector('[data-mini-bar="Low"]')).toBeInTheDocument();
    expect(container.querySelector('[data-mini-bar="Medium"]')).toBeInTheDocument();
    expect(container.querySelector('[data-mini-bar="High"]')).toBeInTheDocument();
    expect(container.querySelector('[data-curve-risk="safe"]')).toBeInTheDocument();
    expect(container.querySelector('[data-curve-risk="low"]')).toBeInTheDocument();
    expect(container.querySelector('[data-curve-risk="medium"]')).toBeInTheDocument();
    expect(container.querySelector('[data-curve-risk="high"]')).toBeInTheDocument();
  });

  it('renders the ballsDropped count after rows are added', async () => {
    await seedRow({
      id: 'p-1',
      risk: 'medium',
      bin: 0,
      multiplier: 6000,
      betAmount: 100,
      payoutChips: 200,
      playedAt: 1_000,
    });
    await seedRow({
      id: 'p-2',
      risk: 'high',
      bin: 26,
      multiplier: 60000,
      betAmount: 50,
      payoutChips: 0,
      playedAt: 2_000,
    });

    render(
      <MemoryRouter>
        <AdminPlinkoPage />
      </MemoryRouter>,
    );

    const card = await waitFor(() => {
      const label = screen.getByText(/balls dropped \(all-time\)/i);
      const c = label.closest('[data-tone]');
      expect(c).not.toBeNull();
      const valueNode = within(c as HTMLElement).getByText('2');
      expect(valueNode).toBeInTheDocument();
      return c as HTMLElement;
    });
    expect(card).toBeInTheDocument();
  });

  it('renders the actual RTP card derived from totalPaid / totalWagered', async () => {
    await seedRow({
      id: 'p-1',
      risk: 'safe',
      bin: 13,
      multiplier: 0.94,
      betAmount: 100,
      payoutChips: 95,
      playedAt: 1_000,
    });
    render(
      <MemoryRouter>
        <AdminPlinkoPage />
      </MemoryRouter>,
    );
    // Scope the RTP assertion to the Actual RTP stat card so it doesn't
    // collide with the per-risk MiniBar's RTP (which is also 95.0% when
    // the only seeded round is safe-risk).
    await waitFor(() => {
      const label = screen.getByText(/actual rtp/i);
      const c = label.closest('[data-tone]');
      expect(c).not.toBeNull();
      expect(within(c as HTMLElement).getByText(/95\.0%/)).toBeInTheDocument();
    });
  });

  it('renders the house-net card with positive tone when house is ahead', async () => {
    await seedRow({
      id: 'p-1',
      risk: 'low',
      bin: 13,
      multiplier: 0.89,
      betAmount: 100,
      payoutChips: 0,
      playedAt: 1,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminPlinkoPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-tone="positive"]')).toBeInTheDocument();
    });
    const positive = container.querySelector('[data-tone="positive"]') as HTMLElement;
    expect(positive.textContent).toContain('+100');
    expect(positive.textContent?.toLowerCase()).toContain('house ahead');
  });

  it('renders the house-net card with negative tone when house is behind', async () => {
    await seedRow({
      id: 'p-1',
      risk: 'high',
      bin: 0,
      multiplier: 60000,
      betAmount: 10,
      payoutChips: 90,
      playedAt: 1,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminPlinkoPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-tone="negative"]')).toBeInTheDocument();
    });
    const negative = container.querySelector('[data-tone="negative"]') as HTMLElement;
    expect(negative.textContent).toContain('-80');
    expect(negative.textContent?.toLowerCase()).toContain('house behind');
  });

  it('renders the Jackpots Hit card incrementing only on high-risk edge bins', async () => {
    // Jackpot — high-risk edge bin.
    await seedRow({
      id: 'p-1',
      risk: 'high',
      bin: 0,
      multiplier: 60000,
      betAmount: 10,
      payoutChips: 100,
      playedAt: 1,
    });
    // Medium-risk edge bin — NOT a jackpot.
    await seedRow({
      id: 'p-2',
      risk: 'medium',
      bin: 26,
      multiplier: 6000,
      betAmount: 10,
      payoutChips: 100,
      playedAt: 2,
    });
    // High-risk centre — NOT a jackpot.
    await seedRow({
      id: 'p-3',
      risk: 'high',
      bin: 13,
      multiplier: 0.71,
      betAmount: 10,
      payoutChips: 0,
      playedAt: 3,
    });

    render(
      <MemoryRouter>
        <AdminPlinkoPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      const label = screen.getByText(/jackpots hit/i);
      const card = label.closest('[data-tone]');
      expect(card).not.toBeNull();
      // Only 1 jackpot — high-risk edge.
      expect(within(card as HTMLElement).getByText('1')).toBeInTheDocument();
    });
  });

  it('renders the recent drops table with risk badge + edge-styled bin', async () => {
    await seedRow({
      id: 'p-1',
      risk: 'high',
      bin: 26,
      multiplier: 60000,
      betAmount: 50,
      payoutChips: 100,
      playedAt: 1_000,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminPlinkoPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/recent drops \(last 20\)/i)).toBeInTheDocument());
    const riskBadge = await waitFor(() => {
      const el = container.querySelector('[data-risk="high"]');
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    expect(riskBadge.textContent?.toLowerCase()).toContain('high');
    // Bin 26 should be marked as edge.
    expect(container.querySelector('[data-bin-kind="edge"]')).toBeInTheDocument();
    // Multiplier formatted with "×" suffix + tabular-nums in the table row.
    // (The "60,000×" string also appears in the per-risk multiplier curve
    // edge label; scope the assertion to the recent-drops <tbody>.)
    const tbody = container.querySelector('tbody');
    expect(tbody).not.toBeNull();
    expect(tbody!.textContent).toContain('60,000×');
  });

  it('renders the bin-distribution chart wrapper once data exists', async () => {
    await seedRow({
      id: 'p-1',
      risk: 'safe',
      bin: 13,
      multiplier: 0.94,
      betAmount: 100,
      payoutChips: 50,
      playedAt: 1,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminPlinkoPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument(),
    );
  });

  // Phase 15 #14 PR B — shared DateRangeFilter integration.
  it('renders the shared <DateRangeFilter> with the four preset tabs', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminPlinkoPage />
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

  it('persists the clicked preset to localStorage under admin.plinko.range', async () => {
    localStorage.removeItem('admin.plinko.range');
    const { container } = render(
      <MemoryRouter>
        <AdminPlinkoPage />
      </MemoryRouter>,
    );
    const btn = await waitFor(() => {
      const b = container.querySelector('[data-range="30d"]');
      expect(b).not.toBeNull();
      return b as HTMLButtonElement;
    });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(btn.getAttribute('aria-selected')).toBe('true');
    });
    expect(localStorage.getItem('admin.plinko.range')).toBe('30d');
  });

  it('orders the recent drops table newest first via playedAt desc', async () => {
    // Insert with playedAt values in ascending order; the page must sort
    // them descending by playedAt (load-all + sort-in-memory + slice-20,
    // #250 pattern).
    await seedRow({
      id: 'p-OLD',
      risk: 'safe',
      bin: 12,
      multiplier: 0.95,
      betAmount: 100,
      payoutChips: 50,
      playedAt: 1_000,
    });
    await seedRow({
      id: 'p-NEW',
      risk: 'high',
      bin: 0,
      multiplier: 60000,
      betAmount: 100,
      payoutChips: 5000,
      playedAt: 9_999_999,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminPlinkoPage />
      </MemoryRouter>,
    );
    // Wait for the live query to resolve and the rows to populate.
    await waitFor(() => {
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBeGreaterThanOrEqual(2);
    });
    // The first <tr> in the tbody should be the newer (p-NEW) row — its
    // multiplier formatted as "60,000×" appears before the older "0.95×".
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0]!.textContent).toContain('60,000×');
  });
});
