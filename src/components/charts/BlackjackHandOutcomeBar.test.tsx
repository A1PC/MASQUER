import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BlackjackHandOutcomeBar, { BlackjackOutcomeTooltip } from './BlackjackHandOutcomeBar';
import type { BlackjackHandOutcome } from '@/systems/stats';

function fixture(): BlackjackHandOutcome[] {
  return [
    { outcome: 'blackjack', count: 4 },
    { outcome: 'win', count: 18 },
    { outcome: 'push', count: 3 },
    { outcome: 'lose', count: 22 },
    { outcome: 'bust', count: 9 },
  ];
}

describe('BlackjackHandOutcomeBar', () => {
  it('renders a Recharts chart for the 5 outcome bars', () => {
    const { container } = render(<BlackjackHandOutcomeBar data={fixture()} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    expect(container.querySelector('[data-blackjack-outcome-bar]')).toBeInTheDocument();
  });

  it('renders with all-zero data', () => {
    const data = fixture().map((d) => ({ ...d, count: 0 }));
    const { container } = render(<BlackjackHandOutcomeBar data={data} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('respects a custom height prop', () => {
    const { container } = render(<BlackjackHandOutcomeBar data={fixture()} height={320} />);
    const wrapper = container.querySelector('.recharts-responsive-container');
    expect((wrapper as HTMLElement).style.height).toContain('320');
  });
});

describe('BlackjackHandOutcomeBar > BlackjackOutcomeTooltip', () => {
  function tooltipPayload(point: BlackjackHandOutcome) {
    return [{ value: point.count, name: 'count', dataKey: 'count', payload: point }];
  }

  it('returns null when inactive', () => {
    const { container } = render(
      <BlackjackOutcomeTooltip active={false} payload={tooltipPayload(fixture()[0]!)} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when payload is empty', () => {
    const { container } = render(<BlackjackOutcomeTooltip active payload={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders blackjack outcome tooltip with brand chrome', () => {
    const { container } = render(
      <BlackjackOutcomeTooltip active payload={tooltipPayload(fixture()[0]!)} />,
    );
    const root = container.querySelector('[data-chart-tooltip="blackjack-outcome"]');
    expect(root).toBeInTheDocument();
    expect(root!.className).toContain('bg-velvet-deep');
    expect(root!.className).toContain('border-brass/60');
    expect(screen.getByText(/^blackjack$/i)).toBeInTheDocument();
    expect(screen.getByText(/4 hands/i)).toBeInTheDocument();
  });

  it('uses singular "hand" when count is 1', () => {
    const point: BlackjackHandOutcome = { outcome: 'push', count: 1 };
    render(<BlackjackOutcomeTooltip active payload={tooltipPayload(point)} />);
    expect(screen.getByText(/1 hand$/i)).toBeInTheDocument();
  });
});
