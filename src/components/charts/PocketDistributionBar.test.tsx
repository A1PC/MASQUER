import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import PocketDistributionBar from './PocketDistributionBar';
import type { RouletteDistributionPoint } from '@/systems/stats';

const RED = new Set<number>([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function fixture(counts: ReadonlyArray<number>): RouletteDistributionPoint[] {
  return Array.from({ length: 37 }, (_, n) => ({
    number: n,
    count: counts[n] ?? 0,
    color: n === 0 ? 'green' : RED.has(n) ? 'red' : 'black',
  }));
}

describe('PocketDistributionBar', () => {
  it('renders a Recharts chart for 37 pockets', () => {
    const { container } = render(<PocketDistributionBar data={fixture([])} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('renders even with all-zero data', () => {
    const { container } = render(
      <PocketDistributionBar data={fixture(Array.from({ length: 37 }, () => 0))} />,
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('respects a custom height prop', () => {
    const { container } = render(<PocketDistributionBar data={fixture([])} height={300} />);
    const wrapper = container.querySelector('.recharts-responsive-container');
    expect(wrapper).toBeInTheDocument();
    expect((wrapper as HTMLElement).style.height).toContain('300');
  });
});
