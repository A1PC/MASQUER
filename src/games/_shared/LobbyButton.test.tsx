import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import LobbyButton from './LobbyButton';

describe('LobbyButton', () => {
  it('renders a link with the default "BACK TO LOBBY" label', () => {
    render(
      <MemoryRouter>
        <LobbyButton />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /back to lobby/i });
    expect(link).toBeInTheDocument();
  });

  it('points at the root route ("/") by default', () => {
    render(
      <MemoryRouter>
        <LobbyButton />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /back to lobby/i })).toHaveAttribute('href', '/');
  });

  it('exposes an accessible name via aria-label', () => {
    render(
      <MemoryRouter>
        <LobbyButton />
      </MemoryRouter>,
    );
    // Querying by role+name proves the accessible-name pipeline works.
    expect(screen.getByRole('link', { name: 'BACK TO LOBBY' })).toBeInTheDocument();
  });

  it('respects a custom `label` prop', () => {
    render(
      <MemoryRouter>
        <LobbyButton label="EXIT TABLE" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /exit table/i })).toBeInTheDocument();
  });

  it('respects a custom `to` prop', () => {
    render(
      <MemoryRouter>
        <LobbyButton to="/lobby" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /back to lobby/i })).toHaveAttribute('href', '/lobby');
  });
});
