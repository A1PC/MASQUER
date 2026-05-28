import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlinkoRiskTierBar, { PlinkoRiskTooltip } from './PlinkoRiskTierBar';
import type { PlinkoRiskDistribution } from '@/systems/stats';

function fixture(): PlinkoRiskDistribution[] {
  return [
    { risk: 'safe', count: 12 },
    { risk: 'low', count: 8 },
    { risk: 'medium', count: 22 },
    { risk: 'high', count: 4 },
  ];
}

describe('PlinkoRiskTierBar', () => {
  it('renders a Recharts chart for the 4 risk tiers', () => {
    const { container } = render(<PlinkoRiskTierBar data={fixture()} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    expect(container.querySelector('[data-plinko-risk-tier-bar]')).toBeInTheDocument();
  });

  it('renders with all-zero data', () => {
    const data = fixture().map((d) => ({ ...d, count: 0 }));
    const { container } = render(<PlinkoRiskTierBar data={data} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});

describe('PlinkoRiskTierBar > PlinkoRiskTooltip', () => {
  function tooltipPayload(point: PlinkoRiskDistribution) {
    return [{ value: point.count, name: 'count', dataKey: 'count', payload: point }];
  }

  it('returns null when inactive', () => {
    const { container } = render(
      <PlinkoRiskTooltip active={false} payload={tooltipPayload(fixture()[0]!)} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the risk-tier tooltip with brand chrome', () => {
    const { container } = render(
      <PlinkoRiskTooltip active payload={tooltipPayload(fixture()[2]!)} />,
    );
    expect(container.querySelector('[data-chart-tooltip="plinko-risk"]')).toBeInTheDocument();
    expect(screen.getByText(/medium risk/i)).toBeInTheDocument();
    expect(screen.getByText(/22 drops/i)).toBeInTheDocument();
  });

  it('uses singular "drop" when count is 1', () => {
    const point: PlinkoRiskDistribution = { risk: 'high', count: 1 };
    render(<PlinkoRiskTooltip active payload={tooltipPayload(point)} />);
    expect(screen.getByText(/1 drop$/i)).toBeInTheDocument();
  });
});
