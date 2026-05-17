import { useCallback, useState } from 'react';
import { useWalletStore } from '@/store/walletStore';
import { useCurrentUser } from '@/store/sessionStore';
import type { BetHandle, Game, PlaceBetError, RoundResult } from '@/systems/wallet';

interface PlaceBetSuccess {
  ok: true;
  handle: BetHandle;
}
interface PlaceBetFailure {
  ok: false;
  error: PlaceBetError;
}

export interface UseGameRound {
  placeBet: (
    amount: number,
    opts: { min: number; max: number },
  ) => Promise<PlaceBetSuccess | PlaceBetFailure>;
  settle: (handle: BetHandle, result: RoundResult) => Promise<void>;
  resolving: boolean;
}

export function useGameRound(game: Game): UseGameRound {
  const user = useCurrentUser();
  const place = useWalletStore((s) => s.placeBet);
  const settleStore = useWalletStore((s) => s.settleRound);
  const [resolving, setResolving] = useState(false);

  const placeBet = useCallback<UseGameRound['placeBet']>(
    async (amount, opts) => {
      if (!user) return { ok: false, error: 'no_user' };
      const result = await place({ userId: user.id, game, amount, ...opts });
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, handle: result.handle };
    },
    [user, place, game],
  );

  const settle = useCallback<UseGameRound['settle']>(
    async (handle, result) => {
      setResolving(true);
      try {
        await settleStore({ handle, result });
      } finally {
        setResolving(false);
      }
    },
    [settleStore],
  );

  return { placeBet, settle, resolving };
}
