import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PokerWinRateByPositionBar, { PokerWinRateTooltip } from './PokerWinRateByPositionBar';
import type { PokerWinRateByTableSize } from '@/systems/stats';

function fixture(): PokerWinRateByTableSize[] {
  return [
    { tableSize: 2, sessions: 5, winRate: 0.4 },
    { tableSize: 6, sessions: 20, winRate: 0.55 },
    { tableSize: 9, sessions: 10, winRate: 0.3 },
  ];
}

describe('PokerWinRateByPositionBar', () => {
  it('renders the responsive container + chart wrapper', () => {
    const { container } = render(<PokerWinRateByPositionBar data={fixture()} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    expect(container.querySelector('[data-poker-win-rate-position-bar]')).toBeInTheDocument();
  });

  it('handles empty data without crashing', () => {
    const { container } = render(<PokerWinRateByPositionBar data={[]} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});

describe('PokerWinRateByPositionBar > PokerWinRateTooltip', () => {
  function tooltipPayload(point: PokerWinRateByTableSize) {
    return [{ value: point.winRate * 100, name: 'pct', dataKey: 'pct', payload: point }];
  }

  it('returns null when inactive', () => {
    const { container } = render(
      <PokerWinRateTooltip active={false} payload={tooltipPayload(fixture()[0]!)} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the tooltip with table-size + win-rate + session count', () => {
    render(<PokerWinRateTooltip active payload={tooltipPayload(fixture()[1]!)} />);
    expect(screen.getByText(/6-seat table/i)).toBeInTheDocument();
    expect(screen.getByText(/55\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/20 sessions/i)).toBeInTheDocument();
  });

  it('uses singular "session" when count is 1', () => {
    const point: PokerWinRateByTableSize = { tableSize: 2, sessions: 1, winRate: 1 };
    render(<PokerWinRateTooltip active payload={tooltipPayload(point)} />);
    expect(screen.getByText(/1 session$/i)).toBeInTheDocument();
  });
});
