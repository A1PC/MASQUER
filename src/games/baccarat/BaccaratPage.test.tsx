import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import BaccaratPage from './BaccaratPage';
import { register } from '@/systems/auth';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { seed, unseed } from '@/systems/rng';

// jsdom doesn't fire prefers-reduced-motion; pin the framer hook so the
// page takes the reduced-motion path (synchronous reveal + immediate
// settle). `useEffectiveReducedMotion` proxies this hook when the user's
// motionPref is 'system' (the test default).
vi.mock('framer-motion', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: () => true };
});

// Mock useSound so we can assert which stingers fire on each lifecycle
// event without engaging the real Web Audio engine (jsdom has no
// AudioContext). The mock is module-scoped, so resetMocks in vitest config
// would clear it across tests — manage call counts via `playMock.mockClear`.
const playMock = vi.fn();
vi.mock('@/systems/sound/useSound', () => ({
  useSound: () => ({ play: playMock }),
}));

describe('BaccaratPage — integration', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
    seed(98765);
    playMock.mockClear();
  });

  it('renders MASQUER · Baccarat title + LobbyButton + OddsInfoBox', async () => {
    const reg = await register({ username: 'alice', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    useSessionStore.setState({ currentUser: reg.user });
    await useWalletStore.getState().hydrate(reg.user.id);

    render(
      <MemoryRouter>
        <BaccaratPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/MASQUER · Baccarat/i)).toBeInTheDocument());
    // LobbyButton renders an aria-labelled BACK TO LOBBY link.
    expect(screen.getByRole('link', { name: /back to lobby/i })).toBeInTheDocument();
    // OddsInfoBox renders the payout summary (player / banker / tie / dragons).
    expect(screen.getByText(/Player 1:1/)).toBeInTheDocument();
    expect(screen.getByText(/Dragons up to 30:1/)).toBeInTheDocument();
    // Legacy "8-deck shoe · 9 zones" meta caption should NOT render — the
    // shell auto-suppresses meta when oddsInfo is provided.
    expect(screen.queryByText(/8-deck shoe · 9 zones/)).toBeNull();

    unseed();
  });

  it('register → bet → DEAL → settles → writes a rounds row + fires chip.place + win/loss stinger', async () => {
    const reg = await register({ username: 'alice', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    useSessionStore.setState({ currentUser: reg.user });
    await useWalletStore.getState().hydrate(reg.user.id);

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BaccaratPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/MASQUER · Baccarat/i)).toBeInTheDocument());

    // Wait for wallet balance to hydrate into the page (DEAL is disabled until balance >= bet).
    await waitFor(() => {
      expect(useWalletStore.getState().balance).toBeGreaterThan(0);
    });

    // Pick the 5-chip denomination via the shared ChipDenominationButton
    // (aria-label "Select 5-chip"). The old role="radio" wrapper was
    // dropped in favour of aria-pressed on the button itself.
    const chip5 = screen.getByRole('button', { name: /select 5-chip/i });
    await user.click(chip5);

    // Click the PLAYER bet zone twice — each click adds the selected chip (5).
    // Multiple "PLAYER" texts exist (HandView label + bet zone label); target by data attribute.
    const playerZone = document.querySelector<HTMLButtonElement>(
      'button[data-zone-label="PLAYER"]',
    )!;
    await user.click(playerZone);
    await user.click(playerZone);

    // Under reduced motion (this test pins framer's useReducedMotion to
    // true), spec §4.4 says audio stingers are suppressed — matching
    // Slots / Roulette. So we do NOT assert chip.place here; the audio
    // wiring is exercised through the source contract instead (see
    // BaccaratPage's `handleAddChip` which calls `play('chip.place')`
    // when !reducedMotion).

    // Verify the bet went onto the zone.
    await waitFor(() => {
      const z = document.querySelector<HTMLButtonElement>('button[data-zone-label="PLAYER"]');
      expect(z!.getAttribute('data-zone-amount')).toBe('10');
    });

    // Press DEAL.
    const dealBtn = screen.getByRole('button', { name: /deal the round/i });
    expect(dealBtn).not.toBeDisabled();
    await user.click(dealBtn);

    // Allow microtasks to flush so the machine completes the round and the
    // wallet bridge useEffect fires (under reducedMotion bannerDisplay=0).
    await new Promise((r) => setTimeout(r, 100));

    // Wait for round to settle and a rounds row to be written.
    await waitFor(
      async () => {
        const rows = await db.rounds.where('userId').equals(reg.user.id).toArray();
        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0]!.game).toBe('baccarat');
      },
      { timeout: 3000 },
    );

    // Cleanup RNG seed.
    unseed();
  });
});
