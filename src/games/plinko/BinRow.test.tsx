import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import BinRow from './BinRow';
import { BIN_COUNT, binCentreX } from './geometry';
import { MULTIPLIER_CURVES } from './logic';

describe('BinRow', () => {
  it('renders BIN_COUNT (27) bins', () => {
    const { container } = render(<BinRow risk="low" />);
    expect(container.querySelectorAll('[data-bin]')).toHaveLength(BIN_COUNT);
  });

  it('renders compact multiplier labels (k-notation for >=1000) per risk', () => {
    const { container } = render(<BinRow risk="high" />);
    const bins = container.querySelectorAll('[data-bin]');
    // High edge is 60000 -> "60k×"; centre is the small loss value e.g. "0.71×"
    expect(bins[0]!.textContent).toBe(`60k×`);
    expect(bins[13]!.textContent).toBe(`${MULTIPLIER_CURVES.high[13]}×`);
    expect(bins[BIN_COUNT - 1]!.textContent).toBe(`60k×`);
  });

  it('edge bins (0 + 26) are marked data-bin-edge="true"; interior bins false', () => {
    const { container } = render(<BinRow risk="high" />);
    const bins = container.querySelectorAll('[data-bin]');
    expect(bins[0]!.getAttribute('data-bin-edge')).toBe('true');
    expect(bins[BIN_COUNT - 1]!.getAttribute('data-bin-edge')).toBe('true');
    expect(bins[1]!.getAttribute('data-bin-edge')).toBe('false');
    expect(bins[13]!.getAttribute('data-bin-edge')).toBe('false');
  });

  it('each bin is positioned at binCentreX(idx)% via inline style', () => {
    const { container } = render(<BinRow risk="medium" />);
    const bins = container.querySelectorAll<HTMLElement>('[data-bin]');
    bins.forEach((el, idx) => {
      expect(el.style.left).toBe(`${binCentreX(idx)}%`);
    });
  });

  it('flashedBinIdx adds data-flash="true" to the matching bin only', () => {
    const { container } = render(<BinRow risk="medium" flashedBinIdx={5} />);
    const flashed = container.querySelectorAll('[data-flash="true"]');
    expect(flashed).toHaveLength(1);
    expect(flashed[0]!.getAttribute('data-bin-idx')).toBe('5');
  });

  it('no flash when flashedBinIdx is null', () => {
    const { container } = render(<BinRow risk="medium" flashedBinIdx={null} />);
    expect(container.querySelectorAll('[data-flash="true"]')).toHaveLength(0);
  });

  it('edge bin tier is jackpot for high risk (60000x)', () => {
    const { container } = render(<BinRow risk="high" />);
    const edge = container.querySelector('[data-bin][data-bin-idx="0"]');
    expect(edge!.getAttribute('data-bin-tier')).toBe('jackpot');
  });

  it('centre bin tier is loss for medium risk (0.8x)', () => {
    const { container } = render(<BinRow risk="medium" />);
    const centre = container.querySelector('[data-bin][data-bin-idx="13"]');
    expect(centre!.getAttribute('data-bin-tier')).toBe('loss');
  });
});
