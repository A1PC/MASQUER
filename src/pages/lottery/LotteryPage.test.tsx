import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import LotteryPage from './LotteryPage';
import { useSessionStore } from '@/store/sessionStore';
import { register } from '@/systems/auth';
import { resetDb } from '@/test/db-helpers';

describe('LotteryPage shell', () => {
  beforeEach(async () => {
    await resetDb();
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
  });

  it('returns null when no user is logged in', () => {
    const { container } = render(
      <MemoryRouter>
        <LotteryPage />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the page title and 3 placeholder sections when logged in', async () => {
    const r = await register({ username: 'a', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    render(
      <MemoryRouter>
        <LotteryPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /daily lottery/i })).toBeInTheDocument();
    expect(screen.getByText(/HERO countdown/i)).toBeInTheDocument();
    expect(screen.getByText(/Buy a Ticket/i)).toBeInTheDocument();
    expect(screen.getByText(/History slide/i)).toBeInTheDocument();
  });
});
