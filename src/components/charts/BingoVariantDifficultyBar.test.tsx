import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BingoVariantDifficultyBar, { ChartTooltip } from './BingoVariantDifficultyBar';
import type { BingoVariantDifficultyCount } from '@/systems/stats';

function fixture(): BingoVariantDifficultyCount[] {
  return [
    { variant: 'british', difficulty: 'easy', count: 3 },
    { variant: 'british', difficulty: 'medium', count: 2 },
    { variant: 'british', difficulty: 'hard', count: 1 },
    { variant: 'american', difficulty: 'easy', count: 4 },
    { variant: 'american', difficulty: 'medium', count: 5 },
    { variant: 'american', difficulty: 'hard', count: 6 },
  ];
}

describe('BingoVariantDifficultyBar', () => {
  it('renders a Recharts stacked-bar chart', () => {
    const { container } = render(<BingoVariantDifficultyBar data={fixture()} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('renders with all-zero data', () => {
    const data = fixture().map((d) => ({ ...d, count: 0 }));
    const { container } = render(<BingoVariantDifficultyBar data={data} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('respects a custom height prop', () => {
    const { container } = render(<BingoVariantDifficultyBar data={fixture()} height={320} />);
    const wrapper = container.querySelector('.recharts-responsive-container');
    expect(wrapper).toBeInTheDocument();
    expect((wrapper as HTMLElement).style.height).toContain('320');
  });
});

describe('BingoVariantDifficultyBar > ChartTooltip', () => {
  function tooltipPayload() {
    return [
      { value: 3, name: 'easy', dataKey: 'easy', payload: {} },
      { value: 2, name: 'medium', dataKey: 'medium', payload: {} },
      { value: 1, name: 'hard', dataKey: 'hard', payload: {} },
    ];
  }

  it('returns null when inactive', () => {
    const { container } = render(<ChartTooltip active={false} payload={tooltipPayload()} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when payload is empty', () => {
    const { container } = render(<ChartTooltip active payload={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the brand-token shell + 3 segment rows', () => {
    const { container } = render(
      <ChartTooltip active payload={tooltipPayload()} label="British" />,
    );
    const root = container.querySelector('[data-chart-tooltip="bingo-variant-difficulty"]');
    expect(root).toBeInTheDocument();
    expect(root!.className).toContain('bg-velvet-deep');
    expect(root!.className).toContain('border-brass/60');
    expect(screen.getByText('British')).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
  });
});
