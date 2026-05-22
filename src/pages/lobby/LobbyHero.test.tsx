import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '@/components/ui';
import LobbyHero from './LobbyHero';
import { useWalletStore } from '@/store/walletStore';
import { useSessionStore } from '@/store/sessionStore';

vi.mock('@/systems/sound/useSound', () => ({ useSound: () => ({ play: vi.fn() }) }));

function renderHero(): void {
  render(
    <ToastProvider>
      <LobbyHero username="Adam" />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useSessionStore.setState({ currentUser: { id: 'u' } as never, bootstrapping: false });
});

describe('LobbyHero', () => {
  it('shows the welcome and balance when the player has chips', () => {
    useWalletStore.setState({ balance: 1234, nextDailyEligibleAt: null, hydrating: false });
    renderHero();
    expect(screen.getByRole('heading', { name: /welcome back, adam/i })).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('offers the daily claim CTA when eligible', () => {
    useWalletStore.setState({ balance: 500, nextDailyEligibleAt: null, hydrating: false });
    renderHero();
    expect(screen.getByRole('button', { name: /claim daily top-up/i })).toBeInTheDocument();
  });

  it('shows the next-eligible time instead of the CTA when not eligible', () => {
    useWalletStore.setState({
      balance: 500,
      nextDailyEligibleAt: Date.now() + 86_400_000,
      hydrating: false,
    });
    renderHero();
    expect(screen.queryByRole('button', { name: /claim daily top-up/i })).not.toBeInTheDocument();
    expect(screen.getByText(/next top-up/i)).toBeInTheDocument();
  });

  it('renders the zero-balance empty state with the claim CTA when out of chips', () => {
    useWalletStore.setState({ balance: 0, nextDailyEligibleAt: null, hydrating: false });
    renderHero();
    expect(screen.getByRole('heading', { name: /out of chips/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /claim daily top-up/i })).toBeInTheDocument();
  });

  it('zero-balance state shows the next-eligible time when not eligible', () => {
    useWalletStore.setState({
      balance: 0,
      nextDailyEligibleAt: Date.now() + 86_400_000,
      hydrating: false,
    });
    renderHero();
    expect(screen.getByRole('heading', { name: /out of chips/i })).toBeInTheDocument();
    expect(screen.getByText(/next top-up/i)).toBeInTheDocument();
  });
});
