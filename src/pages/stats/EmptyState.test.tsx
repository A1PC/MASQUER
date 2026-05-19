import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders generic message and lobby link when no gameName provided', () => {
    render(
      <MemoryRouter>
        <EmptyState />
      </MemoryRouter>,
    );
    expect(screen.getByText(/no rounds yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /visit lobby/i })).toHaveAttribute('href', '/lobby');
  });

  it('renders per-game message and links to that game when gameName provided', () => {
    render(
      <MemoryRouter>
        <EmptyState gameName="Blackjack" ctaTo="/play/blackjack" />
      </MemoryRouter>,
    );
    expect(screen.getByText(/no blackjack rounds yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /play blackjack/i })).toHaveAttribute(
      'href',
      '/play/blackjack',
    );
  });
});
