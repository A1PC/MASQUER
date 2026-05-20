import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import BinRow from './BinRow';
import { BIN_COUNT, MULTIPLIER_CURVES } from './logic';

describe('BinRow', () => {
  it('renders BIN_COUNT bins', () => {
    const { container } = render(<BinRow risk="low" />);
    expect(container.querySelectorAll('[data-bin]')).toHaveLength(BIN_COUNT);
  });

  it('uses multipliers from MULTIPLIER_CURVES for selected risk', () => {
    const { container } = render(<BinRow risk="high" />);
    const bins = container.querySelectorAll('[data-bin]');
    expect(bins[0]!.textContent).toContain(`${MULTIPLIER_CURVES.high[0]}x`);
    expect(bins[10]!.textContent).toContain(`${MULTIPLIER_CURVES.high[10]}x`);
  });

  it('flashedBinIdx adds data-flash="true" to the matching bin', () => {
    const { container } = render(<BinRow risk="medium" flashedBinIdx={5} />);
    const flashed = container.querySelectorAll('[data-flash="true"]');
    expect(flashed).toHaveLength(1);
    expect(flashed[0]!.getAttribute('data-bin-idx')).toBe('5');
  });

  it('no flash when flashedBinIdx is null', () => {
    const { container } = render(<BinRow risk="medium" flashedBinIdx={null} />);
    expect(container.querySelectorAll('[data-flash="true"]')).toHaveLength(0);
  });
});
