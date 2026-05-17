import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import ChipStack, { breakdown } from './ChipStack';

describe('breakdown', () => {
  it('exact denomination → single chip', () => {
    expect(breakdown(5)).toEqual([5]);
    expect(breakdown(1000)).toEqual([1000]);
  });

  it('combines largest-first', () => {
    expect(breakdown(435)).toEqual([250, 100, 25, 25, 25, 5, 5]);
  });

  it('handles 0 chips → empty array', () => {
    expect(breakdown(0)).toEqual([]);
  });

  it('handles 5 + 5 = 10 with two 5s (no smaller denom available)', () => {
    expect(breakdown(10)).toEqual([5, 5]);
  });

  it('uses 1000s, 500s, etc. for large amounts', () => {
    expect(breakdown(2750)).toEqual([1000, 1000, 500, 250]);
  });

  it('rejects negative or non-integer (returns empty)', () => {
    expect(breakdown(-5)).toEqual([]);
    expect(breakdown(3.5)).toEqual([]);
  });
});

describe('<ChipStack />', () => {
  it('renders one chip per breakdown entry when ≤ 6 chips', () => {
    const { container } = render(<ChipStack amount={75} />);
    expect(container.querySelectorAll('[data-chip-denom]')).toHaveLength(3);
  });

  it('renders an "overflow" stack with amount badge when > 6 chips', () => {
    const { container } = render(<ChipStack amount={435} />);
    expect(container.querySelector('[data-chip-stack-overflow]')).toBeInTheDocument();
    expect(container.querySelector('[data-chip-stack-overflow]')!.textContent).toContain('435');
  });

  it('renders nothing when amount is 0', () => {
    const { container } = render(<ChipStack amount={0} />);
    expect(container.firstChild).toBeNull();
  });
});
