import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RouletteColumnBiasBar, { RouletteColumnTooltip } from './RouletteColumnBiasBar';

function fixture() {
  return [
    { column: 1 as const, count: 12 },
    { column: 2 as const, count: 8 },
    { column: 3 as const, count: 14 },
  ];
}

describe('RouletteColumnBiasBar', () => {
  it('renders a Recharts chart for the 3 column bars', () => {
    const { container } = render(<RouletteColumnBiasBar data={fixture()} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    expect(container.querySelector('[data-roulette-column-bias-bar]')).toBeInTheDocument();
  });

  it('renders with all-zero data', () => {
    const data = fixture().map((d) => ({ ...d, count: 0 }));
    const { container } = render(<RouletteColumnBiasBar data={data} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});

describe('RouletteColumnBiasBar > RouletteColumnTooltip', () => {
  function payload(point: { column: 1 | 2 | 3; count: number }) {
    return [{ value: point.count, name: 'count', dataKey: 'count', payload: point }];
  }

  it('returns null when inactive', () => {
    const { container } = render(
      <RouletteColumnTooltip active={false} payload={payload(fixture()[0]!)} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the column label + hit count', () => {
    render(<RouletteColumnTooltip active payload={payload(fixture()[1]!)} />);
    expect(screen.getByText(/2nd column/i)).toBeInTheDocument();
    expect(screen.getByText(/8 hits/i)).toBeInTheDocument();
  });

  it('uses singular "hit" when count is 1', () => {
    render(<RouletteColumnTooltip active payload={payload({ column: 3, count: 1 })} />);
    expect(screen.getByText(/1 hit$/i)).toBeInTheDocument();
  });
});
