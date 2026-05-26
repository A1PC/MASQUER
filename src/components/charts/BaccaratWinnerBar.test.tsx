import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BaccaratWinnerBar, { ChartTooltip } from './BaccaratWinnerBar';
import type { BaccaratWinnerCount } from '@/systems/stats';

function fixture(): BaccaratWinnerCount[] {
  return [
    { winner: 'player', count: 12 },
    { winner: 'banker', count: 15 },
    { winner: 'tie', count: 3 },
  ];
}

describe('BaccaratWinnerBar', () => {
  it('renders a Recharts chart for the 3 winners', () => {
    const { container } = render(<BaccaratWinnerBar data={fixture()} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('renders with all-zero data', () => {
    const data = fixture().map((d) => ({ ...d, count: 0 }));
    const { container } = render(<BaccaratWinnerBar data={data} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('respects a custom height prop', () => {
    const { container } = render(<BaccaratWinnerBar data={fixture()} height={320} />);
    const wrapper = container.querySelector('.recharts-responsive-container');
    expect(wrapper).toBeInTheDocument();
    expect((wrapper as HTMLElement).style.height).toContain('320');
  });
});

describe('BaccaratWinnerBar > ChartTooltip', () => {
  function tooltipPayload(point: BaccaratWinnerCount) {
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

  it('renders the player tooltip on velvet-deep with the brass hairline border', () => {
    const { container } = render(<ChartTooltip active payload={tooltipPayload(fixture()[0]!)} />);
    const root = container.querySelector('[data-chart-tooltip="baccarat-winner"]');
    expect(root).toBeInTheDocument();
    expect(root!.className).toContain('bg-velvet-deep');
    expect(root!.className).toContain('text-ivory');
    expect(root!.className).toContain('border-brass/60');
    expect(screen.getByText(/^player$/i)).toBeInTheDocument();
    expect(screen.getByText(/12 wins/i)).toBeInTheDocument();
  });

  it('renders the banker tooltip', () => {
    const { container } = render(<ChartTooltip active payload={tooltipPayload(fixture()[1]!)} />);
    expect(container.textContent).toContain('Banker');
    expect(container.textContent).toContain('15 wins');
  });

  it('uses singular "win" when count is 1', () => {
    const point: BaccaratWinnerCount = { winner: 'tie', count: 1 };
    render(<ChartTooltip active payload={tooltipPayload(point)} />);
    expect(screen.getByText(/1 win$/i)).toBeInTheDocument();
  });

  it('handles zero wins with plural copy', () => {
    const point: BaccaratWinnerCount = { winner: 'tie', count: 0 };
    render(<ChartTooltip active payload={tooltipPayload(point)} />);
    expect(screen.getByText(/0 wins/i)).toBeInTheDocument();
  });
});
