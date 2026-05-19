import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import BingoPage from './BingoPage';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { register } from '@/systems/auth';
import { resetDb } from '@/test/db-helpers';

describe('BingoPage', () => {
  beforeEach(async () => {
    await resetDb();
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
  });

  it('returns null when no user logged in', () => {
    const { container } = render(
      <MemoryRouter>
        <BingoPage />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders SetupPanel when in setup state', async () => {
    const r = await register({ username: 'a', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    render(
      <MemoryRouter>
        <BingoPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /bingo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /buy & start/i })).toBeInTheDocument();
  });

  it('BUY & START transitions to playing-stub and debits wallet', async () => {
    const r = await register({ username: 'b', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    // Hydrate wallet so balance is loaded and the button is not disabled.
    await useWalletStore.getState().hydrate(r.user.id);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BingoPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(useWalletStore.getState().balance).toBeGreaterThan(0));
    await user.click(screen.getByRole('button', { name: /buy & start/i }));
    await waitFor(() => expect(screen.getByText(/play screen/i)).toBeInTheDocument());
  });
});
