import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import 'fake-indexeddb/auto';
import { resetDb } from '@/test/db-helpers';
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
  useBingoConfigStore.setState({
    overrides: { easy: null, medium: null, hard: null },
    hydrated: true,
  });
});

afterEach(async () => {
  await resetDb();
});

describe('AdminBingoPage', () => {
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
    // Change the CPU count input
    const cpuInput = screen.getByRole('spinbutton', { name: /easy CPU count/i });
    await userEvent.clear(cpuInput);
    await userEvent.type(cpuInput, '12');
    // Click SAVE (first save button = easy)
    const saveButtons = screen.getAllByRole('button', { name: /^SAVE$/i });
    await userEvent.click(saveButtons[0]!);
    // Should show saved confirmation
    await waitFor(() => {
      expect(screen.getByText(/saved — applies to the next game/i)).toBeInTheDocument();
    });
    // Store should be updated
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
    // Save should not have persisted
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
    // Check default hints appear
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
    // The hint text says: "Default: X (pot = 50 × multiplier)"
    expect(screen.getAllByText(new RegExp(`pot = ${BUY_IN} × multiplier`)).length).toBe(3);
  });
});

// Suppress unused within import
void within;
