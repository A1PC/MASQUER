import type { ReactNode } from 'react';
import type * as FramerMotion from 'framer-motion';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BetZone from './BetZone';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof FramerMotion>('framer-motion');
  return { ...actual, useReducedMotion: () => true };
});

function render_(node: ReactNode) {
  return render(<>{node}</>);
}

describe('BetZone', () => {
  it('renders label and payout text', () => {
    render_(
      <BetZone
        label="PLAYER"
        payoutText="1 : 1"
        amount={0}
        onAddChip={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByText('PLAYER')).toBeInTheDocument();
    expect(screen.getByText('1 : 1')).toBeInTheDocument();
  });

  it('hides the chip overlay when amount is 0', () => {
    render_(
      <BetZone
        label="PLAYER"
        payoutText="1 : 1"
        amount={0}
        onAddChip={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.queryByLabelText(/current bet/i)).toBeNull();
  });

  it('shows the chip overlay with amount when amount > 0', () => {
    render_(
      <BetZone
        label="PLAYER"
        payoutText="1 : 1"
        amount={75}
        onAddChip={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByLabelText(/current bet: 75 chips/i)).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('calls onAddChip on click', async () => {
    const onAddChip = vi.fn();
    const user = userEvent.setup();
    render_(
      <BetZone label="P" payoutText="x" amount={0} onAddChip={onAddChip} onClear={() => {}} />,
    );
    await user.click(screen.getByRole('button'));
    expect(onAddChip).toHaveBeenCalledTimes(1);
  });

  it('calls onClear on right-click (contextmenu)', () => {
    const onClear = vi.fn();
    render_(
      <BetZone label="P" payoutText="x" amount={10} onAddChip={() => {}} onClear={onClear} />,
    );
    const btn = screen.getByRole('button');
    btn.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    expect(onClear).toHaveBeenCalled();
  });

  it('disabled blocks click', async () => {
    const onAddChip = vi.fn();
    const user = userEvent.setup();
    render_(
      <BetZone
        label="P"
        payoutText="x"
        amount={0}
        onAddChip={onAddChip}
        onClear={() => {}}
        disabled
      />,
    );
    await user.click(screen.getByRole('button'));
    expect(onAddChip).not.toHaveBeenCalled();
  });
});
