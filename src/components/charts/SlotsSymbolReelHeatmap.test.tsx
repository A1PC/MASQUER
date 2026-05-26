import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SlotsSymbolReelHeatmap from './SlotsSymbolReelHeatmap';
import type { SlotsSymbolDistribution } from '@/systems/stats';

function fixture(): SlotsSymbolDistribution[] {
  return [
    { symbol: 'cherry', reel0: 4, reel1: 2, reel2: 4, total: 10 },
    { symbol: 'lemon', reel0: 2, reel1: 3, reel2: 2, total: 7 },
    { symbol: 'bell', reel0: 2, reel1: 2, reel2: 2, total: 6 },
    { symbol: 'bar', reel0: 2, reel1: 3, reel2: 2, total: 7 },
    { symbol: 'seven', reel0: 2, reel1: 2, reel2: 2, total: 6 },
  ];
}

describe('SlotsSymbolReelHeatmap', () => {
  it('renders a 5×3 cells grid with a Symbol/Reel header row', () => {
    const { container } = render(<SlotsSymbolReelHeatmap data={fixture()} />);
    expect(container.querySelector('[data-chart="slots-symbol-reel-heatmap"]')).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: /symbol × reel landing counts/i }),
    ).toBeInTheDocument();
    // 5 row headers, 3 column headers + symbol/total = 5 column headers.
    expect(screen.getAllByRole('rowheader')).toHaveLength(5);
    expect(screen.getAllByRole('columnheader')).toHaveLength(5);
    // 15 data cells (5 symbols × 3 reels) + 5 totals = 20 cells total.
    expect(container.querySelectorAll('td[data-cell]')).toHaveLength(15);
  });

  it('renders the symbol labels', () => {
    render(<SlotsSymbolReelHeatmap data={fixture()} />);
    // Use row-header role so we hit only the leftmost label cell (the
    // numeric "7" symbol clashes with "7" digits in count/percent cells).
    expect(screen.getByRole('rowheader', { name: /cherry/i })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: /lemon/i })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: /bell/i })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: /^bar$/i })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: /^7$/ })).toBeInTheDocument();
  });

  it('shades cells with the hottest cell getting the brightest fill', () => {
    const { container } = render(<SlotsSymbolReelHeatmap data={fixture()} />);
    // Max is 4 (cherry r0 + cherry r2). Those cells must use the brightest token.
    const hot = container.querySelector('td[data-cell="cherry-0"]');
    expect(hot?.className).toContain('bg-gold-bright/90');
  });

  it('renders zeros for an empty fixture', () => {
    const empty: SlotsSymbolDistribution[] = fixture().map((d) => ({
      ...d,
      reel0: 0,
      reel1: 0,
      reel2: 0,
      total: 0,
    }));
    const { container } = render(<SlotsSymbolReelHeatmap data={empty} />);
    expect(container.querySelectorAll('td[data-cell]')).toHaveLength(15);
    // Every cell renders the cold token when max is zero.
    container.querySelectorAll('td[data-cell]').forEach((cell) => {
      expect(cell.className).toContain('bg-velvet-deep/70');
    });
  });
});
