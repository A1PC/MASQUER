import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { useReducedMotion } from 'framer-motion';
import GameShell from '@/games/_shared/GameShell';
import BettingPanel from '@/games/_shared/BettingPanel';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance, useWalletStore } from '@/store/walletStore';
import { useRecentRounds } from '@/systems/hooks/useRecentRounds';
import type { RecentResultItem } from '@/games/_shared/RecentResults';
import Paytable from './Paytable';
import ReelView from './ReelView';
import { slotsMachine } from './machine';
import { SLOTS_CONFIG } from './config';
import type { SlotsRoundDetails } from './types';
import { SYMBOL_DISPLAY } from './symbols';

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

  const rounds = useRecentRounds(user?.id, 'slots', 12);
  const recentItems: RecentResultItem[] = useMemo(
    () =>
      rounds.map((r) => {
        const d = r.details as SlotsRoundDetails;
        const tier = d.winTier;
        const badgeBg =
          tier === 'jackpot'
            ? '#ff5cf2'
            : tier === 'medium'
              ? '#d4af37'
              : tier === 'small'
                ? '#3dd17a'
                : '#7a1f2b';
        const badgeText = d.spin.reels.map((s) => SYMBOL_DISPLAY[s].label[0]).join('');
        return {
          key: r.id,
          badgeText,
          badgeColor: badgeBg,
          badgeTextColor: '#06120c',
          betLabel: String(r.betAmount),
          netChips: r.netChange,
          accent: r.outcome,
        };
      }),
    [rounds],
  );

  if (!user) return null;

  return (
    <>
      {}
      <style
        dangerouslySetInnerHTML={{
          __html: `
      @keyframes slotsJackpotTint {
        0% { opacity: 0; }
        20% { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes slotsMediumBurst {
        0% { opacity: 0; transform: scale(0.6); }
        40% { opacity: 1; transform: scale(1.1); }
        100% { opacity: 0; transform: scale(1.3); }
      }
      @keyframes slotsCoinFall {
        0% { transform: translateY(-30px); opacity: 0; }
        20% { opacity: 1; }
        100% { transform: translateY(260px); opacity: 0; }
      }
    `,
        }}
      />
      <GameShell
        title="🎰 SLOTS"
        meta="3 reels · 5–1000"
        recentItems={recentItems}
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
          {inSettled && (
            <WinCelebration
              tier={roundResult?.details.winTier ?? 'none'}
              netChange={roundResult?.netChange ?? 0}
              reducedMotion={reducedMotion}
            />
          )}
        </div>
      </GameShell>
    </>
  );
}

function WinCelebration({
  tier,
  netChange,
  reducedMotion,
}: {
  tier: 'none' | 'small' | 'medium' | 'jackpot';
  netChange: number;
  reducedMotion: boolean;
}): JSX.Element {
  // Always render the container (so tests can find it by data-roulette-layer).
  // Only render visual content for non-none tiers.
  const isJackpot = tier === 'jackpot';
  const hasVisual = tier !== 'none';
  const verdict =
    netChange > 0
      ? `You won $${netChange}`
      : netChange < 0
        ? `You lost $${Math.abs(netChange)}`
        : 'Even';

  return (
    <div
      data-roulette-layer="win-celebration"
      data-win-tier={tier}
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
    >
      {isJackpot && !reducedMotion && (
        <>
          {/* magenta tint */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle, rgba(255,92,242,0.18) 0%, transparent 70%)',
              animation: 'slotsJackpotTint 1500ms ease-out',
            }}
          />

          {/* 12 coin-shower particles — deterministic jitter (no Math.random) */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              data-coin-particle
              data-particle-index={i}
              aria-hidden
              className="absolute"
              style={{
                top: 0,
                left: `${(i * 100) / 12 + ((i * 7) % 5)}%`,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #ffd23f, #d4af37)',
                boxShadow: '0 0 4px rgba(212,175,55,0.8)',
                animation: `slotsCoinFall 1500ms ease-out ${i * 80}ms forwards`,
                opacity: 0,
              }}
            />
          ))}
        </>
      )}

      {tier === 'medium' && !reducedMotion && (
        <div
          aria-hidden
          className="absolute"
          style={{
            width: 320,
            height: 80,
            background:
              'radial-gradient(ellipse at center, rgba(255,224,102,0.5) 0%, transparent 70%)',
            animation: 'slotsMediumBurst 800ms ease-out',
          }}
        />
      )}

      {hasVisual && (
        <div
          className="rounded-md border px-5 py-2 font-display text-sm tracking-wider"
          style={{
            borderColor: isJackpot ? '#ff5cf2' : '#d4af37',
            background: '#06120c',
            color: isJackpot ? '#ff5cf2' : '#ffe066',
            textShadow: isJackpot ? '0 0 8px rgba(255,92,242,0.8)' : 'none',
            marginTop: -200,
          }}
        >
          {isJackpot ? `JACKPOT! $${netChange}` : verdict}
        </div>
      )}
    </div>
  );
}
