import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PokerSessionsByVariantBar, { ChartTooltip } from './PokerSessionsByVariantBar';
import type { PokerSessionsByVariantDay } from '@/systems/stats';

function fixture(): PokerSessionsByVariantDay[] {
  return [
    { date: '2026-05-25', holdem: 2, fiveCardDraw: 1, omaha: 0 },
    { date: '2026-05-26', holdem: 0, fiveCardDraw: 0, omaha: 1 },
    { date: '2026-05-27', holdem: 1, fiveCardDraw: 2, omaha: 3 },
  ];
}

describe('PokerSessionsByVariantBar', () => {
  it('renders a Recharts stacked-bar chart', () => {
    const { container } = render(<PokerSessionsByVariantBar data={fixture()} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('renders with all-zero data', () => {
    const data = fixture().map((d) => ({ ...d, holdem: 0, fiveCardDraw: 0, omaha: 0 }));
    const { container } = render(<PokerSessionsByVariantBar data={data} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('renders with an empty data array', () => {
    const { container } = render(<PokerSessionsByVariantBar data={[]} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('respects a custom height prop', () => {
    const { container } = render(<PokerSessionsByVariantBar data={fixture()} height={320} />);
    const wrapper = container.querySelector('.recharts-responsive-container');
    expect(wrapper).toBeInTheDocument();
    expect((wrapper as HTMLElement).style.height).toContain('320');
  });
});

describe('PokerSessionsByVariantBar > ChartTooltip', () => {
  function tooltipPayload() {
    return [
      { value: 2, name: 'holdem', dataKey: 'holdem', payload: {} },
      { value: 1, name: 'fiveCardDraw', dataKey: 'fiveCardDraw', payload: {} },
      { value: 3, name: 'omaha', dataKey: 'omaha', payload: {} },
    ];
  }

  it('returns null when inactive', () => {
    const { container } = render(<ChartTooltip active={false} payload={tooltipPayload()} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when payload is empty', () => {
    const { container } = render(<ChartTooltip active payload={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the brand-token shell + 3 variant rows with labels', () => {
    const { container } = render(<ChartTooltip active payload={tooltipPayload()} label="05-27" />);
    const root = container.querySelector('[data-chart-tooltip="poker-sessions-by-variant"]');
    expect(root).toBeInTheDocument();
    expect(root!.className).toContain('bg-velvet-deep');
    expect(root!.className).toContain('border-brass/60');
    expect(screen.getByText('05-27')).toBeInTheDocument();
    expect(screen.getByText("Hold'em")).toBeInTheDocument();
    expect(screen.getByText('Five-Card Draw')).toBeInTheDocument();
    expect(screen.getByText('Omaha')).toBeInTheDocument();
  });
});
