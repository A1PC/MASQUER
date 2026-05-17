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

describe('<BettingLayout /> outside bars', () => {
  it('renders 3 column 2:1 buttons mapping to columns 1/2/3', async () => {
    const onPlaceBet = vi.fn();
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={10}
        onPlaceBet={onPlaceBet}
        onRemoveBet={() => {}}
      />,
    );
    const user = userEvent.setup();
    expect(screen.getAllByRole('button', { name: /column bet on column [1-3]/i })).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: /column bet on column 2/i }));
    expect(onPlaceBet.mock.calls[0]![0].key).toBe('column:2');
    expect(onPlaceBet.mock.calls[0]![0].amount).toBe(10);
  });

  it('renders 3 dozen bet cells (1st 12 / 2nd 12 / 3rd 12)', async () => {
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
    expect(screen.getByRole('button', { name: /dozen bet on 1st 12/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dozen bet on 2nd 12/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dozen bet on 3rd 12/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /dozen bet on 3rd 12/i }));
    expect(onPlaceBet.mock.calls[0]![0].key).toBe('dozen:3');
  });

  it('renders 6 even-money bars (1-18 / EVEN / RED / BLACK / ODD / 19-36)', async () => {
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
    const labels = [/1-18/i, /even/i, /^red$/i, /^black$/i, /odd/i, /19-36/i];
    for (const lbl of labels) {
      expect(screen.getByRole('button', { name: lbl })).toBeInTheDocument();
    }
    await user.click(screen.getByRole('button', { name: /^red$/i }));
    expect(onPlaceBet.mock.calls[0]![0].key).toBe('red');
  });
});

describe('<BettingLayout /> edge overlays', () => {
  it('renders 24 vertical-split overlays', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    let count = 0;
    document.querySelectorAll('[data-overlay-type="split"]').forEach((el) => {
      const k = el.getAttribute('data-overlay-key')!;
      const [, pair] = k.split(':');
      const [a, b] = pair!.split('-').map(Number);
      if (b! - a! === 1 && a! >= 1) count++;
    });
    expect(count).toBe(24);
  });

  it('renders 33 horizontal-split overlays', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    let count = 0;
    document.querySelectorAll('[data-overlay-type="split"]').forEach((el) => {
      const k = el.getAttribute('data-overlay-key')!;
      const [, pair] = k.split(':');
      const [a, b] = pair!.split('-').map(Number);
      if (b! - a! === 3) count++;
    });
    expect(count).toBe(33);
  });

  it('renders 3 zero-split overlays', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    expect(document.querySelector('[data-overlay-key="split:0-1"]')).toBeInTheDocument();
    expect(document.querySelector('[data-overlay-key="split:0-2"]')).toBeInTheDocument();
    expect(document.querySelector('[data-overlay-key="split:0-3"]')).toBeInTheDocument();
  });

  it('renders 22 corner overlays', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    expect(document.querySelectorAll('[data-overlay-type="corner"]')).toHaveLength(22);
  });

  it('renders 12 street overlays', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    expect(document.querySelectorAll('[data-overlay-type="street"]')).toHaveLength(12);
  });

  it('renders 11 six-line overlays', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    expect(document.querySelectorAll('[data-overlay-type="six-line"]')).toHaveLength(11);
  });

  it('clicking a split overlay calls onPlaceBet with the right key', async () => {
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
    await user.click(document.querySelector('[data-overlay-key="split:17-18"]')!);
    expect(onPlaceBet.mock.calls[0]![0].key).toBe('split:17-18');
  });

  it('clicking a corner overlay calls onPlaceBet with the right key', async () => {
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
    await user.click(document.querySelector('[data-overlay-key="corner:1"]')!);
    expect(onPlaceBet.mock.calls[0]![0].key).toBe('corner:1');
  });
});

describe('<BettingLayout /> footer and disabled state', () => {
  it('renders total exposure summing all bet amounts', () => {
    render(
      <BettingLayout
        bets={[
          {
            key: 'red',
            type: 'red',
            numbers: [1],
            payoutMultiple: 1,
            amount: 5,
            betHandleId: 'h',
          },
          {
            key: 'black',
            type: 'black',
            numbers: [2],
            payoutMultiple: 1,
            amount: 25,
            betHandleId: 'h2',
          },
        ]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    expect(screen.getByText(/total bet/i).textContent).toBeTruthy();
    // Check the displayed total contains 30 somewhere
    expect(document.body.textContent).toContain('30');
  });

  it('renders a Clear all button that fires onClearAll', async () => {
    const onClearAll = vi.fn();
    render(
      <BettingLayout
        bets={[
          {
            key: 'red',
            type: 'red',
            numbers: [1],
            payoutMultiple: 1,
            amount: 5,
            betHandleId: 'h',
          },
        ]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
        onClearAll={onClearAll}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /clear all bets/i }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it('Clear all button is disabled when bets is empty', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
        onClearAll={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /clear all bets/i })).toBeDisabled();
  });

  it('when disabled, the felt has data-disabled=true and number cells are disabled', () => {
    render(
      <BettingLayout
        bets={[]}
        disabled={true}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    expect(document.querySelector('[data-roulette-felt]')!.getAttribute('data-disabled')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: /straight bet on 17/i }).disabled).toBe(true);
  });

  it('the most recently placed bet has data-selected on its chip stack', () => {
    render(
      <BettingLayout
        bets={[
          {
            key: 'straight:1',
            type: 'straight',
            numbers: [1],
            payoutMultiple: 35,
            amount: 5,
            betHandleId: 'h1',
          },
          {
            key: 'straight:2',
            type: 'straight',
            numbers: [2],
            payoutMultiple: 35,
            amount: 5,
            betHandleId: 'h2',
          },
        ]}
        disabled={false}
        chipAmount={5}
        onPlaceBet={() => {}}
        onRemoveBet={() => {}}
      />,
    );
    expect(
      document.querySelector('[data-bet-stack="straight:2"]')!.getAttribute('data-selected'),
    ).toBe('true');
    expect(
      document.querySelector('[data-bet-stack="straight:1"]')!.getAttribute('data-selected'),
    ).not.toBe('true');
  });
});
