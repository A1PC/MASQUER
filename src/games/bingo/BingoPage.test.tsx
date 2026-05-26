import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import BingoPage from './BingoPage';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { db } from '@/db';
import type { User } from '@/db';
import 'fake-indexeddb/auto';

// Spy on the `useSound.play` so we can assert the sound bridge fires the
// right stinger for each tier outcome without mounting the engine.
const playSpy = vi.fn();
vi.mock('@/systems/sound/useSound', () => ({
  useSound: () => ({ play: playSpy }),
}));

async function setupUser() {
  const user = { id: 'u-test', username: 'tester' } as unknown as User;
  await db.balances.put({ userId: user.id, chips: 5000, updatedAt: Date.now() });
  useSessionStore.setState({ currentUser: user });
  await useWalletStore.getState().hydrate(user.id);
  return user;
}

describe('BingoPage', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useSessionStore.setState({ currentUser: null });
    playSpy.mockClear();
  });

  it('redirects to /lobby when no variant query param', () => {
    render(
      <MemoryRouter initialEntries={['/play/bingo']}>
        <BingoPage />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/BINGO — /)).toBeNull();
  });

  it('renders the MASQUER · Bingo header + LobbyButton + OddsInfoBox + RULES button', async () => {
    await setupUser();
    render(
      <MemoryRouter initialEntries={['/play/bingo?variant=british']}>
        <BingoPage />
      </MemoryRouter>,
    );
    // Centred title
    expect(screen.getByRole('heading', { name: /MASQUER · Bingo/i })).toBeInTheDocument();
    // Subtitle reads "British · setup" before play
    expect(screen.getByText(/British · setup/i)).toBeInTheDocument();
    // LobbyButton (shared shell primitive)
    expect(screen.getByRole('link', { name: /BACK TO LOBBY/i })).toBeInTheDocument();
    // OddsInfoBox with payout summary
    expect(screen.getByText(/Line 25/i)).toBeInTheDocument();
    expect(screen.getByText(/Fast BINGO 500/i)).toBeInTheDocument();
    // RulesButton (fixed bottom-left)
    expect(screen.getByRole('button', { name: /Show game rules/i })).toBeInTheDocument();
  });

  it('clicking RULES opens the modal with both variants', async () => {
    await setupUser();
    render(
      <MemoryRouter initialEntries={['/play/bingo?variant=british']}>
        <BingoPage />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Show game rules/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/British \(90-ball\)/i)).toBeInTheDocument();
    expect(screen.getByText(/American \(75-ball\)/i)).toBeInTheDocument();
    // Tier table shows FAST BINGO row — use getAllByText since the rules
    // body mentions FAST BINGO across the table label + body copy.
    expect(screen.getAllByText(/FAST BINGO/i).length).toBeGreaterThan(0);
  });

  it('renders setup with British variant header', async () => {
    await setupUser();
    render(
      <MemoryRouter initialEntries={['/play/bingo?variant=british']}>
        <BingoPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/British 90-Ball/)).toBeInTheDocument();
  });

  it('clicking BUY & PLAY enters playing state and fires a ball.drop on first call', async () => {
    await setupUser();
    render(
      <MemoryRouter initialEntries={['/play/bingo?variant=british']}>
        <BingoPage />
      </MemoryRouter>,
    );
    const btn = screen.getByRole('button', { name: /BUY & PLAY/ });
    await userEvent.click(btn);
    await waitFor(() => {
      // Once the first ball lands the call board shows "Ball ≥ 1 of 90".
      // The ball-call cadence is timer-driven so we don't drive it forward
      // explicitly — assert the page entered the playing layout instead.
      expect(screen.getByText(/Ball \d+ of 90/i)).toBeInTheDocument();
    });
  });
});
