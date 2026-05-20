import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import FallingBall from './FallingBall';

vi.mock('framer-motion', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

describe('FallingBall (reduced-motion shortcut)', () => {
  it('with reduced motion: calls onLanded synchronously on mount', async () => {
    const onLanded = vi.fn();
    const path: ('L' | 'R')[] = Array(20).fill('L');
    render(<FallingBall path={path} bin={0} onLanded={onLanded} />);
    await waitFor(() => expect(onLanded).toHaveBeenCalled());
  });

  it('with reduced motion: renders null (no ball element)', () => {
    const onLanded = vi.fn();
    const path: ('L' | 'R')[] = Array(20).fill('R');
    const { container } = render(<FallingBall path={path} bin={20} onLanded={onLanded} />);
    expect(container.querySelector('[data-falling-ball]')).toBeNull();
  });
});
