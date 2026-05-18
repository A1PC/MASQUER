import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import ReelView from './ReelView';

describe('<ReelView /> static', () => {
  it('renders 3 visible cells when idle (no symbol)', () => {
    render(<ReelView reelIndex={0} symbol={null} spinning={false} stopAtMs={1200} />);
    const cells = document.querySelectorAll('[data-roulette-cell-position]');
    expect(cells).toHaveLength(3);
  });

  it('renders the given symbol in the centre cell when not spinning', () => {
    render(<ReelView reelIndex={1} symbol="seven" spinning={false} stopAtMs={2000} />);
    const centre = document.querySelector('[data-roulette-cell-position="centre"]');
    expect(centre).toBeInTheDocument();
    const sym = centre!.querySelector('[data-symbol]');
    expect(sym!.getAttribute('data-symbol')).toBe('seven');
  });

  it('exposes data-reel-index for testability', () => {
    render(<ReelView reelIndex={2} symbol="bar" spinning={false} stopAtMs={3000} />);
    expect(document.querySelector('[data-reel-index="2"]')).toBeInTheDocument();
  });

  it('marks the reel as winning when winning prop is true', () => {
    render(<ReelView reelIndex={0} symbol="seven" spinning={false} stopAtMs={1200} winning />);
    const centre = document.querySelector('[data-roulette-cell-position="centre"]');
    expect(centre!.getAttribute('data-winning')).toBe('true');
  });

  it('centre cell does not have data-winning when winning is false', () => {
    render(<ReelView reelIndex={0} symbol="seven" spinning={false} stopAtMs={1200} />);
    const centre = document.querySelector('[data-roulette-cell-position="centre"]');
    expect(centre!.getAttribute('data-winning')).toBeNull();
  });
});

describe('<ReelView /> scrolling animation', () => {
  it('renders a scroll strip when spinning + symbol set', () => {
    render(<ReelView reelIndex={0} symbol="seven" spinning={true} stopAtMs={1200} />);
    const strip = document.querySelector('[data-reel-strip]');
    expect(strip).toBeInTheDocument();
  });

  it('does NOT render a scroll strip when not spinning', () => {
    render(<ReelView reelIndex={0} symbol="seven" spinning={false} stopAtMs={1200} />);
    expect(document.querySelector('[data-reel-strip]')).toBeNull();
  });

  it('scroll strip exposes data-stop-at-ms (drives animation duration)', () => {
    render(<ReelView reelIndex={2} symbol="bar" spinning={true} stopAtMs={3000} />);
    expect(document.querySelector('[data-reel-strip]')!.getAttribute('data-stop-at-ms')).toBe(
      '3000',
    );
  });

  it('scroll strip exposes data-final-symbol matching the symbol prop', () => {
    render(<ReelView reelIndex={1} symbol="bell" spinning={true} stopAtMs={2000} />);
    expect(document.querySelector('[data-reel-strip]')!.getAttribute('data-final-symbol')).toBe(
      'bell',
    );
  });

  it('scroll strip contains the final symbol somewhere', () => {
    render(<ReelView reelIndex={0} symbol="seven" spinning={true} stopAtMs={1200} />);
    const strip = document.querySelector('[data-reel-strip]')!;
    const sevens = strip.querySelectorAll('[data-symbol="seven"]');
    expect(sevens.length).toBeGreaterThan(0);
  });
});
