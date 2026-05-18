import type { JSX } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { useReducedMotion } from 'framer-motion';
import GameShell from '@/games/_shared/GameShell';
import BettingPanel from '@/games/_shared/BettingPanel';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance, useWalletStore } from '@/store/walletStore';
import Paytable from './Paytable';
import ReelView from './ReelView';
import { slotsMachine } from './machine';
import { SLOTS_CONFIG } from './config';

export default function SlotsPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const reducedMotion = useReducedMotion() ?? false;

  const [state, send] = useMachine(slotsMachine, {
    input: {
      totalSpinDurationMs: reducedMotion
        ? 0
        : SLOTS_CONFIG.REEL_STOP_TIMES_MS[SLOTS_CONFIG.REEL_STOP_TIMES_MS.length - 1]!,
    },
  });

  // Reset BettingPanel commit state when the round resets.
  const [bettingPanelKey, setBettingPanelKey] = useState(0);

  const placeBet = useWalletStore((s) => s.placeBet);
  const settleRound = useWalletStore((s) => s.settleRound);

  const handleRef = useRef<{ betId: string; amount: number } | null>(null);
  const settledRef = useRef<string | null>(null);

  const inBetting = state.matches('betting');
  const inSpinning = state.matches('spinning');
  const inSettled = state.matches('settled');
  const hasBet = state.context.bet >= SLOTS_CONFIG.MIN_BET;

  const spinResult = state.context.spinResult;
  const roundResult = state.context.roundResult;
  const payout = roundResult?.details.payout ?? null;
  const winning = (idx: number) =>
    inSettled && payout !== null && payout.winningReelIndices.includes(idx);

  const handlePlaceAndSpin = useCallback(
    async (amount: number) => {
      if (!user) return;
      const result = await placeBet({
        userId: user.id,
        game: 'slots',
        amount,
        min: SLOTS_CONFIG.MIN_BET,
        max: SLOTS_CONFIG.MAX_BET,
      });
      if (!result.ok) {
        console.warn('Slots placeBet failed:', result.error);
        return;
      }
      handleRef.current = { betId: result.handle.betId, amount };
      send({ type: 'PLACE_BET', bet: amount, betHandleId: result.handle.betId });
      send({ type: 'SPIN' });
    },
    [user, placeBet, send],
  );

  // Settle bridge — call settleRound exactly once when entering settled state.
  useEffect(() => {
    if (!inSettled || !user) return;
    if (!roundResult) return;
    const handle = handleRef.current;
    if (!handle) return;
    if (settledRef.current === handle.betId) return;
    settledRef.current = handle.betId;
    void (async () => {
      await settleRound({
        handle: {
          betId: handle.betId,
          userId: user.id,
          game: 'slots',
          amount: handle.amount,
          placedAt: Date.now(),
        },
        result: {
          outcome: roundResult.outcome,
          betAmount: roundResult.betAmount,
          payout: roundResult.payout,
          netChange: roundResult.netChange,
          details: roundResult.details,
        },
      });
    })();
  }, [inSettled, user, roundResult, settleRound]);

  useEffect(() => {
    if (!inSettled) settledRef.current = null;
  }, [inSettled]);

  useEffect(() => {
    if (inBetting && state.context.spinResult === null) {
      handleRef.current = null;
    }
  }, [inBetting, state.context.spinResult]);

  const handleSpinClick = useCallback(() => {
    if (!inBetting || !hasBet) return;
    void handlePlaceAndSpin(state.context.bet);
  }, [inBetting, hasBet, handlePlaceAndSpin, state.context.bet]);

  if (!user) return null;

  return (
    <GameShell
      title="🎰 SLOTS"
      meta="3 reels · 5–1000"
      bettingPanel={
        <div className="mx-auto flex max-w-[640px] flex-col gap-3 px-2">
          <BettingPanel
            key={bettingPanelKey}
            min={SLOTS_CONFIG.MIN_BET}
            max={SLOTS_CONFIG.MAX_BET}
            balance={balance}
            onCommit={(amount) => {
              if (inSettled) {
                send({ type: 'NEW_ROUND' });
                setBettingPanelKey((k) => k + 1);
              }
              send({ type: 'PLACE_BET', bet: amount, betHandleId: '' });
            }}
            callButtons={() => (
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleSpinClick}
                  disabled={!inBetting || !hasBet}
                  className="rounded-md bg-casino-red px-4 py-2 font-display text-sm tracking-wider text-white shadow-gold-glow hover:bg-casino-red-deep disabled:opacity-40"
                >
                  SPIN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    send({ type: 'NEW_ROUND' });
                    setBettingPanelKey((k) => k + 1);
                  }}
                  disabled={!inSettled}
                  className="rounded-md border border-gold/40 bg-transparent px-3 py-2 text-xs text-gold-bright hover:bg-gold/10 disabled:opacity-40"
                >
                  New round
                </button>
              </div>
            )}
          />
        </div>
      }
    >
      <div className="relative flex flex-1 flex-col items-center justify-center gap-5 px-6 py-4">
        <Paytable winningKey={payout?.key ?? null} />
        <div className="flex gap-3">
          {[0, 1, 2].map((i) => (
            <ReelView
              key={i}
              reelIndex={i as 0 | 1 | 2}
              symbol={spinResult?.reels[i] ?? null}
              spinning={inSpinning}
              stopAtMs={SLOTS_CONFIG.REEL_STOP_TIMES_MS[i]!}
              reducedMotion={reducedMotion}
              winning={winning(i)}
            />
          ))}
        </div>
      </div>
    </GameShell>
  );
}
