import type { ReactNode } from 'react';
import type * as FramerMotion from 'framer-motion';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BigSmallZone from './BigSmallZone';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof FramerMotion>('framer-motion');
  return { ...actual, useReducedMotion: () => true };
});

function render_(node: ReactNode) {
  return render(<>{node}</>);
}

const NOOP = () => {};

describe('BigSmallZone', () => {
  it('renders BIG and SMALL labels', () => {
    render_(
      <BigSmallZone
        smallAmount={0}
        bigAmount={0}
        onAddSmall={NOOP}
        onAddBig={NOOP}
        onClearSmall={NOOP}
        onClearBig={NOOP}
      />,
    );
    expect(screen.getByText('SMALL')).toBeInTheDocument();
    expect(screen.getByText('BIG')).toBeInTheDocument();
  });

  it('clicking left half fires onAddSmall', async () => {
    const onAddSmall = vi.fn();
    const user = userEvent.setup();
    const { container } = render_(
      <BigSmallZone
        smallAmount={0}
        bigAmount={0}
        onAddSmall={onAddSmall}
        onAddBig={NOOP}
        onClearSmall={NOOP}
        onClearBig={NOOP}
      />,
    );
    await user.click(container.querySelector('[data-bigsmall-half="left"]')!);
    expect(onAddSmall).toHaveBeenCalled();
  });

  it('clicking right half fires onAddBig', async () => {
    const onAddBig = vi.fn();
    const user = userEvent.setup();
    const { container } = render_(
      <BigSmallZone
        smallAmount={0}
        bigAmount={0}
        onAddSmall={NOOP}
        onAddBig={onAddBig}
        onClearSmall={NOOP}
        onClearBig={NOOP}
      />,
    );
    await user.click(container.querySelector('[data-bigsmall-half="right"]')!);
    expect(onAddBig).toHaveBeenCalled();
  });

  it('shows chip overlays per half independently', () => {
    render_(
      <BigSmallZone
        smallAmount={10}
        bigAmount={25}
        onAddSmall={NOOP}
        onAddBig={NOOP}
        onClearSmall={NOOP}
        onClearBig={NOOP}
      />,
    );
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('disabled blocks both halves', async () => {
    const onAddSmall = vi.fn();
    const onAddBig = vi.fn();
    const user = userEvent.setup();
    const { container } = render_(
      <BigSmallZone
        smallAmount={0}
        bigAmount={0}
        disabled
        onAddSmall={onAddSmall}
        onAddBig={onAddBig}
        onClearSmall={NOOP}
        onClearBig={NOOP}
      />,
    );
    await user.click(container.querySelector('[data-bigsmall-half="left"]')!);
    await user.click(container.querySelector('[data-bigsmall-half="right"]')!);
    expect(onAddSmall).not.toHaveBeenCalled();
    expect(onAddBig).not.toHaveBeenCalled();
  });
});
