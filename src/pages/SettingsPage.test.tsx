import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import SettingsPage from './SettingsPage';
import { ToastProvider } from '@/components/ui';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { usePrefsStore } from '@/store/prefsStore';
import { useWalletStore } from '@/store/walletStore';
import { useSessionStore } from '@/store/sessionStore';
import type { Round, User } from '@/db';

// jsdom lacks the pointer/scroll APIs Radix Select relies on.
beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  proto['hasPointerCapture'] ??= (): boolean => false;
  proto['setPointerCapture'] ??= (): void => {};
  proto['releasePointerCapture'] ??= (): void => {};
  proto['scrollIntoView'] ??= (): void => {};
});

const testUser: User = {
  id: 'u-settings',
  username: 'Adam',
  usernameLower: 'adam',
  passwordHash: '',
  passwordSalt: '',
  pbkdf2Iterations: 600_000,
  avatarColor: '#a3122a',
  createdAt: Date.now(),
};

function makeRound(id: string): Round {
  return {
    id,
    userId: testUser.id,
    game: 'coin-flip',
    betAmount: 10,
    payout: 20,
    netChange: 10,
    outcome: 'win',
    details: {},
    balanceAfter: 1_010,
    playedAt: Date.now(),
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <SettingsPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await resetDb();
  useSessionStore.setState({ currentUser: testUser, bootstrapping: false });
  useWalletStore.setState({ balance: 1_000, nextDailyEligibleAt: null, hydrating: false });
  await usePrefsStore.getState().hydrate(testUser.id);
});

afterEach(async () => {
  await resetDb();
  usePrefsStore.setState({ prefs: null });
});

describe('SettingsPage', () => {
  it('renders the three sections', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('Sound')).toBeInTheDocument();
    expect(screen.getByText('Motion')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  it('toggling the master sound switch persists soundEnabled', async () => {
    renderPage();
    await userEvent.click(screen.getByLabelText('Sound effects'));
    await waitFor(() => expect(usePrefsStore.getState().prefs?.soundEnabled).toBe(false));
  });

  it('disables the category + volume controls when sound is off', async () => {
    await usePrefsStore.getState().update({ soundEnabled: false });
    renderPage();
    expect(screen.getByLabelText('UI sounds')).toBeDisabled();
    expect(screen.getByLabelText('Game sounds')).toBeDisabled();
    expect(screen.getByLabelText('Ambience')).toBeDisabled();
    expect(screen.getByLabelText('Master volume')).toHaveAttribute('data-disabled');
  });

  it('toggling a category switch persists the matching mute', async () => {
    renderPage();
    await userEvent.click(screen.getByLabelText('UI sounds'));
    await waitFor(() => expect(usePrefsStore.getState().prefs?.muteUi).toBe(true));
  });

  it('moving the volume slider persists masterVolume as value / 100', async () => {
    renderPage();
    const slider = screen.getByLabelText('Master volume');
    slider.focus();
    // Arrow-right nudges the slider 70 -> 71, persisting 0.71.
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    await waitFor(() => expect(usePrefsStore.getState().prefs?.masterVolume).toBeCloseTo(0.71, 5));
  });

  it('changing the motion select persists motionPref', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('combobox', { name: 'Motion preference' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Reduced' }));
    await waitFor(() => expect(usePrefsStore.getState().prefs?.motionPref).toBe('reduced'));
  });

  it('clear history opens a confirm modal and deletes rounds on confirm', async () => {
    await db.rounds.add(makeRound('r1'));
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /clear play history/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/clear play history\?/i)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: /clear history/i }));
    await waitFor(async () =>
      expect(await db.rounds.where('userId').equals(testUser.id).count()).toBe(0),
    );
    await waitFor(() =>
      expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(/cleared/i),
    );
  });

  it('cancelling the clear-history modal keeps rounds', async () => {
    await db.rounds.add(makeRound('r2'));
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /clear play history/i }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
    expect(await db.rounds.where('userId').equals(testUser.id).count()).toBe(1);
  });

  it('delete account opens a confirm modal and wipes the user + logs out on confirm', async () => {
    const logout = vi.fn(() => Promise.resolve());
    useSessionStore.setState({ logout });
    await db.users.add(testUser);
    await db.rounds.add(makeRound('r3'));
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /^delete account$/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/delete account\?/i)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: /delete forever/i }));
    await waitFor(async () => expect(await db.users.get(testUser.id)).toBeUndefined());
    expect(await db.rounds.where('userId').equals(testUser.id).count()).toBe(0);
    expect(logout).toHaveBeenCalled();
  });
});
