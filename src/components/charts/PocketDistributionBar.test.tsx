import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PocketDistributionBar, { ChartTooltip } from './PocketDistributionBar';
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

describe('PocketDistributionBar > ChartTooltip', () => {
  function tooltipPayload(point: RouletteDistributionPoint) {
    return [
      {
        value: point.count,
        name: 'count',
        dataKey: 'count',
        payload: point,
      },
    ];
  }

  it('returns null when inactive', () => {
    const { container } = render(
      <ChartTooltip active={false} payload={tooltipPayload(fixture([])[5]!)} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when payload is empty', () => {
    const { container } = render(<ChartTooltip active payload={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the red pocket eyebrow + spin count for a red number', () => {
    const point: RouletteDistributionPoint = { number: 7, count: 3, color: 'red' };
    const { container } = render(<ChartTooltip active payload={tooltipPayload(point)} />);
    const root = container.querySelector('[data-chart-tooltip="pocket-distribution"]');
    expect(root).toBeInTheDocument();
    // Ivory body on velvet-deep ground — tokens-only.
    expect(root!.className).toContain('bg-velvet-deep');
    expect(root!.className).toContain('text-ivory');
    expect(root!.className).toContain('border-brass/60');
    expect(screen.getByText(/red pocket 7/i)).toBeInTheDocument();
    expect(screen.getByText(/3 spins/i)).toBeInTheDocument();
  });

  it('uses singular "spin" when count is 1', () => {
    const point: RouletteDistributionPoint = { number: 0, count: 1, color: 'green' };
    render(<ChartTooltip active payload={tooltipPayload(point)} />);
    expect(screen.getByText(/1 spin$/i)).toBeInTheDocument();
  });

  it('handles zero spins with plural copy', () => {
    const point: RouletteDistributionPoint = { number: 17, count: 0, color: 'black' };
    render(<ChartTooltip active payload={tooltipPayload(point)} />);
    expect(screen.getByText(/0 spins/i)).toBeInTheDocument();
  });
});
