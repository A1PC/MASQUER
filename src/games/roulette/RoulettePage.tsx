import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { useReducedMotion } from 'framer-motion';
import GameShell from '@/games/_shared/GameShell';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance, useWalletStore } from '@/store/walletStore';
import { useRecentRounds } from '@/systems/hooks/useRecentRounds';
import type { RecentResultItem } from '@/games/_shared/RecentResults';
import BettingLayout from './BettingLayout';
import ChipSelector from './ChipSelector';
import WheelView from './WheelView';
import ResultBanner from './ResultBanner';
import { rouletteMachine } from './machine';
import { ROULETTE_CONFIG, type ChipDenomination } from './config';
import type { RouletteRoundDetails } from './types';

export default function RoulettePage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const reducedMotion = useReducedMotion() ?? false;

  const [chip, setChip] = useState<ChipDenomination>(5);

  const [state, send] = useMachine(rouletteMachine, {
    input: { spinDurationMs: reducedMotion ? 0 : ROULETTE_CONFIG.SPIN_DURATION_MS },
  });

  const placeBet = useWalletStore((s) => s.placeBet);
  const settleRound = useWalletStore((s) => s.settleRound);

  const handlesRef = useRef<Map<string, string>>(new Map());
  const settledRef = useRef<string | null>(null);

  const inBetting = state.matches('betting');
  const inSpinning = state.matches('spinning');
  const inSettled = state.matches('settled');
  const hasBets = state.context.bets.length > 0;
  const targetNumber = state.context.spinResult?.number ?? null;

  const handleSpinClick = useCallback(() => {
    if (!user) return;
    if (!inBetting || !hasBets) return;

    void (async () => {
      // Place each bet sequentially so a failure aborts cleanly.
      const newHandles: [string, string][] = [];
      for (const bet of state.context.bets) {
        const result = await placeBet({
          userId: user.id,
          game: 'roulette',
          amount: bet.amount,
          min: ROULETTE_CONFIG.MIN_BET,
          max: ROULETTE_CONFIG.MAX_BET,
        });
        if (!result.ok) {
          // Refund prior placements via settleRound with payout=amount (push).
          for (const [k, hId] of newHandles) {
            const amount = state.context.bets.find((b) => b.key === k)!.amount;
            await settleRound({
              handle: {
                betId: hId,
                userId: user.id,
                game: 'roulette',
                amount,
                placedAt: Date.now(),
              },
              result: {
                outcome: 'push',
                betAmount: amount,
                payout: amount,
                netChange: 0,
                details: { refunded: true, reason: 'partial-spin-abort' },
              },
            });
          }
          console.warn('Roulette SPIN aborted: placeBet failed', result.error);
          return;
        }
        newHandles.push([bet.key, result.handle.betId]);
      }
      for (const [k, h] of newHandles) handlesRef.current.set(k, h);
      send({ type: 'SPIN' });
    })();
  }, [user, inBetting, hasBets, state.context.bets, placeBet, settleRound, send]);

  // Settle bridge: on entering 'settled', call settleRound once.
  useEffect(() => {
    if (!inSettled || !user) return;
    const rr = state.context.roundResult;
    if (!rr) return;
    const firstKey = state.context.bets[0]?.key;
    if (!firstKey) return;
    const firstHandleId = handlesRef.current.get(firstKey);
    if (!firstHandleId) return;
    if (settledRef.current === firstHandleId) return;
    settledRef.current = firstHandleId;
    void (async () => {
      await settleRound({
        handle: {
          betId: firstHandleId,
          userId: user.id,
          game: 'roulette',
          amount: rr.betAmount,
          placedAt: Date.now(),
        },
        result: {
          outcome: rr.outcome,
          betAmount: rr.betAmount,
          payout: rr.payout,
          netChange: rr.netChange,
          details: rr.details,
        },
      });
    })();
  }, [inSettled, user, state.context.roundResult, state.context.bets, settleRound]);

  useEffect(() => {
    if (!inSettled) settledRef.current = null;
  }, [inSettled]);

  // Clear handlesRef when returning to betting with no spin result.
  useEffect(() => {
    if (inBetting && state.context.spinResult === null) {
      handlesRef.current.clear();
    }
  }, [inBetting, state.context.spinResult]);

  const rounds = useRecentRounds(user?.id, 'roulette', 12);
  const recentItems: RecentResultItem[] = useMemo(
    () =>
      rounds.map((r) => {
        const d = r.details as RouletteRoundDetails;
        const color = d.spin?.color ?? 'green';
        const badgeBg = color === 'red' ? '#a3122a' : color === 'black' ? '#1a1a1a' : '#3dd17a';
        return {
          key: r.id,
          badgeText: String(d.spin?.number ?? '?'),
          badgeColor: badgeBg,
          badgeTextColor: color === 'black' ? '#fff' : '#06120c',
          betLabel: String(r.betAmount),
          netChips: r.netChange,
          accent: r.outcome,
        };
      }),
    [rounds],
  );

  if (!user) return null;

  return (
    <GameShell
      title="🎡 ROULETTE"
      meta="Single-zero · 5–1000 · max 10 positions"
      game="roulette"
      recentItems={recentItems}
      bettingPanel={
        <div className="mx-auto flex max-w-[720px] flex-col gap-3 px-2">
          <ResultBanner
            visible={inSettled}
            spin={state.context.spinResult}
            netChange={state.context.roundResult?.netChange ?? 0}
          />
          <BettingLayout
            bets={state.context.bets}
            disabled={!inBetting}
            chipAmount={chip}
            onPlaceBet={(bet) => send({ type: 'PLACE_BET', bet: { ...bet, betHandleId: '' } })}
            onRemoveBet={(key) => send({ type: 'REMOVE_BET', key })}
            onClearAll={() => send({ type: 'CLEAR_ALL' })}
          />
          <div className="flex items-center justify-between gap-3">
            <ChipSelector value={chip} onChange={setChip} disabled={!inBetting} />
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/50">
                Balance: <span className="font-mono text-white/80">{balance.toLocaleString()}</span>
              </span>
              <button
                type="button"
                aria-label="SPIN"
                onClick={handleSpinClick}
                disabled={!inBetting || !hasBets}
                className="rounded-md bg-casino-red px-4 py-2 font-display text-sm tracking-wider text-white shadow-gold-glow hover:bg-casino-red-deep disabled:opacity-40"
              >
                SPIN
              </button>
              <button
                type="button"
                aria-label="New round"
                onClick={() => send({ type: 'NEW_ROUND' })}
                disabled={!inSettled}
                className="rounded-md border border-gold/40 bg-transparent px-3 py-2 text-xs text-gold-bright hover:bg-gold/10 disabled:opacity-40"
              >
                New round
              </button>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-4">
        <WheelView
          targetNumber={targetNumber}
          spinning={inSpinning}
          settled={inSettled}
          durationMs={reducedMotion ? 0 : ROULETTE_CONFIG.SPIN_DURATION_MS}
          reducedMotion={reducedMotion}
        />
      </div>
    </GameShell>
  );
}
