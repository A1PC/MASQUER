import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecentResults, { type RecentResultItem } from './RecentResults';

const item = (
  key: string,
  net: number,
  accent: 'win' | 'loss' | 'push' = 'win',
): RecentResultItem => ({
  key,
  badgeText: 'H',
  badgeColor: '#fff',
  badgeTextColor: '#000',
  betLabel: '10',
  netChips: net,
  accent,
});

describe('RecentResults', () => {
  it('renders empty state when items is empty', () => {
    render(<RecentResults items={[]} emptyText="nothing yet" />);
    expect(screen.getByText('nothing yet')).toBeInTheDocument();
  });

  it('renders one row per item', () => {
    render(<RecentResults items={[item('a', 10), item('b', -5, 'loss')]} />);
    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('-5')).toBeInTheDocument();
  });

  it('color-codes net by accent', () => {
    const { container } = render(
      <RecentResults items={[item('w', 10, 'win'), item('l', -5, 'loss'), item('p', 0, 'push')]} />,
    );
    expect(container.querySelector('.text-chip-win')).toBeTruthy();
    expect(container.querySelector('.text-chip-loss')).toBeTruthy();
    expect(container.querySelector('.text-chip-push')).toBeTruthy();
  });
});
