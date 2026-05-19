import type * as FramerMotion from 'framer-motion';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import DrawAnimationModal from './DrawAnimationModal';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof FramerMotion>('framer-motion');
  return { ...actual, useReducedMotion: () => false };
});

describe('DrawAnimationModal (purchase mode)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders nothing when closed', () => {
    const { container } = render(
      <DrawAnimationModal mode="purchase" open={false} lines={[]} onClose={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('reveals manual lines immediately', () => {
    render(
      <DrawAnimationModal
        mode="purchase"
        open
        lines={[{ isLuckyDip: false, mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }]}
        onClose={() => {}}
      />,
    );
    expect(screen.getAllByText(/1 · 2 · 3 · 4 · 5/i).length).toBeGreaterThan(0);
  });

  it('reveals lucky-dip lines on a 350ms cadence', () => {
    render(
      <DrawAnimationModal
        mode="purchase"
        open
        lines={[
          { isLuckyDip: true, mainNumbers: [10, 20, 30, 40, 50], bonusNumber: 5 },
          { isLuckyDip: true, mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 9 },
        ]}
        onClose={() => {}}
      />,
    );
    expect(screen.queryAllByText(/10 · 20 · 30/i).length).toBe(0);
    void act(() => vi.advanceTimersByTime(350));
    expect(screen.queryAllByText(/10 · 20 · 30/i).length).toBeGreaterThan(0);
    void act(() => vi.advanceTimersByTime(350));
    expect(screen.queryAllByText(/1 · 2 · 3 · 4 · 5/i).length).toBeGreaterThan(0);
  });

  it('DONE button is disabled until all lines are revealed', () => {
    render(
      <DrawAnimationModal
        mode="purchase"
        open
        lines={[{ isLuckyDip: true, mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }]}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /revealing/i })).toBeDisabled();
    void act(() => vi.advanceTimersByTime(350));
    expect(screen.getByRole('button', { name: /done/i })).not.toBeDisabled();
  });
});
