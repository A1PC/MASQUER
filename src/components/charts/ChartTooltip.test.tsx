import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ChartTooltipShell, DefaultChartTooltip } from './ChartTooltip';

describe('ChartTooltipShell', () => {
  it('renders ivory-on-velvet-deep with brass border', () => {
    const { container } = render(
      <ChartTooltipShell>
        <span>hello</span>
      </ChartTooltipShell>,
    );
    const shell = container.querySelector('[data-chart-tooltip="default"]');
    expect(shell).not.toBeNull();
    expect(shell?.className).toContain('bg-velvet-deep');
    expect(shell?.className).toContain('text-ivory');
    expect(shell?.className).toContain('border-brass/60');
    expect(shell?.textContent).toBe('hello');
  });

  it('sets data-chart-tooltip from variant prop', () => {
    const { container } = render(
      <ChartTooltipShell variant="custom-name">
        <span>x</span>
      </ChartTooltipShell>,
    );
    expect(container.querySelector('[data-chart-tooltip="custom-name"]')).not.toBeNull();
  });

  it('appends custom className', () => {
    const { container } = render(
      <ChartTooltipShell className="extra-class">
        <span>x</span>
      </ChartTooltipShell>,
    );
    expect(container.querySelector('[data-chart-tooltip="default"]')?.className).toContain(
      'extra-class',
    );
  });
});

describe('DefaultChartTooltip', () => {
  it('returns null when not active', () => {
    const { container } = render(<DefaultChartTooltip active={false} payload={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when payload is empty', () => {
    const { container } = render(<DefaultChartTooltip active={true} payload={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the label as a gold eyebrow', () => {
    const { container } = render(
      <DefaultChartTooltip
        active={true}
        label="2026-05-26"
        payload={[
          {
            name: 'Net change',
            value: 1234,
            dataKey: 'netChange',
            color: '#d4af37',
          },
        ]}
      />,
    );
    expect(container.textContent).toContain('2026-05-26');
    expect(container.textContent).toContain('Net change');
    // Numeric values format with thousands separator.
    expect(container.textContent).toContain('1,234');
  });

  it('renders a colour swatch when payload entry has a color', () => {
    const { container } = render(
      <DefaultChartTooltip
        active={true}
        label=""
        payload={[
          {
            name: 'A',
            value: 5,
            dataKey: 'a',
            color: '#a3122a',
          },
        ]}
      />,
    );
    const swatch = container.querySelector('[aria-hidden="true"]');
    expect(swatch).not.toBeNull();
    expect((swatch as HTMLElement | null)?.style.background).toContain('rgb(163, 18, 42)');
  });

  it('falls back to dataKey when name is missing', () => {
    const { container } = render(
      <DefaultChartTooltip
        active={true}
        payload={[
          {
            value: 7,
            dataKey: 'fallback-key',
          },
        ]}
      />,
    );
    expect(container.textContent).toContain('fallback-key');
    expect(container.textContent).toContain('7');
  });
});
