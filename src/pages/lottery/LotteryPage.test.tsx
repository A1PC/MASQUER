import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import LotteryPage from './LotteryPage';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { register } from '@/systems/auth';
import { resetDb } from '@/test/db-helpers';
import { db } from '@/db';

describe('LotteryPage shell', () => {
  beforeEach(async () => {
    await resetDb();
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
    useWalletStore.setState({ balance: null, nextDailyEligibleAt: null, hydrating: false });
  });

  it('returns null when no user is logged in', () => {
    const { container } = render(
      <MemoryRouter>
        <LotteryPage />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the page title and placeholder sections when logged in', async () => {
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
    expect(screen.getByText(/History slide/i)).toBeInTheDocument();
  });

  it('lets a user pick + add a manual line + buy a ticket', async () => {
    const r = await register({ username: 'buyer', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    await useWalletStore.getState().hydrate(r.user.id);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LotteryPage />
      </MemoryRouter>,
    );
    for (const n of [1, 2, 3, 4, 5]) {
      await user.click(screen.getByRole('button', { name: `Main number ${n}` }));
    }
    await user.click(screen.getByRole('button', { name: 'Bonus number 1' }));
    await user.click(screen.getByRole('button', { name: /add line/i }));
    await user.click(screen.getByRole('button', { name: /buy ticket/i }));
    await waitFor(() => expect(screen.getByText(/bought ticket/i)).toBeInTheDocument());
    const tickets = await db.lotteryTickets.toArray();
    expect(tickets).toHaveLength(1);
  });

  it('blocks adding a duplicate manual line with an inline error', async () => {
    const r = await register({ username: 'dup', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LotteryPage />
      </MemoryRouter>,
    );
    for (const n of [1, 2, 3, 4, 5]) {
      await user.click(screen.getByRole('button', { name: `Main number ${n}` }));
    }
    await user.click(screen.getByRole('button', { name: 'Bonus number 1' }));
    await user.click(screen.getByRole('button', { name: /add line/i }));
    for (const n of [1, 2, 3, 4, 5]) {
      await user.click(screen.getByRole('button', { name: `Main number ${n}` }));
    }
    await user.click(screen.getByRole('button', { name: 'Bonus number 1' }));
    await user.click(screen.getByRole('button', { name: /add line/i }));
    expect(screen.getByText(/already on the ticket/i)).toBeInTheDocument();
  });
});
