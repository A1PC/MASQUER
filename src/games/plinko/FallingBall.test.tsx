import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import FallingBall from './FallingBall';
import { BIN_COUNT, ROW_COUNT, binCentreX, buildTrajectory, pegPosition } from './geometry';

vi.mock('framer-motion', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

describe('buildTrajectory (pure)', () => {
  it('emits ROW_COUNT + 1 keyframes (per-row pegs + final bucket)', () => {
    const path = Array(ROW_COUNT).fill('L') as ('L' | 'R')[];
    const { x, y } = buildTrajectory(path, 0);
    expect(x).toHaveLength(ROW_COUNT + 1);
    expect(y).toHaveLength(ROW_COUNT + 1);
  });

  it('apex frame matches pegPosition(0, 0) = {x:50, y:0}', () => {
    const path = Array(ROW_COUNT).fill('L') as ('L' | 'R')[];
    const { x, y } = buildTrajectory(path, 0);
    expect(x[0]).toBeCloseTo(50, 8);
    expect(y[0]).toBeCloseTo(0, 8);
  });

  // CRITICAL invariant — load-bearing. If this fails, the visible bucket
  // disagrees with the resolved outcome.
  it('final-frame x equals binCentreX(bin) for all-L (bin 0)', () => {
    const path = Array(ROW_COUNT).fill('L') as ('L' | 'R')[];
    const { x, y } = buildTrajectory(path, 0);
    expect(x[x.length - 1]).toBeCloseTo(binCentreX(0), 8);
    expect(y[y.length - 1]).toBeCloseTo(100, 8);
  });

  it('final-frame x equals binCentreX(bin) for all-R (bin 26)', () => {
    const path = Array(ROW_COUNT).fill('R') as ('L' | 'R')[];
    const { x, y } = buildTrajectory(path, BIN_COUNT - 1);
    expect(x[x.length - 1]).toBeCloseTo(binCentreX(BIN_COUNT - 1), 8);
    expect(y[y.length - 1]).toBeCloseTo(100, 8);
  });

  it('final-frame x equals binCentreX(bin) for balanced path → bin 13', () => {
    const path: ('L' | 'R')[] = [];
    for (let r = 0; r < ROW_COUNT; r += 1) path.push(r % 2 === 0 ? 'R' : 'L');
    // Balanced path: 13 R + 13 L → bin 13.
    const { x } = buildTrajectory(path, 13);
    expect(x[x.length - 1]).toBeCloseTo(binCentreX(13), 8);
    expect(binCentreX(13)).toBeCloseTo(50, 8);
  });

  it('all-R trajectory traces the right diagonal (every row col = row)', () => {
    const path = Array(ROW_COUNT).fill('R') as ('L' | 'R')[];
    const { x, y } = buildTrajectory(path, BIN_COUNT - 1);
    for (let row = 0; row < ROW_COUNT; row += 1) {
      const expected = pegPosition(row, row);
      expect(x[row]).toBeCloseTo(expected.x, 8);
      expect(y[row]).toBeCloseTo(expected.y, 8);
    }
  });

  it('all-L trajectory traces the left edge (every row col = 0)', () => {
    const path = Array(ROW_COUNT).fill('L') as ('L' | 'R')[];
    const { x, y } = buildTrajectory(path, 0);
    for (let row = 0; row < ROW_COUNT; row += 1) {
      const expected = pegPosition(row, 0);
      expect(x[row]).toBeCloseTo(expected.x, 8);
      expect(y[row]).toBeCloseTo(expected.y, 8);
    }
  });
});

describe('FallingBall (reduced-motion shortcut)', () => {
  it('with reduced motion: calls onLanded synchronously on mount', async () => {
    const onLanded = vi.fn();
    const path: ('L' | 'R')[] = Array(ROW_COUNT).fill('L');
    render(<FallingBall path={path} bin={0} onLanded={onLanded} />);
    await waitFor(() => expect(onLanded).toHaveBeenCalled());
  });

  it('with reduced motion: renders null (no ball element)', () => {
    const onLanded = vi.fn();
    const path: ('L' | 'R')[] = Array(ROW_COUNT).fill('R');
    const { container } = render(
      <FallingBall path={path} bin={BIN_COUNT - 1} onLanded={onLanded} />,
    );
    expect(container.querySelector('[data-falling-ball]')).toBeNull();
  });

  it('with reduced motion: fires onPegHit once (batched), then onLanded', async () => {
    const onPegHit = vi.fn();
    const onLanded = vi.fn();
    const path: ('L' | 'R')[] = Array(ROW_COUNT).fill('L');
    render(<FallingBall path={path} bin={0} onLanded={onLanded} onPegHit={onPegHit} />);
    await waitFor(() => expect(onLanded).toHaveBeenCalled());
    expect(onPegHit).toHaveBeenCalledTimes(1);
  });
});
