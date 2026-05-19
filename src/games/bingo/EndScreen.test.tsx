import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import EndScreen from './EndScreen';
import { generateCard, emptyDaubGrid } from './logic';
import type { BingoCardState } from './machine';

function makeCardState(id: string): BingoCardState {
  return {
    card: generateCard(id),
    daubed: emptyDaubGrid(),
    achievedTiers: new Set(),
  };
}

describe('EndScreen', () => {
  it('shows GAME OVER + total + Play Again + Back to lobby', () => {
    render(
      <MemoryRouter>
        <EndScreen
          cards={[makeCardState('c-1')]}
          wins={[{ cardId: 'c-1', tier: 'full-house', payout: 1500 }]}
          onPlayAgain={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/game over/i)).toBeInTheDocument();
    expect(screen.getByText('1,500 chips')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to lobby/i })).toHaveAttribute('href', '/lobby');
  });

  it('renders per-card breakdown with tier badges', () => {
    render(
      <MemoryRouter>
        <EndScreen
          cards={[makeCardState('c-1'), makeCardState('c-2')]}
          wins={[
            { cardId: 'c-1', tier: '1-line', payout: 75 },
            { cardId: 'c-1', tier: 'full-house', payout: 1500 },
            { cardId: 'c-2', tier: '1-line', payout: 75 },
          ]}
          onPlayAgain={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.getAllByText('LINE').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('BINGO')).toBeInTheDocument();
  });

  it('shows "No wins" for a card with no achieved tiers', () => {
    render(
      <MemoryRouter>
        <EndScreen cards={[makeCardState('c-1')]} wins={[]} onPlayAgain={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/no wins/i)).toBeInTheDocument();
  });

  it('PLAY AGAIN button fires onPlayAgain', async () => {
    const user = userEvent.setup();
    const onPlayAgain = vi.fn();
    render(
      <MemoryRouter>
        <EndScreen cards={[makeCardState('c-1')]} wins={[]} onPlayAgain={onPlayAgain} />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: /play again/i }));
    expect(onPlayAgain).toHaveBeenCalledOnce();
  });
});
