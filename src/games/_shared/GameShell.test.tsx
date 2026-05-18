import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import GameShell from './GameShell';

describe('GameShell', () => {
  it('renders title, meta, children (game area), and bettingPanel slots', () => {
    render(
      <MemoryRouter>
        <GameShell
          title="🪙 COIN FLIP"
          meta="1:1 · 1–500"
          game="coin-flip"
          bettingPanel={<div data-testid="panel">PANEL</div>}
        >
          <div data-testid="game">GAME</div>
        </GameShell>
      </MemoryRouter>,
    );
    expect(screen.getByText('🪙 COIN FLIP')).toBeInTheDocument();
    expect(screen.getByText('1:1 · 1–500')).toBeInTheDocument();
    expect(screen.getByTestId('game')).toBeInTheDocument();
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });

  it('shows RecentResults rail when recentItems is provided', () => {
    render(
      <MemoryRouter>
        <GameShell title="X" game="coin-flip" recentItems={[]} bettingPanel={<div>P</div>}>
          <div>G</div>
        </GameShell>
      </MemoryRouter>,
    );
    expect(screen.getByText('RECENT')).toBeInTheDocument();
  });

  it('hides RecentResults rail when recentItems is undefined', () => {
    render(
      <MemoryRouter>
        <GameShell title="X" game="coin-flip" bettingPanel={<div>P</div>}>
          <div>G</div>
        </GameShell>
      </MemoryRouter>,
    );
    expect(screen.queryByText('RECENT')).not.toBeInTheDocument();
  });
});
