import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import BigRoad from './BigRoad';
import { getBigRoad } from './logic';

describe('BigRoad', () => {
  it('renders an empty grid when no columns', () => {
    const { container } = render(<BigRoad columns={[]} />);
    expect(container.querySelectorAll('[data-big-road-winner]')).toHaveLength(0);
  });

  it('renders correct ring colors for each winner type', () => {
    const cols = getBigRoad([
      { winner: 'player', playerPair: false, bankerPair: false },
      { winner: 'banker', playerPair: false, bankerPair: false },
    ]);
    const { container } = render(<BigRoad columns={cols} />);
    expect(container.querySelectorAll('[data-big-road-winner="player"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-big-road-winner="banker"]')).toHaveLength(1);
  });

  it('shows tie count overlay on cells with ties > 0', () => {
    const cols = getBigRoad([
      { winner: 'player', playerPair: false, bankerPair: false },
      { winner: 'tie', playerPair: false, bankerPair: false },
      { winner: 'tie', playerPair: false, bankerPair: false },
    ]);
    const { container } = render(<BigRoad columns={cols} />);
    expect(container.textContent).toContain('2');
  });
});
