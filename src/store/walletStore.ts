import { create } from 'zustand';
import * as wallet from '@/systems/wallet';
import type {
  BetHandle,
  ClaimDailyResult,
  PlaceBetResult,
  RoundResult,
  SettleResult,
} from '@/systems/wallet';

interface WalletState {
  balance: number | null;
  nextDailyEligibleAt: number | null;
  hydrating: boolean;

  hydrate: (userId: string) => Promise<void>;
  clear: () => void;
  placeBet: (args: {
    userId: string;
    game: wallet.Game;
    amount: number;
    min: number;
    max: number;
  }) => Promise<PlaceBetResult>;
  settleRound: (args: { handle: BetHandle; result: RoundResult }) => Promise<SettleResult>;
  claimDaily: (userId: string) => Promise<ClaimDailyResult>;
}

export const useWalletStore = create<WalletState>((set) => ({
  balance: null,
  nextDailyEligibleAt: null,
  hydrating: false,

  hydrate: async (userId) => {
    set({ hydrating: true });
    const [balance, nextDailyEligibleAt] = await Promise.all([
      wallet.getBalance(userId),
      wallet.getDailyEligibleAt(userId),
    ]);
    set({ balance, nextDailyEligibleAt, hydrating: false });
  },

  clear: () => set({ balance: null, nextDailyEligibleAt: null, hydrating: false }),

  placeBet: async (args) => {
    const result = await wallet.placeBet(args);
    if (result.ok) set({ balance: result.newBalance });
    return result;
  },

  settleRound: async (args) => {
    const result = await wallet.settleRound(args);
    if (result.ok) set({ balance: result.newBalance });
    return result;
  },

  claimDaily: async (userId) => {
    const result = await wallet.claimDaily(userId);
    if (result.ok) {
      set({ balance: result.newBalance, nextDailyEligibleAt: result.nextEligibleAt });
    } else if (result.error === 'not_yet_eligible' && result.nextEligibleAt) {
      set({ nextDailyEligibleAt: result.nextEligibleAt });
    }
    return result;
  },
}));

export const useBalance = (): number | null => useWalletStore((s) => s.balance);
export const useNextDailyEligibleAt = (): number | null =>
  useWalletStore((s) => s.nextDailyEligibleAt);
