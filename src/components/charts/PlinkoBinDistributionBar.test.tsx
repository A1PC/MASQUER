import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlinkoBinDistributionBar, { ChartTooltip } from './PlinkoBinDistributionBar';
import type { PlinkoBinDistribution } from '@/systems/stats';

function fixture(counts: ReadonlyArray<number>): PlinkoBinDistribution[] {
  return Array.from({ length: 27 }, (_, bin) => ({
    bin,
    count: counts[bin] ?? 0,
  }));
}

describe('PlinkoBinDistributionBar', () => {
  it('renders a Recharts chart for 27 bins', () => {
    const { container } = render(<PlinkoBinDistributionBar data={fixture([])} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('renders even with all-zero data', () => {
    const { container } = render(
      <PlinkoBinDistributionBar data={fixture(Array.from({ length: 27 }, () => 0))} />,
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('respects a custom height prop', () => {
    const { container } = render(<PlinkoBinDistributionBar data={fixture([])} height={300} />);
    const wrapper = container.querySelector('.recharts-responsive-container');
    expect(wrapper).toBeInTheDocument();
    expect((wrapper as HTMLElement).style.height).toContain('300');
  });
});

describe('PlinkoBinDistributionBar > ChartTooltip', () => {
  function tooltipPayload(point: PlinkoBinDistribution) {
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
      <ChartTooltip active={false} payload={tooltipPayload({ bin: 5, count: 3 })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when payload is empty', () => {
    const { container } = render(<ChartTooltip active payload={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the edge eyebrow for bin 0 + the ball count', () => {
    const point: PlinkoBinDistribution = { bin: 0, count: 7 };
    const { container } = render(<ChartTooltip active payload={tooltipPayload(point)} />);
    const root = container.querySelector('[data-chart-tooltip="plinko-bin-distribution"]');
    expect(root).toBeInTheDocument();
    // Ivory body on velvet-deep ground — tokens-only.
    expect(root!.className).toContain('bg-velvet-deep');
    expect(root!.className).toContain('text-ivory');
    expect(root!.className).toContain('border-brass/60');
    expect(screen.getByText(/bin 0/i)).toBeInTheDocument();
    expect(screen.getByText(/edge/i)).toBeInTheDocument();
    expect(screen.getByText(/7 balls/i)).toBeInTheDocument();
  });

  it('renders the edge eyebrow for bin 26', () => {
    const point: PlinkoBinDistribution = { bin: 26, count: 1 };
    render(<ChartTooltip active payload={tooltipPayload(point)} />);
    expect(screen.getByText(/bin 26/i)).toBeInTheDocument();
    expect(screen.getByText(/edge/i)).toBeInTheDocument();
    // Singular "ball" when count is 1.
    expect(screen.getByText(/1 ball$/i)).toBeInTheDocument();
  });

  it('renders the centre eyebrow for bin 13', () => {
    const point: PlinkoBinDistribution = { bin: 13, count: 4 };
    render(<ChartTooltip active payload={tooltipPayload(point)} />);
    expect(screen.getByText(/bin 13/i)).toBeInTheDocument();
    expect(screen.getByText(/centre/i)).toBeInTheDocument();
  });

  it('omits the edge/centre tag for ordinary interior bins', () => {
    const point: PlinkoBinDistribution = { bin: 9, count: 2 };
    render(<ChartTooltip active payload={tooltipPayload(point)} />);
    expect(screen.getByText(/bin 9$/i)).toBeInTheDocument();
    expect(screen.queryByText(/edge/i)).toBeNull();
    expect(screen.queryByText(/centre/i)).toBeNull();
  });

  it('handles zero balls with plural copy', () => {
    const point: PlinkoBinDistribution = { bin: 5, count: 0 };
    render(<ChartTooltip active payload={tooltipPayload(point)} />);
    expect(screen.getByText(/0 balls/i)).toBeInTheDocument();
  });
});
