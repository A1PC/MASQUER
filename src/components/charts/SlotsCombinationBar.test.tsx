import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SlotsCombinationBar, { ChartTooltip } from './SlotsCombinationBar';
import type { SlotsCombinationCount } from '@/systems/stats';

function fixture(): SlotsCombinationCount[] {
  return [
    {
      key: 'seven-seven-seven',
      label: '3× 7',
      payoutMultiple: 50,
      tier: 'jackpot',
      count: 1,
      totalPaid: 500,
    },
    {
      key: 'bar-bar-bar',
      label: '3× BAR',
      payoutMultiple: 20,
      tier: 'medium',
      count: 2,
      totalPaid: 400,
    },
    {
      key: 'bell-bell-bell',
      label: '3× Bell',
      payoutMultiple: 12,
      tier: 'medium',
      count: 0,
      totalPaid: 0,
    },
    {
      key: 'lemon-lemon-lemon',
      label: '3× Lemon',
      payoutMultiple: 8,
      tier: 'medium',
      count: 0,
      totalPaid: 0,
    },
    {
      key: 'cherry-cherry-cherry',
      label: '3× Cherry',
      payoutMultiple: 5,
      tier: 'medium',
      count: 0,
      totalPaid: 0,
    },
    {
      key: 'two-cherry',
      label: '2× Cherry',
      payoutMultiple: 2,
      tier: 'small',
      count: 5,
      totalPaid: 100,
    },
  ];
}

describe('SlotsCombinationBar', () => {
  it('renders a Recharts chart for the paytable combinations', () => {
    const { container } = render(<SlotsCombinationBar data={fixture()} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('renders with all-zero data', () => {
    const data = fixture().map((d) => ({ ...d, count: 0, totalPaid: 0 }));
    const { container } = render(<SlotsCombinationBar data={data} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('respects a custom height prop', () => {
    const { container } = render(<SlotsCombinationBar data={fixture()} height={320} />);
    const wrapper = container.querySelector('.recharts-responsive-container');
    expect(wrapper).toBeInTheDocument();
    expect((wrapper as HTMLElement).style.height).toContain('320');
  });
});

describe('SlotsCombinationBar > ChartTooltip', () => {
  function tooltipPayload(point: SlotsCombinationCount) {
    return [{ value: point.count, name: 'count', dataKey: 'count', payload: point }];
  }

  it('returns null when inactive', () => {
    const { container } = render(
      <ChartTooltip active={false} payload={tooltipPayload(fixture()[0]!)} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when payload is empty', () => {
    const { container } = render(<ChartTooltip active payload={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the jackpot tooltip with label, multiple, tier, and chips paid', () => {
    const { container } = render(<ChartTooltip active payload={tooltipPayload(fixture()[0]!)} />);
    const root = container.querySelector('[data-chart-tooltip="slots-combination"]');
    expect(root).toBeInTheDocument();
    expect(root!.className).toContain('bg-velvet-deep');
    expect(root!.className).toContain('text-ivory');
    expect(root!.className).toContain('border-brass/60');
    expect(screen.getByText(/3× 7 · 50× · jackpot/i)).toBeInTheDocument();
    expect(screen.getByText(/1 hit$/i)).toBeInTheDocument();
    expect(screen.getByText(/paid 500 chips/i)).toBeInTheDocument();
  });

  it('pluralises hits and chips correctly', () => {
    const { container } = render(<ChartTooltip active payload={tooltipPayload(fixture()[5]!)} />);
    expect(container.textContent).toContain('5 hits');
    expect(container.textContent).toContain('paid 100 chips');
  });

  it('handles zero count without throwing', () => {
    const { container } = render(<ChartTooltip active payload={tooltipPayload(fixture()[2]!)} />);
    expect(container.textContent).toContain('0 hits');
  });
});
