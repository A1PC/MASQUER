import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMachine } from '@xstate/react';
import { useReducedMotion } from 'framer-motion';
import GameShell from '@/games/_shared/GameShell';
import SlotsRules from './rules';
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

  const placeBet = useWalletStore((s) => s.placeBet);
  const settleRound = useWalletStore((s) => s.settleRound);

  const handleRef = useRef<{ betId: string; amount: number } | null>(null);
  const settledRef = useRef<string | null>(null);

  const inBetting = state.matches('betting');
  const inSpinning = state.matches('spinning');
  const hasBet = state.context.bet >= SLOTS_CONFIG.MIN_BET;

  const spinResult = state.context.spinResult;
  const roundResult = state.context.roundResult;
  const payout = roundResult?.details.payout ?? null;
  // The reels show the winning highlight once the spin has resolved (i.e.
  // roundResult is populated). The state has already auto-transitioned back
  // to `betting`, so we can't gate on a settled state any more.
  const winning = (idx: number) =>
    roundResult !== null && payout !== null && payout.winningReelIndices.includes(idx);

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

  // Settle bridge — call settleRound exactly once when a new roundResult
  // appears. With the two-state machine, the result lands while we're back
  // in `betting`, so we no longer gate on a settled state.
  useEffect(() => {
    if (!user) return;
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
  }, [user, roundResult, settleRound]);

  // When a new spin starts, clear the dedup guards so the next round can
  // settle independently.
  useEffect(() => {
    if (inSpinning) {
      settledRef.current = null;
    }
  }, [inSpinning]);

  // The machine's `spinCount` increments once per completed spin. Using it
  // as the BettingPanel key remounts the panel between rounds so its
  // internal `committed` state clears and the player can bet again
  // immediately — no useEffect / useState chain needed.
  const bettingPanelKey = state.context.spinCount;

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
        100% { transform: translateY(320px); opacity: 0; }
      }
    `,
        }}
      />
      <GameShell
        title="🎰 SLOTS"
        meta="3 reels · 5–1000"
        game="slots"
        recentItems={recentItems}
        rules={<SlotsRules />}
        bettingPanel={
          <div className="mx-auto flex max-w-[640px] flex-col gap-3 px-2">
            <BettingPanel
              key={bettingPanelKey}
              min={SLOTS_CONFIG.MIN_BET}
              max={SLOTS_CONFIG.MAX_BET}
              balance={balance}
              onCommit={(amount) => {
                send({ type: 'PLACE_BET', bet: amount, betHandleId: '' });
              }}
              callButtons={() => (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleSpinClick}
                    disabled={!inBetting || !hasBet || inSpinning}
                    className="rounded-md bg-casino-red px-6 py-2 font-display text-sm tracking-wider text-white shadow-gold-glow hover:bg-casino-red-deep disabled:opacity-40"
                  >
                    SPIN
                  </button>
                </div>
              )}
            />
          </div>
        }
      >
        {/* Two-column layout. The paytable sits hard against the far-left
            edge of the play area (col 1, auto-width). The reels take up
            the remaining width and centre themselves within it (col 2),
            so they become the visual focal point. Wrapped in `relative`
            so the win-celebration overlay can use `absolute inset-0`. */}
        <div className="relative grid flex-1 grid-cols-[auto_1fr] items-center gap-6 px-4 py-6">
          <div className="self-center">
            <Paytable winningKey={payout?.key ?? null} />
          </div>
          <div className="flex items-center justify-center gap-5">
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
          <WinCelebration
            tier={roundResult?.details.winTier ?? 'none'}
            netChange={roundResult?.netChange ?? 0}
            reducedMotion={reducedMotion}
          />
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
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle, rgba(255,92,242,0.18) 0%, transparent 70%)',
              animation: 'slotsJackpotTint 1500ms ease-out',
            }}
          />
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
            width: 360,
            height: 100,
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
            marginTop: -240,
          }}
        >
          {isJackpot ? `JACKPOT! $${netChange}` : verdict}
        </div>
      )}
    </div>
  );
}
