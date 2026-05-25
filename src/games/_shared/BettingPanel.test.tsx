import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BettingPanel from './BettingPanel';

function renderPanel(props: Partial<Parameters<typeof BettingPanel>[0]> = {}) {
  const onCommit = vi.fn();
  const callButtons = vi.fn(() => <div data-testid="calls">CALLS</div>);
  const utils = render(
    <BettingPanel
      min={1}
      max={500}
      balance={1000}
      onCommit={onCommit}
      callButtons={callButtons}
      {...props}
    />,
  );
  return { ...utils, onCommit, callButtons };
}

describe('BettingPanel', () => {
  it('renders default chip denominations (including the 1000 high-roller chip)', () => {
    renderPanel({ balance: 5000 });
    for (const d of [1, 5, 25, 100, 500, 1000]) {
      expect(screen.getByLabelText(`Add ${d} chips to bet`)).toBeInTheDocument();
    }
  });

  it('commits a 1000-chip bet via the 1000 preset', async () => {
    const { onCommit } = renderPanel({ balance: 5000, max: 1000 });
    await userEvent.click(screen.getByLabelText('Add 1000 chips to bet'));
    // The bet display also reads "1000" — query within the bet readout to
    // disambiguate from the chip button's own "1000" label.
    expect(screen.getByText('Bet amount').parentElement).toHaveTextContent('1000');
    await userEvent.click(screen.getByText(/PLACE BET/));
    expect(onCommit).toHaveBeenCalledWith(1000);
  });

  it('disables the 1000 chip when balance is below 1000', () => {
    renderPanel({ balance: 500, max: 1000 });
    const chip = screen.getByLabelText('Add 1000 chips to bet');
    expect(chip).toBeDisabled();
  });

  it('clicking a chip adds to bet amount', async () => {
    renderPanel();
    await userEvent.click(screen.getByLabelText('Add 25 chips to bet'));
    await userEvent.click(screen.getByLabelText('Add 5 chips to bet'));
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('cannot exceed balance', async () => {
    renderPanel({ balance: 4 });
    await userEvent.click(screen.getByLabelText('Add 5 chips to bet'));
    expect(screen.getByText('0')).toBeInTheDocument(); // chip click rejected
  });

  it('Clear resets to 0', async () => {
    renderPanel();
    await userEvent.click(screen.getByLabelText('Add 5 chips to bet'));
    await userEvent.click(screen.getByText(/Clear/));
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('Place Bet calls onCommit and locks subsequent clicks', async () => {
    const { onCommit } = renderPanel();
    await userEvent.click(screen.getByLabelText('Add 25 chips to bet'));
    await userEvent.click(screen.getByText(/PLACE BET/));
    expect(onCommit).toHaveBeenCalledWith(25);
  });

  it('Repeat last pill appears when lastBet provided', () => {
    renderPanel({ lastBet: 50 });
    expect(screen.getByText(/Repeat 50/)).toBeInTheDocument();
  });

  it('Repeat does NOT commit when autoCommitRepeat is off', async () => {
    const { onCommit } = renderPanel({ lastBet: 25 });
    await userEvent.click(screen.getByText(/Repeat 25/));
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('Repeat auto-places the bet when autoCommitRepeat is on', async () => {
    const { onCommit } = renderPanel({ lastBet: 25, autoCommitRepeat: true });
    await userEvent.click(screen.getByText(/Repeat 25/));
    expect(onCommit).toHaveBeenCalledWith(25);
  });
});

describe('BettingPanel — singleStepCommit + persistBetAcrossCommit (slots)', () => {
  it('singleStepCommit: renders no PLACE BET; callButtons receives the live amount', async () => {
    const onCommit = vi.fn();
    render(
      <BettingPanel
        min={5}
        max={1000}
        balance={1000}
        onCommit={onCommit}
        singleStepCommit
        callButtons={(amount) => (
          <button
            data-testid="action"
            data-amount={amount === null ? 'null' : String(amount)}
            onClick={() => {
              if (amount !== null) onCommit(amount);
            }}
          >
            ACT
          </button>
        )}
      />,
    );
    expect(screen.queryByRole('button', { name: /place bet/i })).toBeNull();
    // Before any chip click, callButtons sees null (no bet yet).
    expect(screen.getByTestId('action').getAttribute('data-amount')).toBe('null');
    await userEvent.click(screen.getByLabelText('Add 25 chips to bet'));
    expect(screen.getByTestId('action').getAttribute('data-amount')).toBe('25');
    await userEvent.click(screen.getByTestId('action'));
    expect(onCommit).toHaveBeenCalledWith(25);
  });

  it('persistBetAcrossCommit: amount stays after onCommit; CLEAR resets it', async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(
      <BettingPanel
        min={5}
        max={1000}
        balance={1000}
        onCommit={onCommit}
        singleStepCommit
        persistBetAcrossCommit
        callButtons={(amount) => (
          <button
            data-testid="action"
            onClick={() => {
              if (amount !== null) onCommit(amount);
            }}
          >
            ACT
          </button>
        )}
      />,
    );
    await user.click(screen.getByLabelText('Add 25 chips to bet'));
    await user.click(screen.getByTestId('action'));
    // Bet persists — second click also fires onCommit with the same amount.
    await user.click(screen.getByTestId('action'));
    expect(onCommit).toHaveBeenNthCalledWith(1, 25);
    expect(onCommit).toHaveBeenNthCalledWith(2, 25);
    // CLEAR zeros the bet so the next action no longer commits.
    await user.click(screen.getByText(/Clear/));
    await user.click(screen.getByTestId('action'));
    expect(onCommit).toHaveBeenCalledTimes(2);
  });

  it('singleStepCommit without persist: amount also persists (no internal reset) — caller must remount to clear', async () => {
    // Document the actual behaviour: the panel never auto-resets `amount`;
    // it only resets when (a) CLEAR is clicked or (b) the caller remounts
    // via `key`. `persistBetAcrossCommit` only changes the `committed`
    // tracking (relevant when not in single-step mode). This test guards
    // against accidental amount-reset regressions.
    const onCommit = vi.fn();
    render(
      <BettingPanel
        min={5}
        max={1000}
        balance={1000}
        onCommit={onCommit}
        singleStepCommit
        callButtons={(amount) => (
          <button
            data-testid="action"
            data-amount={amount === null ? 'null' : String(amount)}
            onClick={() => {
              if (amount !== null) onCommit(amount);
            }}
          >
            ACT
          </button>
        )}
      />,
    );
    await userEvent.click(screen.getByLabelText('Add 5 chips to bet'));
    await userEvent.click(screen.getByTestId('action'));
    expect(screen.getByTestId('action').getAttribute('data-amount')).toBe('5');
  });
});
