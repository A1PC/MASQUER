import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import 'fake-indexeddb/auto';
import { resetDb } from '@/test/db-helpers';
import { db } from '@/db';
import { DIFFICULTY, BUY_IN } from '@/games/bingo/logic';
import { useBingoConfigStore } from '@/store/bingoConfigStore';
import AdminBingoPage from './AdminBingoPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminBingoPage />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await resetDb();
  localStorage.removeItem('admin.bingo.range');
  useBingoConfigStore.setState({
    overrides: { easy: null, medium: null, hard: null },
    hydrated: true,
  });
});

afterEach(async () => {
  await resetDb();
});

describe('AdminBingoPage — per-difficulty tuning (preserved)', () => {
  it('renders three difficulty sections', () => {
    renderPage();
    expect(screen.getByText('EASY')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('HARD')).toBeInTheDocument();
  });

  it('shows default CPU count values in inputs', async () => {
    renderPage();
    await waitFor(() => {
      const easyInput = screen.getByRole('spinbutton', { name: /easy CPU count/i });
      expect(easyInput).toHaveValue(DIFFICULTY.easy.cpuCount);
    });
    const mediumInput = screen.getByRole('spinbutton', { name: /medium CPU count/i });
    expect(mediumInput).toHaveValue(DIFFICULTY.medium.cpuCount);
    const hardInput = screen.getByRole('spinbutton', { name: /hard CPU count/i });
    expect(hardInput).toHaveValue(DIFFICULTY.hard.cpuCount);
  });

  it('shows default pot preview text', () => {
    renderPage();
    // Easy default: 50 * 2 = 100 in the hint text
    expect(
      screen.getAllByText(new RegExp(`Default: ${DIFFICULTY.easy.potMultiplier}`)).length,
    ).toBeGreaterThan(0);
  });

  it('prefills from store overrides when hydrated', async () => {
    useBingoConfigStore.setState({
      overrides: {
        easy: { cpuCount: 20, potMultiplier: 5, cpuLatencyMs: [0, 100], forceManual: false },
        medium: null,
        hard: null,
      },
      hydrated: true,
    });
    renderPage();
    await waitFor(() => {
      const easyInput = screen.getByRole('spinbutton', { name: /easy CPU count/i });
      expect(easyInput).toHaveValue(20);
    });
  });

  it('save button calls saveDifficulty on the store', async () => {
    renderPage();
    const cpuInput = screen.getByRole('spinbutton', { name: /easy CPU count/i });
    await userEvent.clear(cpuInput);
    await userEvent.type(cpuInput, '12');
    const saveButtons = screen.getAllByRole('button', { name: /^SAVE$/i });
    await userEvent.click(saveButtons[0]!);
    await waitFor(() => {
      expect(screen.getByText(/saved — applies to the next game/i)).toBeInTheDocument();
    });
    expect(useBingoConfigStore.getState().overrides.easy?.cpuCount).toBe(12);
  });

  it('reset button restores defaults and clears store override', async () => {
    useBingoConfigStore.setState({
      overrides: {
        easy: { cpuCount: 50, potMultiplier: 5, cpuLatencyMs: [0, 100], forceManual: false },
        medium: null,
        hard: null,
      },
      hydrated: true,
    });
    renderPage();
    await waitFor(() => {
      const easyInput = screen.getByRole('spinbutton', { name: /easy CPU count/i });
      expect(easyInput).toHaveValue(50);
    });
    const resetButtons = screen.getAllByRole('button', { name: /reset to default/i });
    await userEvent.click(resetButtons[0]!);
    await waitFor(() => {
      const easyInput = screen.getByRole('spinbutton', { name: /easy CPU count/i });
      expect(easyInput).toHaveValue(DIFFICULTY.easy.cpuCount);
    });
    expect(useBingoConfigStore.getState().overrides.easy).toBeNull();
  });

  it('shows validation error when latencyMin > latencyMax', async () => {
    renderPage();
    const minInput = screen.getByRole('spinbutton', { name: /easy CPU latency min/i });
    const maxInput = screen.getByRole('spinbutton', { name: /easy CPU latency max/i });
    await userEvent.clear(minInput);
    await userEvent.type(minInput, '500');
    await userEvent.clear(maxInput);
    await userEvent.type(maxInput, '100');
    const saveButtons = screen.getAllByRole('button', { name: /^SAVE$/i });
    await userEvent.click(saveButtons[0]!);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/min latency must be ≤ max latency/i);
    });
    expect(useBingoConfigStore.getState().overrides.easy).toBeNull();
  });

  it('shows validation error for negative cpuCount', async () => {
    renderPage();
    const cpuInput = screen.getByRole('spinbutton', { name: /easy CPU count/i });
    await userEvent.clear(cpuInput);
    await userEvent.type(cpuInput, '-1');
    const saveButtons = screen.getAllByRole('button', { name: /^SAVE$/i });
    await userEvent.click(saveButtons[0]!);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/cpu count must be a whole number/i);
    });
  });

  it('shows default text for each field', () => {
    renderPage();
    expect(
      screen.getAllByText(new RegExp(`Default: ${DIFFICULTY.easy.cpuCount}`)).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(`Default: ${DIFFICULTY.hard.forceManual ? 'yes' : 'no'}`),
    ).toBeInTheDocument();
  });

  it('force manual checkbox renders checked for hard default', () => {
    renderPage();
    const hardCheckbox = screen.getByRole('checkbox', { name: /hard force manual daub/i });
    expect(hardCheckbox).toBeChecked();
  });

  it('force manual checkbox renders unchecked for easy default', () => {
    renderPage();
    const easyCheckbox = screen.getByRole('checkbox', { name: /easy force manual daub/i });
    expect(easyCheckbox).not.toBeChecked();
  });

  it('pot preview shows BUY_IN * multiplier info in hint text', () => {
    renderPage();
    expect(screen.getAllByText(new RegExp(`pot = ${BUY_IN} × multiplier`)).length).toBe(3);
  });
});

// Suppress unused within import
void within;

describe('AdminBingoPage — STATISTICS section (new)', () => {
  it('renders the STATISTICS heading + 4 stat cards alongside the tuning UI', () => {
    renderPage();
    expect(screen.getByText('STATISTICS')).toBeInTheDocument();
    // Tuning UI still present (preservation contract).
    expect(screen.getByText('EASY')).toBeInTheDocument();
    expect(screen.getByText('HARD')).toBeInTheDocument();
    // 4 StatCards by label.
    expect(screen.getByText(/GAMES PLAYED \(ALL-TIME\)/i)).toBeInTheDocument();
    expect(screen.getByText(/HOUSE NET CHIPS/i)).toBeInTheDocument();
    expect(screen.getByText(/PLAYER BINGO CAPTURE %/i)).toBeInTheDocument();
    expect(screen.getByText(/FAST BINGO HIT RATE/i)).toBeInTheDocument();
  });

  it('shows the empty-state copy when no bingo rounds are recorded', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/No bingo rounds recorded yet/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/No games yet/i)).toBeInTheDocument();
  });

  it('renders the variant×difficulty distribution chart when data exists', async () => {
    await db.rounds.bulkAdd([
      {
        id: 'bg-1',
        userId: 'u-1',
        game: 'bingo',
        betAmount: 50,
        payout: 100,
        netChange: 50,
        outcome: 'win',
        details: {
          variant: 'british',
          difficulty: 'easy',
          finalCallCount: 40,
          userTier1: true,
          userTier2: false,
          userTier3: true,
          cpuTier3Winner: null,
          bonusesEarned: 25,
          pot: 100,
        },
        balanceAfter: 1050,
        playedAt: 1,
      },
      {
        id: 'bg-2',
        userId: 'u-1',
        game: 'bingo',
        betAmount: 50,
        payout: 0,
        netChange: -50,
        outcome: 'loss',
        details: {
          variant: 'american',
          difficulty: 'hard',
          finalCallCount: 55,
          userTier1: false,
          userTier2: false,
          userTier3: false,
          cpuTier3Winner: 2,
          bonusesEarned: 0,
          pot: 400,
          cpuCount: 9,
        },
        balanceAfter: 1000,
        playedAt: 2,
      },
    ]);

    renderPage();
    await waitFor(() => {
      // 2 games seeded.
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    });
    // Recent games table renders rows.
    expect(screen.getByText(/RECENT GAMES \(LAST 20\)/i)).toBeInTheDocument();
    expect(screen.getByText('British')).toBeInTheDocument();
    expect(screen.getByText('American')).toBeInTheDocument();
    // Outcome badges: BINGO (green) + LOST (red)
    expect(screen.getByText('BINGO')).toBeInTheDocument();
    expect(screen.getByText('LOST')).toBeInTheDocument();
  });

  it('renders the "Average balls to BINGO" 3-cell grid', async () => {
    renderPage();
    expect(screen.getByText(/AVERAGE BALLS TO BINGO/i)).toBeInTheDocument();
    // useLiveQuery resolves async — wait for the 3 cells to mount.
    await waitFor(() => {
      const cells = document.querySelectorAll('[data-balls-to-bingo]');
      expect(cells.length).toBe(3);
    });
  });

  it('renders the bonus economics mini-bars', () => {
    renderPage();
    expect(screen.getByText(/BONUS ECONOMICS/i)).toBeInTheDocument();
    expect(screen.getByText(/LINE WINS/i)).toBeInTheDocument();
    expect(screen.getByText(/DOUBLE LINE \/ 4 CORNERS/i)).toBeInTheDocument();
    expect(screen.getByText(/BINGO \(PLAYER WINS\)/i)).toBeInTheDocument();
    expect(screen.getByText(/FAST BINGO KICKER/i)).toBeInTheDocument();
  });

  // Phase 15 #14 PR B — shared DateRangeFilter integration.
  it('renders the shared <DateRangeFilter> above the StatCards', async () => {
    const { container } = renderPage();
    await waitFor(() => {
      expect(container.querySelector('[data-date-range-filter]')).not.toBeNull();
    });
    expect(container.querySelector('[data-range="7d"]')).not.toBeNull();
    expect(container.querySelector('[data-range="30d"]')).not.toBeNull();
    expect(container.querySelector('[data-range="90d"]')).not.toBeNull();
    expect(container.querySelector('[data-range="all"]')).not.toBeNull();
  });

  it('persists the clicked preset to localStorage under admin.bingo.range', async () => {
    localStorage.removeItem('admin.bingo.range');
    const { container } = renderPage();
    const btn = await waitFor(() => {
      const b = container.querySelector('[data-range="30d"]');
      expect(b).not.toBeNull();
      return b as HTMLButtonElement;
    });
    const user = userEvent.setup();
    await user.click(btn);
    await waitFor(() => {
      expect(btn.getAttribute('aria-selected')).toBe('true');
    });
    expect(localStorage.getItem('admin.bingo.range')).toBe('30d');
  });
});
