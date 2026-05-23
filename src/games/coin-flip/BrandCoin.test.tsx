import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import BrandCoin from './BrandCoin';

vi.mock('@/motion/useEffectiveReducedMotion', () => ({
  useEffectiveReducedMotion: () => false,
}));

describe('BrandCoin', () => {
  it('renders the mask emblem for heads', () => {
    const { getByRole } = render(<BrandCoin side="heads" />);
    expect(getByRole('img', { name: /masquer/i })).toBeInTheDocument();
  });

  it('renders the "M" monogram for tails', () => {
    const { getByText } = render(<BrandCoin side="tails" />);
    expect(getByText('M')).toBeInTheDocument();
  });

  it('exposes flipping state via data attribute', () => {
    const { container } = render(<BrandCoin side="heads" flipping />);
    expect(container.querySelector('[data-flipping="true"]')).not.toBeNull();
  });

  it('does not flip (data-flipping="false") when flipping is false', () => {
    const { container } = render(<BrandCoin side="heads" />);
    expect(container.querySelector('[data-flipping="false"]')).not.toBeNull();
  });

  it('accepts a custom size and renders both faces', () => {
    const { getByRole, getByText } = render(<BrandCoin side="tails" size={96} />);
    // Heads (front) is always in the DOM (rotated out of view).
    expect(getByRole('img', { name: /masquer/i })).toBeInTheDocument();
    expect(getByText('M')).toBeInTheDocument();
  });
});
