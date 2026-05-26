import type * as FramerMotion from 'framer-motion';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import DrawAnimationModal from './DrawAnimationModal';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof FramerMotion>('framer-motion');
  return { ...actual, useReducedMotion: () => false };
});

// Sound is exercised by the per-ball reveal — mock for both modes.
const playMock = vi.fn();
vi.mock('@/systems/sound/useSound', () => ({
  useSound: () => ({ play: playMock }),
}));

describe('DrawAnimationModal (purchase mode)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    playMock.mockClear();
  });
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
        lines={[{ isLuckyDip: false, mainNumbers: [1, 2, 3, 4, 5, 6], bonusNumber: 1 }]}
        onClose={() => {}}
      />,
    );
    expect(screen.getAllByText(/1 · 2 · 3 · 4 · 5 · 6/i).length).toBeGreaterThan(0);
  });

  it('reveals lucky-dip lines on a 350ms cadence', () => {
    render(
      <DrawAnimationModal
        mode="purchase"
        open
        lines={[
          { isLuckyDip: true, mainNumbers: [10, 20, 30, 40, 50, 7], bonusNumber: 5 },
          { isLuckyDip: true, mainNumbers: [1, 2, 3, 4, 5, 6], bonusNumber: 9 },
        ]}
        onClose={() => {}}
      />,
    );
    expect(screen.queryAllByText(/10 · 20 · 30/i).length).toBe(0);
    void act(() => vi.advanceTimersByTime(350));
    expect(screen.queryAllByText(/10 · 20 · 30/i).length).toBeGreaterThan(0);
    void act(() => vi.advanceTimersByTime(350));
    expect(screen.queryAllByText(/1 · 2 · 3 · 4 · 5 · 6/i).length).toBeGreaterThan(0);
  });

  it('DONE button is disabled until all lines are revealed', () => {
    render(
      <DrawAnimationModal
        mode="purchase"
        open
        lines={[{ isLuckyDip: true, mainNumbers: [1, 2, 3, 4, 5, 6], bonusNumber: 1 }]}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /revealing/i })).toBeDisabled();
    void act(() => vi.advanceTimersByTime(350));
    expect(screen.getByRole('button', { name: /done/i })).not.toBeDisabled();
  });

  it('purchase modal body uses max-h-[60vh] overflow-y-auto for scroll', () => {
    render(
      <DrawAnimationModal
        mode="purchase"
        open
        lines={[{ isLuckyDip: false, mainNumbers: [1, 2, 3, 4, 5, 6], bonusNumber: 1 }]}
        onClose={() => {}}
      />,
    );
    const body = document.querySelector('[data-purchase-reveal-body]');
    expect(body).not.toBeNull();
    expect(body!.className).toMatch(/max-h-\[60vh\]/);
    expect(body!.className).toMatch(/overflow-y-auto/);
  });
});

describe('DrawAnimationModal (draw mode)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    playMock.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  const sampleDraw = {
    id: '2026-05-19',
    drawAt: Date.now(),
    mainNumbers: [3, 12, 25, 41, 49, 33],
    bonus: 7,
    totalLines: 1,
    totalRevenue: 5,
    totalPayout: 0,
  };

  it('renders header and 6+1 ball placeholders before reveal', () => {
    render(
      <DrawAnimationModal
        mode="draw"
        open
        draws={[{ draw: sampleDraw, userLines: [] }]}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText(/draw 2026-05-19/i)).toBeInTheDocument();
    // 7 placeholder slots (6 main + 1 bonus) before reveal.
    expect(screen.getAllByText('?').length).toBe(7);
  });

  it('reveals 6+1 balls in sequence on the configured cadence', () => {
    render(
      <DrawAnimationModal
        mode="draw"
        open
        draws={[{ draw: sampleDraw, userLines: [] }]}
        onClose={() => {}}
      />,
    );
    // First main ball not yet revealed.
    expect(screen.queryByText('3')).toBeNull();
    void act(() => vi.advanceTimersByTime(250));
    expect(screen.getByText('3')).toBeInTheDocument();
    // Advance through the remaining 6 ticks (5 main + 1 bonus).
    void act(() => vi.advanceTimersByTime(250 * 6));
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('NEXT DRAW button advances to the next draw', () => {
    const draws = [
      { draw: sampleDraw, userLines: [] },
      { draw: { ...sampleDraw, id: '2026-05-20' }, userLines: [] },
    ];
    render(<DrawAnimationModal mode="draw" open draws={draws} onClose={() => {}} />);
    void act(() => vi.advanceTimersByTime(250 * 7));
    expect(screen.getByText(/draw 2026-05-19/i)).toBeInTheDocument();
    void act(() => screen.getByRole('button', { name: /next draw/i }).click());
    expect(screen.getByText(/draw 2026-05-20/i)).toBeInTheDocument();
  });

  it('plays ball.drop per ball during draw reveal', () => {
    render(
      <DrawAnimationModal
        mode="draw"
        open
        draws={[{ draw: sampleDraw, userLines: [] }]}
        onClose={() => {}}
      />,
    );
    void act(() => vi.advanceTimersByTime(250 * 8));
    const drops = playMock.mock.calls.filter((c) => c[0] === 'ball.drop');
    expect(drops.length).toBe(7); // 6 main + 1 bonus
  });

  it('draw modal body uses max-h-[60vh] overflow-y-auto for scroll', () => {
    render(
      <DrawAnimationModal
        mode="draw"
        open
        draws={[{ draw: sampleDraw, userLines: [] }]}
        onClose={() => {}}
      />,
    );
    const body = document.querySelector('[data-draw-reveal-body]');
    expect(body).not.toBeNull();
    expect(body!.className).toMatch(/max-h-\[60vh\]/);
    expect(body!.className).toMatch(/overflow-y-auto/);
  });
});
