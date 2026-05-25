import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import SymbolView from './SymbolView';
import type { Symbol as SymbolType } from './types';

describe('<SymbolView />', () => {
  it.each(['cherry', 'lemon', 'bell', 'bar', 'seven'] as const)(
    'renders the %s symbol with data-symbol attribute',
    (sym: SymbolType) => {
      render(<SymbolView symbol={sym} />);
      const el = document.querySelector(`[data-symbol="${sym}"]`);
      expect(el).toBeInTheDocument();
    },
  );

  it('marks bell / bar / seven as neon via data-neon="true"', () => {
    for (const sym of ['bell', 'bar', 'seven'] as const) {
      const { unmount } = render(<SymbolView symbol={sym} />);
      expect(document.querySelector(`[data-symbol="${sym}"]`)!.getAttribute('data-neon')).toBe(
        'true',
      );
      unmount();
    }
  });

  it('marks cherry / lemon as data-neon="false"', () => {
    for (const sym of ['cherry', 'lemon'] as const) {
      const { unmount } = render(<SymbolView symbol={sym} />);
      expect(document.querySelector(`[data-symbol="${sym}"]`)!.getAttribute('data-neon')).toBe(
        'false',
      );
      unmount();
    }
  });

  it('adds data-winning="true" when winning prop is set', () => {
    render(<SymbolView symbol="seven" winning />);
    expect(document.querySelector('[data-symbol="seven"]')!.getAttribute('data-winning')).toBe(
      'true',
    );
  });

  it('omits data-winning when winning prop is false / undefined', () => {
    render(<SymbolView symbol="cherry" />);
    expect(
      document.querySelector('[data-symbol="cherry"]')!.getAttribute('data-winning'),
    ).toBeNull();
  });

  it('honours custom size prop (default 64)', () => {
    render(<SymbolView symbol="bell" size={32} />);
    const el = document.querySelector('[data-symbol="bell"]') as HTMLElement;
    expect(el.style.width).toBe('32px');
    expect(el.style.height).toBe('32px');
  });

  it('renders an inline <svg> with the 64 viewBox for every symbol', () => {
    for (const sym of ['cherry', 'lemon', 'bell', 'bar', 'seven'] as const) {
      const { unmount } = render(<SymbolView symbol={sym} />);
      const svg = document.querySelector(`[data-symbol="${sym}"] svg`);
      expect(svg).toBeInTheDocument();
      expect(svg!.getAttribute('viewBox')).toBe('0 0 64 64');
      // Each art is tagged with data-art for testability.
      expect(svg!.getAttribute('data-art')).toBe(sym);
      unmount();
    }
  });

  it('Seven applies a Gaussian-blur glow filter (the jackpot neon read)', () => {
    render(<SymbolView symbol="seven" />);
    const filter = document.querySelector('[data-symbol="seven"] svg filter');
    expect(filter).toBeInTheDocument();
    expect(filter!.querySelector('feGaussianBlur')).toBeInTheDocument();
  });

  it('exposes role="img" on the wrapper for assistive tech', () => {
    render(<SymbolView symbol="cherry" />);
    expect(document.querySelector('[data-symbol="cherry"]')!.getAttribute('role')).toBe('img');
  });
});
