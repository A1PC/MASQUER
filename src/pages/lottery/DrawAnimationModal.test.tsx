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

describe('DrawAnimationModal (draw mode)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const sampleDraw = {
    id: '2026-05-19',
    drawAt: Date.now(),
    mainNumbers: [3, 12, 25, 41, 49],
    bonus: 7,
    totalLines: 1,
    totalRevenue: 10,
    totalPayout: 0,
  };

  it('renders header and ball placeholders', () => {
    render(
      <DrawAnimationModal
        mode="draw"
        open
        draws={[{ draw: sampleDraw, userLines: [] }]}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText(/draw 2026-05-19/i)).toBeInTheDocument();
    expect(screen.getAllByText('?').length).toBeGreaterThan(0);
  });

  it('reveals balls in sequence on the configured cadence', () => {
    render(
      <DrawAnimationModal
        mode="draw"
        open
        draws={[{ draw: sampleDraw, userLines: [] }]}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByText('3')).toBeNull();
    void act(() => vi.advanceTimersByTime(250));
    expect(screen.getByText('3')).toBeInTheDocument();
    void act(() => vi.advanceTimersByTime(250 * 5));
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('NEXT DRAW button advances to the next draw', () => {
    const draws = [
      { draw: sampleDraw, userLines: [] },
      { draw: { ...sampleDraw, id: '2026-05-20' }, userLines: [] },
    ];
    render(<DrawAnimationModal mode="draw" open draws={draws} onClose={() => {}} />);
    void act(() => vi.advanceTimersByTime(250 * 6));
    expect(screen.getByText(/draw 2026-05-19/i)).toBeInTheDocument();
    void act(() => screen.getByRole('button', { name: /next draw/i }).click());
    expect(screen.getByText(/draw 2026-05-20/i)).toBeInTheDocument();
  });
});
