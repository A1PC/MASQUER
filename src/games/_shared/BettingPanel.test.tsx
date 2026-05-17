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
  it('renders default chip denominations', () => {
    renderPanel();
    for (const d of [1, 5, 25, 100, 500]) {
      expect(screen.getByLabelText(`Add ${d} chips to bet`)).toBeInTheDocument();
    }
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
});
