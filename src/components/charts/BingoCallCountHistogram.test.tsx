import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BingoCallCountHistogram, { BingoCallCountTooltip } from './BingoCallCountHistogram';
import type { BingoCallCountBin } from '@/systems/stats';

function fixture(): BingoCallCountBin[] {
  return [
    { binMin: 0, binMax: 9, count: 0 },
    { binMin: 10, binMax: 19, count: 2 },
    { binMin: 20, binMax: 29, count: 6 },
    { binMin: 30, binMax: 39, count: 11 },
    { binMin: 40, binMax: 49, count: 14 },
    { binMin: 50, binMax: 59, count: 8 },
    { binMin: 60, binMax: 69, count: 4 },
    { binMin: 70, binMax: 79, count: 1 },
    { binMin: 80, binMax: Number.POSITIVE_INFINITY, count: 0 },
  ];
}

describe('BingoCallCountHistogram', () => {
  it('renders the responsive container + chart wrapper', () => {
    const { container } = render(<BingoCallCountHistogram data={fixture()} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    expect(container.querySelector('[data-bingo-call-count-histogram]')).toBeInTheDocument();
  });
});

describe('BingoCallCountHistogram > BingoCallCountTooltip', () => {
  function tooltipPayload(point: BingoCallCountBin) {
    const label = !Number.isFinite(point.binMax)
      ? `${point.binMin}+`
      : `${point.binMin}-${point.binMax}`;
    return [{ value: point.count, name: 'count', dataKey: 'count', payload: { ...point, label } }];
  }

  it('returns null when inactive', () => {
    const { container } = render(
      <BingoCallCountTooltip active={false} payload={tooltipPayload(fixture()[3]!)} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders bin label + count', () => {
    render(<BingoCallCountTooltip active payload={tooltipPayload(fixture()[3]!)} />);
    expect(screen.getByText(/30-39 calls/i)).toBeInTheDocument();
    expect(screen.getByText(/11 games/i)).toBeInTheDocument();
  });

  it('uses singular "game" when count is 1', () => {
    const point: BingoCallCountBin = { binMin: 70, binMax: 79, count: 1 };
    render(<BingoCallCountTooltip active payload={tooltipPayload(point)} />);
    expect(screen.getByText(/1 game$/i)).toBeInTheDocument();
  });

  it('renders 80+ label for the catch-all bin', () => {
    const point: BingoCallCountBin = { binMin: 80, binMax: Number.POSITIVE_INFINITY, count: 3 };
    render(<BingoCallCountTooltip active payload={tooltipPayload(point)} />);
    expect(screen.getByText(/80\+ calls/i)).toBeInTheDocument();
  });
});
