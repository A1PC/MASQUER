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
    const { container } = render_(
      <BetZone
        label="PLAYER"
        payoutText="1 : 1"
        amount={0}
        onAddChip={() => {}}
        onClear={() => {}}
      />,
    );
    // The chip-overlay span has aria-label="Current bet: N chips"; the
    // button's own aria-label always carries the zone summary. Query for
    // the overlay's span directly by tag-class to avoid the button match.
    expect(container.querySelector('span[aria-label^="Current bet"]')).toBeNull();
  });

  it('shows the chip overlay with amount when amount > 0', () => {
    const { container } = render_(
      <BetZone
        label="PLAYER"
        payoutText="1 : 1"
        amount={75}
        onAddChip={() => {}}
        onClear={() => {}}
      />,
    );
    expect(container.querySelector('span[aria-label="Current bet: 75 chips"]')).toBeInTheDocument();
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
