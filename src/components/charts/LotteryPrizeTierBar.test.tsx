import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import LotteryPrizeTierBar, { LotteryPrizeTierTooltip } from './LotteryPrizeTierBar';
import type { LotteryPrizeTierBin } from '@/systems/lottery';

function fixture(): LotteryPrizeTierBin[] {
  return [
    { tier: '6', count: 1 },
    { tier: '5+bonus', count: 2 },
    { tier: '5', count: 5 },
    { tier: '4', count: 14 },
    { tier: '3', count: 50 },
    { tier: '2', count: 120 },
  ];
}

describe('LotteryPrizeTierBar', () => {
  it('renders the chart container + wrapper', () => {
    const { container } = render(<LotteryPrizeTierBar data={fixture()} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    expect(container.querySelector('[data-lottery-prize-tier-bar]')).toBeInTheDocument();
  });

  it('handles all-zero data', () => {
    const data: LotteryPrizeTierBin[] = fixture().map((d) => ({ ...d, count: 0 }));
    const { container } = render(<LotteryPrizeTierBar data={data} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});

describe('LotteryPrizeTierBar > LotteryPrizeTierTooltip', () => {
  function payload(point: LotteryPrizeTierBin) {
    return [{ value: point.count, name: 'count', dataKey: 'count', payload: point }];
  }

  it('returns null when inactive', () => {
    const { container } = render(
      <LotteryPrizeTierTooltip active={false} payload={payload(fixture()[0]!)} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the tier + hit count', () => {
    render(<LotteryPrizeTierTooltip active payload={payload(fixture()[2]!)} />);
    expect(screen.getByText(/tier 5/i)).toBeInTheDocument();
    expect(screen.getByText(/5 hits/i)).toBeInTheDocument();
  });

  it('uses singular "hit" when count is 1', () => {
    render(<LotteryPrizeTierTooltip active payload={payload(fixture()[0]!)} />);
    expect(screen.getByText(/1 hit$/i)).toBeInTheDocument();
  });
});
