import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CrapsBetTypeFrequencyBar, { ChartTooltip } from './CrapsBetTypeFrequencyBar';
import type { CrapsBetTypeWagered } from '@/systems/stats';

const SAMPLE: CrapsBetTypeWagered[] = [
  { betType: 'pass', totalWagered: 2_700 },
  { betType: 'field', totalWagered: 750 },
  { betType: 'odds-pass', totalWagered: 400 },
  { betType: 'place-8', totalWagered: 150 },
  { betType: 'hard-6', totalWagered: 50 },
];

describe('CrapsBetTypeFrequencyBar', () => {
  it('renders a Recharts chart when data is non-empty', () => {
    const { container } = render(<CrapsBetTypeFrequencyBar data={SAMPLE} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    // Empty-state node MUST NOT render when data exists.
    expect(container.querySelector('[data-craps-bet-type-empty]')).toBeNull();
  });

  it('renders the empty-state placeholder when data is empty', () => {
    const { container } = render(<CrapsBetTypeFrequencyBar data={[]} />);
    const empty = container.querySelector('[data-craps-bet-type-empty]');
    expect(empty).not.toBeNull();
    expect(empty!.textContent).toMatch(/bet-type tracking starts with sessions played/i);
    // Recharts wrapper MUST NOT render in the empty state.
    expect(container.querySelector('.recharts-responsive-container')).toBeNull();
  });

  it('respects a custom height prop', () => {
    const { container } = render(<CrapsBetTypeFrequencyBar data={SAMPLE} height={320} />);
    const wrapper = container.querySelector('.recharts-responsive-container');
    expect(wrapper).toBeInTheDocument();
    expect((wrapper as HTMLElement).style.height).toContain('320');
  });
});

describe('CrapsBetTypeFrequencyBar > ChartTooltip', () => {
  function tooltipPayload(point: CrapsBetTypeWagered) {
    return [
      {
        value: point.totalWagered,
        name: 'totalWagered',
        dataKey: 'totalWagered',
        payload: point,
      },
    ];
  }

  it('returns null when inactive', () => {
    const { container } = render(
      <ChartTooltip
        active={false}
        payload={tooltipPayload({ betType: 'pass', totalWagered: 100 })}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when payload is empty', () => {
    const { container } = render(<ChartTooltip active payload={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the human-readable label + chip total on the brand shell', () => {
    const point: CrapsBetTypeWagered = { betType: 'pass', totalWagered: 2_700 };
    const { container } = render(<ChartTooltip active payload={tooltipPayload(point)} />);
    const root = container.querySelector('[data-chart-tooltip="craps-bet-type-frequency"]');
    expect(root).toBeInTheDocument();
    // Ivory body on velvet-deep ground — tokens-only.
    expect(root!.className).toContain('bg-velvet-deep');
    expect(root!.className).toContain('text-ivory');
    expect(root!.className).toContain('border-brass/60');
    expect(screen.getByText(/pass line/i)).toBeInTheDocument();
    expect(screen.getByText(/2,700 chips/i)).toBeInTheDocument();
  });

  it('uses the singular noun when the chip total is exactly 1', () => {
    const point: CrapsBetTypeWagered = { betType: 'field', totalWagered: 1 };
    render(<ChartTooltip active payload={tooltipPayload(point)} />);
    expect(screen.getByText(/^1 chip$/i)).toBeInTheDocument();
  });

  it('falls back to the raw bet id when the label dictionary lacks an entry', () => {
    const point: CrapsBetTypeWagered = { betType: 'unknown-future-bet', totalWagered: 5 };
    render(<ChartTooltip active payload={tooltipPayload(point)} />);
    expect(screen.getByText(/unknown-future-bet/i)).toBeInTheDocument();
  });
});
