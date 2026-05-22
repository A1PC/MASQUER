import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import GameCabinet from './GameCabinet';

describe('GameCabinet', () => {
  it('renders as a link to its route with an accessible name, icon, and label', () => {
    render(
      <MemoryRouter>
        <GameCabinet to="/play/blackjack" iconName="Spade" label="Blackjack" status="Play now" />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /blackjack/i });
    expect(link).toHaveAttribute('href', '/play/blackjack');
    expect(screen.getByText('Blackjack')).toBeInTheDocument();
    expect(screen.getByText('Play now')).toBeInTheDocument();
    expect(link.querySelector('svg')).toBeInTheDocument();
  });

  it('renders as a button that fires onClick when given onClick instead of to', async () => {
    const onClick = vi.fn();
    render(<GameCabinet onClick={onClick} iconName="Club" label="Poker" />);
    await userEvent.click(screen.getByRole('button', { name: /poker/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
