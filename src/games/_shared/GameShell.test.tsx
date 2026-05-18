import type * as FramerMotion from 'framer-motion';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import GameShell from './GameShell';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof FramerMotion>('framer-motion');
  return { ...actual, useReducedMotion: () => true };
});

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

  it('does not render the RULES button when `rules` prop is not provided', () => {
    render(
      <MemoryRouter>
        <GameShell title="X" game="coin-flip" bettingPanel={<div>P</div>}>
          <div>G</div>
        </GameShell>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: /show game rules/i })).not.toBeInTheDocument();
  });

  it('renders the RULES button when `rules` is provided and opens the modal on click', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <GameShell
          title="BLACKJACK"
          game="coin-flip"
          bettingPanel={<div>P</div>}
          rules={<p>blackjack rules body</p>}
        >
          <div>G</div>
        </GameShell>
      </MemoryRouter>,
    );
    const btn = screen.getByRole('button', { name: /show game rules/i });
    expect(btn).toBeInTheDocument();
    // Modal closed initially.
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(btn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/BLACKJACK — Rules/i)).toBeInTheDocument();
    expect(screen.getByText('blackjack rules body')).toBeInTheDocument();
    // Close re-hides.
    await user.click(screen.getByRole('button', { name: /close rules/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
