import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui';
import { useNextDailyEligibleAt, useWalletStore } from '@/store/walletStore';
import { useCurrentUser } from '@/store/sessionStore';
import { useSound } from '@/systems/sound/useSound';
import { WALLET_CONFIG } from '@/systems/wallet';

export interface UseDailyClaim {
  /** True when the daily top-up can be claimed right now. */
  eligible: boolean;
  /** Epoch ms the next claim unlocks, or `null` if never claimed (eligible now). */
  nextEligibleAt: number | null;
  /** The fixed daily-claim chip amount (from `WALLET_CONFIG`). */
  amount: number;
  /** Claims the daily top-up: routes through `walletStore.claimDaily`
   *  (integer money), then on success plays `win.small` + fires a win Toast.
   *  No-op when there is no user. Safe to `void`. */
  claim: () => Promise<void>;
}

/**
 * Shared daily-top-up flow for the chip, the lobby hero, and the zero-balance
 * empty state — one implementation so every surface claims, sounds, and toasts
 * identically. Eligibility is a render-time snapshot of `now` (the chip mounts
 * fresh each session; `claimDaily` re-validates server-side anyway).
 */
export function useDailyClaim(): UseDailyClaim {
  const eligibleAt = useNextDailyEligibleAt();
  const claimDaily = useWalletStore((s) => s.claimDaily);
  const user = useCurrentUser();
  const { toast } = useToast();
  const { play } = useSound();

  // `Date.now()` is impure in render; snapshot it once on mount (the surface
  // mounts fresh each session and `claimDaily` re-validates eligibility anyway).
  const [now] = useState(() => Date.now());
  const eligible = (eligibleAt ?? 0) <= now;

  const claim = useCallback(async (): Promise<void> => {
    if (!user) return;
    const res = await claimDaily(user.id);
    if (res.ok) {
      play('win.small');
      toast({
        title: `+${WALLET_CONFIG.DAILY_CLAIM_AMOUNT} chips`,
        description: 'Daily top-up claimed.',
        tone: 'win',
      });
    }
  }, [user, claimDaily, play, toast]);

  return {
    eligible,
    nextEligibleAt: eligibleAt,
    amount: WALLET_CONFIG.DAILY_CLAIM_AMOUNT,
    claim,
  };
}
