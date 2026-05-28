import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const reduceMotion = vi.fn<() => boolean>(() => false);
vi.mock('@/motion/useEffectiveReducedMotion', () => ({
  useEffectiveReducedMotion: () => reduceMotion(),
}));

import RouteFallback from './RouteFallback';

describe('RouteFallback', () => {
  beforeEach(() => reduceMotion.mockReturnValue(false));

  it('renders the default label and the data-route-fallback attribute', () => {
    const { container } = render(<RouteFallback />);
    expect(screen.getByText(/loading…/i)).toBeInTheDocument();
    expect(container.querySelector('[data-route-fallback]')).not.toBeNull();
  });

  it('respects a custom label', () => {
    render(<RouteFallback label="Loading craps…" />);
    expect(screen.getByText('Loading craps…')).toBeInTheDocument();
  });

  it('uses h-full (not min-h-screen) so it composes inside AppLayout', () => {
    const { container } = render(<RouteFallback />);
    const root = container.querySelector('[data-route-fallback]');
    expect(root?.className).toMatch(/\bh-full\b/);
    expect(root?.className).not.toMatch(/min-h-screen/);
  });

  it('uses the velvet stage palette (no stale felt token)', () => {
    const { container } = render(<RouteFallback />);
    const root = container.querySelector('[data-route-fallback]');
    expect(root?.className).toMatch(/bg-velvet-deep/);
    expect(root?.className).not.toMatch(/bg-felt-deep/);
  });

  it('animates the spinner by default', () => {
    const { container } = render(<RouteFallback />);
    expect(container.querySelector('.animate-spin')).not.toBeNull();
  });

  it('collapses to a static glow under reduced motion', () => {
    reduceMotion.mockReturnValue(true);
    const { container } = render(<RouteFallback />);
    expect(container.querySelector('.animate-spin')).toBeNull();
  });
});
