import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BettingLayout from './BettingLayout';
import type { PlacedBet } from './types';

describe('<BettingLayout /> number cells', () => {
  it('renders 37 number cells (0 plus 1..36)', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    for (let n = 0; n <= 36; n++) {
      expect(document.querySelector(`[data-cell-number="${n}"]`)).toBeInTheDocument();
    }
  });

  it('cell colors follow colorOf', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    expect(document.querySelector('[data-cell-number="0"]')!.getAttribute('data-color')).toBe(
      'green',
    );
    expect(document.querySelector('[data-cell-number="1"]')!.getAttribute('data-color')).toBe(
      'red',
    );
    expect(document.querySelector('[data-cell-number="2"]')!.getAttribute('data-color')).toBe(
      'black',
    );
    expect(document.querySelector('[data-cell-number="17"]')!.getAttribute('data-color')).toBe(
      'black',
    );
  });

  it('clicking a number cell calls onPlaceBet with a straight bet of chipAmount', async () => {
    const onPlaceBet = vi.fn();
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={25}
        onPlaceBet={onPlaceBet}
        onRemoveBet={() => {}}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /straight bet on 17/i }));
    expect(onPlaceBet).toHaveBeenCalledTimes(1);
    expect(onPlaceBet.mock.calls[0]![0]).toMatchObject({
      key: 'straight:17',
      type: 'straight',
      amount: 25,
    });
  });

  it('clicking 0 calls onPlaceBet with straight:0', async () => {
    const onPlaceBet = vi.fn();
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={onPlaceBet}
        onRemoveBet={() => {}}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /straight bet on 0/i }));
    expect(onPlaceBet.mock.calls[0]![0].key).toBe('straight:0');
  });

  it('renders chip stack on cells that have bets', () => {
    const bets: PlacedBet[] = [
      {
        key: 'straight:17',
        type: 'straight',
        numbers: [17],
        payoutMultiple: 35,
        amount: 30,
        betHandleId: 'h',
      },
    ];
    render(
      <BettingLayout
        bets={bets}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    expect(document.querySelector('[data-bet-stack="straight:17"]')).toBeInTheDocument();
  });
});
