import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/components/ui';
import DailyClaimChip from './DailyClaimChip';
import { useWalletStore } from '@/store/walletStore';
import { useSessionStore } from '@/store/sessionStore';

const play = vi.fn();
vi.mock('@/systems/sound/useSound', () => ({ useSound: () => ({ play }) }));

function setup(eligibleAt: number | null) {
  useSessionStore.setState({ currentUser: { id: 'u' } as never, bootstrapping: false });
  useWalletStore.setState({ balance: 0, nextDailyEligibleAt: eligibleAt, hydrating: false });
  return render(
    <ToastProvider>
      <DailyClaimChip />
    </ToastProvider>,
  );
}

describe('DailyClaimChip', () => {
  beforeEach(() => vi.clearAllMocks());
  it('hides when not eligible', () => {
    setup(Date.now() + 60_000);
    expect(screen.queryByRole('button', { name: /claim/i })).not.toBeInTheDocument();
  });
  it('claims + plays a sound when eligible', async () => {
    const claimDaily = vi.fn(() =>
      Promise.resolve({ ok: true, newBalance: 500, nextEligibleAt: Date.now() + 86_400_000 }),
    );
    useWalletStore.setState({ claimDaily } as never);
    setup(null);
    await userEvent.click(screen.getByRole('button', { name: /claim/i }));
    await waitFor(() => expect(claimDaily).toHaveBeenCalledWith('u'));
    expect(play).toHaveBeenCalledWith('win.small');
  });
});
