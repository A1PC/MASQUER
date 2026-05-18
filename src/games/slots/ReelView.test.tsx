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
