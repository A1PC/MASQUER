import { describe, expect, it, beforeEach, vi } from 'vitest';
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

// Mock useSound so the page's win-tier stingers + chip.place commit sound
// are observable without booting the real audio engine.
const playMock = vi.fn();
vi.mock('@/systems/sound/useSound', () => ({
  useSound: () => ({ play: playMock }),
}));

describe('LotteryPage shell', () => {
  beforeEach(async () => {
    await resetDb();
    playMock.mockClear();
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

  it('renders the MASQUER Lottery title + LobbyButton + OddsInfoBox when logged in', async () => {
    const r = await register({ username: 'a', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    render(
      <MemoryRouter>
        <LotteryPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /masquer.*lottery/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to lobby/i })).toBeInTheDocument();
    expect(screen.getByText(/jackpot 20m/i)).toBeInTheDocument();
    expect(screen.getByText(/RECENT DRAWS/i)).toBeInTheDocument();
  });

  it('shows the RULES button which opens the rules modal', async () => {
    const r = await register({ username: 'rules', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LotteryPage />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: /rules/i }));
    expect(screen.getByRole('dialog', { name: /lottery.*rules/i })).toBeInTheDocument();
    // Spot-check a known rules section that only appears inside the modal.
    expect(screen.getByText(/OBJECT/)).toBeInTheDocument();
    expect(screen.getByText(/MATCH-2 FREE RE-ENTRY/)).toBeInTheDocument();
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
    for (const n of [1, 2, 3, 4, 5, 6]) {
      await user.click(screen.getByRole('button', { name: `Main number ${n}` }));
    }
    await user.click(screen.getByRole('button', { name: 'Bonus number 1' }));
    await user.click(screen.getByRole('button', { name: /add line/i }));
    await user.click(screen.getByRole('button', { name: /buy ticket/i }));
    await waitFor(() => expect(screen.getByText(/bought ticket/i)).toBeInTheDocument());
    const tickets = await db.lotteryTickets.toArray();
    expect(tickets).toHaveLength(1);
  });

  it('syncs the walletStore balance after buying a ticket (regression: UI used to lag behind Dexie)', async () => {
    const r = await register({ username: 'sync', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    await useWalletStore.getState().hydrate(r.user.id);
    const before = useWalletStore.getState().balance;
    expect(before).toBe(1_000);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LotteryPage />
      </MemoryRouter>,
    );
    for (const n of [1, 2, 3, 4, 5, 6]) {
      await user.click(screen.getByRole('button', { name: `Main number ${n}` }));
    }
    await user.click(screen.getByRole('button', { name: 'Bonus number 1' }));
    await user.click(screen.getByRole('button', { name: /add line/i }));
    await user.click(screen.getByRole('button', { name: /buy ticket/i }));
    await waitFor(() => expect(screen.getByText(/bought ticket/i)).toBeInTheDocument());
    // 1 line × LINE_COST (5) → balance should drop to 995 both in Dexie AND
    // in the Zustand store. The bug was that the store stayed at 1000 because
    // buyTicket calls wallet.placeBet directly (bypassing the store wrapper).
    await waitFor(() => expect(useWalletStore.getState().balance).toBe(995));
    expect(await db.balances.get(r.user.id).then((b) => b?.chips)).toBe(995);
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
    for (const n of [1, 2, 3, 4, 5, 6]) {
      await user.click(screen.getByRole('button', { name: `Main number ${n}` }));
    }
    await user.click(screen.getByRole('button', { name: 'Bonus number 1' }));
    await user.click(screen.getByRole('button', { name: /add line/i }));
    for (const n of [1, 2, 3, 4, 5, 6]) {
      await user.click(screen.getByRole('button', { name: `Main number ${n}` }));
    }
    await user.click(screen.getByRole('button', { name: 'Bonus number 1' }));
    await user.click(screen.getByRole('button', { name: /add line/i }));
    expect(screen.getByText(/already on the ticket/i)).toBeInTheDocument();
  });

  it('shows the purchase reveal modal after buying a ticket with lucky-dip lines', async () => {
    const r = await register({ username: 'dip', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    await useWalletStore.getState().hydrate(r.user.id);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LotteryPage />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: /add lucky dip/i }));
    await user.click(screen.getByRole('button', { name: /buy ticket/i }));
    await waitFor(() => expect(screen.getByText(/ticket purchased/i)).toBeInTheDocument());
  });

  it('opens the draw reveal modal when there are fresh missed draws', async () => {
    const r = await register({ username: 'backfill', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    // Seed an unsettled line for yesterday by writing directly to Dexie
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const y = yesterdayDate.getFullYear();
    const m = String(yesterdayDate.getMonth() + 1).padStart(2, '0');
    const d = String(yesterdayDate.getDate()).padStart(2, '0');
    const drawId = `${y}-${m}-${d}`;
    const ticketId = crypto.randomUUID();
    await db.lotteryTickets.put({
      id: ticketId,
      userId: r.user.id,
      drawId,
      purchasedAt: yesterdayDate.getTime(),
      totalCost: 10,
      lineCount: 1,
    });
    await db.lotteryLines.put({
      id: crypto.randomUUID(),
      ticketId,
      userId: r.user.id,
      drawId,
      mainNumbers: [1, 2, 3, 4, 5, 6],
      bonusNumber: 1,
      isLuckyDip: false,
      isFreeReentry: false,
      settled: false,
      matchTier: null,
      payout: 0,
    });
    render(
      <MemoryRouter>
        <LotteryPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/DRAW /i)).toBeInTheDocument(), { timeout: 3000 });
  });
});
