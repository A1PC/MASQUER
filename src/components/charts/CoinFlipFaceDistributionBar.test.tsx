import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CoinFlipFaceDistributionBar, { CoinFlipFaceTooltip } from './CoinFlipFaceDistributionBar';
import type { CoinFlipFaceCount } from '@/systems/stats';

function fixture(): CoinFlipFaceCount[] {
  return [
    { outcome: 'heads', count: 22 },
    { outcome: 'tails', count: 18 },
  ];
}

describe('CoinFlipFaceDistributionBar', () => {
  it('renders a Recharts chart with the heads/tails bars', () => {
    const { container } = render(<CoinFlipFaceDistributionBar data={fixture()} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    expect(container.querySelector('[data-coin-flip-face-bar]')).toBeInTheDocument();
  });

  it('renders with all-zero data', () => {
    const data = fixture().map((d) => ({ ...d, count: 0 }));
    const { container } = render(<CoinFlipFaceDistributionBar data={data} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});

describe('CoinFlipFaceDistributionBar > CoinFlipFaceTooltip', () => {
  function tooltipPayload(point: CoinFlipFaceCount) {
    return [{ value: point.count, name: 'count', dataKey: 'count', payload: point }];
  }

  it('returns null when inactive', () => {
    const { container } = render(
      <CoinFlipFaceTooltip active={false} payload={tooltipPayload(fixture()[0]!)} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders heads tooltip with brand chrome', () => {
    const { container } = render(
      <CoinFlipFaceTooltip active payload={tooltipPayload(fixture()[0]!)} />,
    );
    expect(container.querySelector('[data-chart-tooltip="coin-flip-face"]')).toBeInTheDocument();
    expect(screen.getByText(/^heads$/i)).toBeInTheDocument();
    expect(screen.getByText(/22 flips/i)).toBeInTheDocument();
  });

  it('uses singular "flip" when count is 1', () => {
    const point: CoinFlipFaceCount = { outcome: 'tails', count: 1 };
    render(<CoinFlipFaceTooltip active payload={tooltipPayload(point)} />);
    expect(screen.getByText(/1 flip$/i)).toBeInTheDocument();
  });
});
