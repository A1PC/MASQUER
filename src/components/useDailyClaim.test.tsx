import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui';
import { useDailyClaim } from './useDailyClaim';
import { useWalletStore } from '@/store/walletStore';
import { useSessionStore } from '@/store/sessionStore';

const play = vi.fn();
vi.mock('@/systems/sound/useSound', () => ({ useSound: () => ({ play }) }));

function wrapper({ children }: { children: ReactNode }): ReactNode {
  return <ToastProvider>{children}</ToastProvider>;
}

function setup(eligibleAt: number | null): void {
  useSessionStore.setState({ currentUser: { id: 'u' } as never, bootstrapping: false });
  useWalletStore.setState({ balance: 0, nextDailyEligibleAt: eligibleAt, hydrating: false });
}

describe('useDailyClaim', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports eligible when the next-eligible time has passed (or is null)', () => {
    setup(null);
    const { result } = renderHook(() => useDailyClaim(), { wrapper });
    expect(result.current.eligible).toBe(true);
  });

  it('reports not eligible when the next-eligible time is in the future', () => {
    setup(Date.now() + 60_000);
    const { result } = renderHook(() => useDailyClaim(), { wrapper });
    expect(result.current.eligible).toBe(false);
  });

  it('claims through walletStore and plays the win sound on success', async () => {
    const claimDaily = vi.fn(() =>
      Promise.resolve({ ok: true, newBalance: 500, nextEligibleAt: Date.now() + 86_400_000 }),
    );
    useWalletStore.setState({ claimDaily } as never);
    setup(null);
    const { result } = renderHook(() => useDailyClaim(), { wrapper });
    await act(async () => {
      await result.current.claim();
    });
    expect(claimDaily).toHaveBeenCalledWith('u');
    expect(play).toHaveBeenCalledWith('win.small');
  });

  it('is a no-op without a user', async () => {
    const claimDaily = vi.fn();
    useWalletStore.setState({ claimDaily } as never);
    useSessionStore.setState({ currentUser: null, bootstrapping: false });
    useWalletStore.setState({ balance: 0, nextDailyEligibleAt: null });
    const { result } = renderHook(() => useDailyClaim(), { wrapper });
    await act(async () => {
      await result.current.claim();
    });
    expect(claimDaily).not.toHaveBeenCalled();
  });
});
