import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminRoulettePage from './AdminRoulettePage';
import { resetDb } from '@/test/db-helpers';
import { db } from '@/db';
import type { RouletteRoundDetails, PocketColor } from '@/games/roulette/types';

const RED_NUMBERS = new Set<number>([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

function colorFor(n: number): PocketColor {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

async function seedRouletteRow(opts: {
  id: string;
  number: number;
  betAmount: number;
  payout: number;
  playedAt: number;
}): Promise<void> {
  const netChange = opts.payout - opts.betAmount;
  const outcome: 'win' | 'loss' | 'push' = netChange > 0 ? 'win' : netChange < 0 ? 'loss' : 'push';
  const details: RouletteRoundDetails = {
    spin: { number: opts.number, color: colorFor(opts.number), pocketIndex: 0 },
    bets: [],
  };
  await db.rounds.add({
    id: opts.id,
    userId: 'u-1',
    game: 'roulette',
    betAmount: opts.betAmount,
    payout: opts.payout,
    netChange,
    outcome,
    details,
    balanceAfter: 1000,
    playedAt: opts.playedAt,
  });
}

describe('AdminRoulettePage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('admin.roulette.range');
  });

  it('renders the four top stat-card labels even when there is no data', async () => {
    render(
      <MemoryRouter>
        <AdminRoulettePage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/balls spun \(all-time\)/i)).toBeInTheDocument());
    expect(screen.getByText(/house net chips/i)).toBeInTheDocument();
    expect(screen.getByText(/red %/i)).toBeInTheDocument();
    expect(screen.getByText(/black %/i)).toBeInTheDocument();
    expect(screen.getByText(/no roulette spins recorded yet/i)).toBeInTheDocument();
  });

  it('renders ballsSpun count after rows are added', async () => {
    await seedRouletteRow({ id: 'r-1', number: 7, betAmount: 100, payout: 0, playedAt: 1_000 });
    await seedRouletteRow({ id: 'r-2', number: 0, betAmount: 50, payout: 0, playedAt: 2_000 });
    await seedRouletteRow({
      id: 'r-3',
      number: 17,
      betAmount: 10,
      payout: 360,
      playedAt: 3_000,
    });

    render(
      <MemoryRouter>
        <AdminRoulettePage />
      </MemoryRouter>,
    );

    // Wait until the stats hook resolves (the "Balls spun" card shows 3).
    const ballsCard = await waitFor(() => {
      const label = screen.getByText(/balls spun \(all-time\)/i);
      const card = label.closest('[data-tone]');
      expect(card).not.toBeNull();
      const valueNode = within(card as HTMLElement).getByText('3');
      expect(valueNode).toBeInTheDocument();
      return card as HTMLElement;
    });
    expect(ballsCard).toBeInTheDocument();
  });

  it('renders the house-net card with positive tone when house is ahead', async () => {
    await seedRouletteRow({ id: 'r-1', number: 7, betAmount: 100, payout: 0, playedAt: 1 });
    await seedRouletteRow({ id: 'r-2', number: 8, betAmount: 100, payout: 0, playedAt: 2 });
    const { container } = render(
      <MemoryRouter>
        <AdminRoulettePage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-tone="positive"]')).toBeInTheDocument();
    });
    const positive = container.querySelector('[data-tone="positive"]') as HTMLElement;
    expect(positive.textContent).toContain('+200');
    expect(positive.textContent?.toLowerCase()).toContain('house ahead');
  });

  it('renders the house-net card with negative tone when house is behind', async () => {
    await seedRouletteRow({ id: 'r-1', number: 7, betAmount: 10, payout: 360, playedAt: 1 });
    const { container } = render(
      <MemoryRouter>
        <AdminRoulettePage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-tone="negative"]')).toBeInTheDocument();
    });
    const negative = container.querySelector('[data-tone="negative"]') as HTMLElement;
    expect(negative.textContent).toContain('-350');
    expect(negative.textContent?.toLowerCase()).toContain('house behind');
  });

  it('renders the parity panel with all six mini-bars', async () => {
    render(
      <MemoryRouter>
        <AdminRoulettePage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/parity · colour · range/i)).toBeInTheDocument());
    expect(screen.getByText(/^red$/i)).toBeInTheDocument();
    expect(screen.getByText(/^black$/i)).toBeInTheDocument();
    expect(screen.getByText(/green \(zero\)/i)).toBeInTheDocument();
    expect(screen.getByText(/^odd$/i)).toBeInTheDocument();
    expect(screen.getByText(/^even$/i)).toBeInTheDocument();
    expect(screen.getByText(/low \(1–18\)/i)).toBeInTheDocument();
    expect(screen.getByText(/high \(19–36\)/i)).toBeInTheDocument();
  });

  it('renders the dozens & columns panel with all six mini-bars', async () => {
    render(
      <MemoryRouter>
        <AdminRoulettePage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/dozens & columns/i)).toBeInTheDocument());
    expect(screen.getByText(/1st 12/i)).toBeInTheDocument();
    expect(screen.getByText(/2nd 12/i)).toBeInTheDocument();
    expect(screen.getByText(/3rd 12/i)).toBeInTheDocument();
    expect(screen.getByText(/column 1/i)).toBeInTheDocument();
    expect(screen.getByText(/column 2/i)).toBeInTheDocument();
    expect(screen.getByText(/column 3/i)).toBeInTheDocument();
  });

  it('renders the recent spins table when rounds exist', async () => {
    await seedRouletteRow({ id: 'r-1', number: 17, betAmount: 100, payout: 0, playedAt: 1_000 });
    render(
      <MemoryRouter>
        <AdminRoulettePage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/recent spins \(last 20\)/i)).toBeInTheDocument());
    // Number 17 is black on a European wheel — assert both the number cell and colour cell.
    // Use findAllByText so we wait for the recent-row "Black" cell to render;
    // since #14.5 PR B added a hot-number KPI StatCard that also renders "17",
    // the sync getAllByText pre-#14.5 raced against the recent-table mount on CI.
    const blackCells = await screen.findAllByText(/^black$/i);
    expect(blackCells.length).toBeGreaterThan(0);
    expect(await screen.findByText('17')).toBeInTheDocument();
  });

  it('renders the distribution chart wrapper once data exists', async () => {
    await seedRouletteRow({ id: 'r-1', number: 0, betAmount: 10, payout: 0, playedAt: 1 });
    const { container } = render(
      <MemoryRouter>
        <AdminRoulettePage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  // Phase 15 #14 PR B — shared DateRangeFilter integration.
  it('renders the shared <DateRangeFilter> above the StatCards', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminRoulettePage />
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

  it('persists the clicked preset to localStorage under admin.roulette.range', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminRoulettePage />
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
    expect(localStorage.getItem('admin.roulette.range')).toBe('30d');
  });
});
