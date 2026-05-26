import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMachine } from '@xstate/react';
import GameShell from '@/games/_shared/GameShell';
import LobbyButton from '@/games/_shared/LobbyButton';
import OddsInfoBox from '@/games/_shared/OddsInfoBox';
import SlotsRules from './rules';
import BettingPanel from '@/games/_shared/BettingPanel';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance, useWalletStore } from '@/store/walletStore';
import { useRecentRounds } from '@/systems/hooks/useRecentRounds';
import { useSound } from '@/systems/sound/useSound';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import type { RecentResultItem } from '@/games/_shared/RecentResults';
import Paytable from './Paytable';
import ReelView from './ReelView';
import { slotsMachine } from './machine';
import { SLOTS_CONFIG } from './config';
import type { SlotsRoundDetails, WinTier } from './types';
import { SYMBOL_DISPLAY } from './symbols';

/**
 * MASQUER · Slots — Phase 15 #7 rebuild on the Velvet Deco design system.
 *
 * Pure logic (`logic.ts` / `symbols.ts` / `types.ts` / `machine.ts` /
 * `config.ts`) is byte-stable: RNG, weights, paytable, win tiers and
 * reel-stop cadence are all unchanged. ADRs 0032 + 0033 stand as-is
 * (with a small note appended to 0033 for the new `jewel-magenta`
 * token + the sound-stinger wiring).
 *
 * Page-level changes vs. the original v0.6 page:
 *   - MASQUER · Slots title + `LobbyButton` / `OddsInfoBox` per Phase 15
 *     shell conventions (#226 / #230 / #232 / #235).
 *   - Two-column play area: paytable on a 300px left rail, reels in the
 *     wider right column with 110px cells (spec §4.3.2).
 *   - Inline-SVG symbols (spec §4.3.1) replace the CSS-only originals.
 *   - Sticky bet: BettingPanel's new `singleStepCommit +
 *     persistBetAcrossCommit` props mean SPIN both places + plays in
 *     one click, and the chip stack persists across spins until CLEAR
 *     BET (spec §4.8).
 *   - Sound integration: `chip.place` on SPIN, `wheel.spin` entering
 *     spinning, `reel.stop` × 3 at the configured cadence, and the
 *     `win.{small,medium,jackpot}` / `loss` stinger on settle. All gated
 *     on `useEffectiveReducedMotion`.
 *   - Tokens-only Tailwind in the rebuilt surfaces; the WinCelebration
 *     overlay references the `jewel-magenta` brand colour via a CSS var.
 */
export default function SlotsPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const reducedMotion = useEffectiveReducedMotion();
  const { play } = useSound();

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

  const spinResult = state.context.spinResult;
  const roundResult = state.context.roundResult;
  const payout = roundResult?.details.payout ?? null;
  // Winning highlight: roundResult landed and the centre symbol on this
  // reel index is part of the winning line.
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
      // Chip "place" stinger fires on the commit gesture, matching the
      // pattern in Blackjack / Coin-flip / Roulette (single click that
      // both commits the wager + kicks off the round).
      if (!reducedMotion) play('chip.place');
      send({ type: 'PLACE_BET', bet: amount, betHandleId: result.handle.betId });
      send({ type: 'SPIN' });
    },
    [user, placeBet, send, play, reducedMotion],
  );

  // ── Settle bridge: write a single rounds row when a new roundResult lands.
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
      if (reducedMotion) return;
      const tier: WinTier = roundResult.details.winTier;
      if (tier === 'jackpot') play('win.jackpot');
      else if (tier === 'medium') play('win.medium');
      else if (tier === 'small') play('win.small');
      else if (roundResult.netChange < 0) play('loss');
    })();
  }, [user, roundResult, settleRound, play, reducedMotion]);

  // ── Spin-start FX bridge: wheel.spin once when entering spinning;
  //    schedule three reel.stop pings at the configured per-reel cadence.
  useEffect(() => {
    if (!inSpinning) return;
    settledRef.current = null;
    if (reducedMotion) return;
    play('wheel.spin');
    const timers: ReturnType<typeof setTimeout>[] = SLOTS_CONFIG.REEL_STOP_TIMES_MS.map((ms) =>
      setTimeout(() => play('reel.stop'), ms),
    );
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [inSpinning, reducedMotion, play]);

  const rounds = useRecentRounds(user?.id, 'slots', 12);
  const recentItems: RecentResultItem[] = useMemo(
    () =>
      rounds.map((r) => {
        const d = r.details as SlotsRoundDetails;
        const tier = d.winTier;
        const badgeBg =
          tier === 'jackpot'
            ? 'var(--brand-jewel-magenta)'
            : tier === 'medium'
              ? 'var(--brand-gold)'
              : tier === 'small'
                ? 'var(--brand-state-win)'
                : 'var(--brand-state-loss)';
        const badgeText = d.spin.reels.map((s) => SYMBOL_DISPLAY[s].label[0]).join('');
        return {
          key: r.id,
          badgeText,
          badgeColor: badgeBg,
          badgeTextColor: 'var(--brand-felt-table-deep)',
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
      :root {
        --brand-jewel-magenta: #ff5cf2;
        --brand-gold: #e6c068;
        --brand-state-win: #3dd17a;
        --brand-state-loss: #7a1f2b;
        --brand-felt-table-deep: #0e2e21;
      }
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
        title="MASQUER · Slots"
        game="slots"
        lobbyButton={<LobbyButton />}
        oddsInfo={
          <OddsInfoBox>
            3× 7 50:1 · 3× BAR 20:1 · 3× Bell 12:1 · 3× Lemon 8:1 · 3× Cherry 5:1 · 2× Cherry 2:1
          </OddsInfoBox>
        }
        recentItems={recentItems}
        rules={<SlotsRules />}
        bettingPanel={
          <div className="mx-auto flex max-w-[640px] flex-col gap-3 px-2">
            <BettingPanel
              min={SLOTS_CONFIG.MIN_BET}
              max={SLOTS_CONFIG.MAX_BET}
              balance={balance}
              singleStepCommit
              persistBetAcrossCommit
              onCommit={() => {
                // No-op: Slots places + spins in one click via callButtons
                // (see below). singleStepCommit means callButtons receives
                // the live amount, so we don't need the panel's internal
                // committed-state machine. onCommit is still wired for API
                // compatibility (the panel calls it on action click).
              }}
              callButtons={(currentAmount) => {
                const amount = currentAmount ?? 0;
                const canSpin =
                  inBetting && amount >= SLOTS_CONFIG.MIN_BET && amount <= balance && !inSpinning;
                return (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => void handlePlaceAndSpin(amount)}
                      disabled={!canSpin}
                      aria-label="Spin the reels"
                      className={[
                        'min-h-[44px] min-w-[140px] rounded-md border border-brass bg-velvet px-6 py-2.5',
                        'font-display text-sm uppercase tracking-[0.22em] text-ivory shadow-gold-glow',
                        'transition-colors duration-150 hover:bg-velvet-deep disabled:opacity-40',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-felt-table-deep',
                      ].join(' ')}
                    >
                      SPIN
                    </button>
                  </div>
                );
              }}
            />
          </div>
        }
      >
        {/* Two-column play area. Below the md breakpoint the paytable
            stacks on top of the reels; at md+ the paytable is a left
            rail and the reels claim the wider right column (spec
            §4.3.2). `relative` so the WinCelebration overlay can sit
            absolutely over both columns. */}
        <div className="relative flex w-full flex-1 flex-col items-center gap-6 px-4 py-6 md:grid md:grid-cols-[auto_1fr] md:items-center md:gap-8">
          <div className="md:self-center">
            <Paytable winningKey={payout?.key ?? null} />
          </div>
          {/* Reels container — `relative` so the payline indicator lines
              can sit absolutely on top, spanning all three reels (and the
              gaps between them) at the top + bottom edge of the middle
              row. The container's height equals 3 × CELL_SIZE (110 px),
              so top-1/3 = top of middle, top-2/3 = bottom of middle. The
              lines make the payline unmistakable; the user reported the
              top/bottom rows were being mistaken for the winning line. */}
          <div className="relative flex items-center justify-center gap-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-1/3 z-10 h-[2px] bg-brass shadow-[0_0_6px_rgba(212,175,55,0.6)]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-2/3 z-10 h-[2px] bg-brass shadow-[0_0_6px_rgba(212,175,55,0.6)]"
            />
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
  tier: WinTier;
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
      className="pointer-events-none absolute inset-0 z-30 col-span-full flex items-center justify-center"
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
          className="rounded-md border border-brass bg-felt-table-deep px-5 py-2 font-display text-sm uppercase tracking-[0.22em]"
          style={{
            borderColor: isJackpot ? 'var(--brand-jewel-magenta)' : 'var(--brand-gold)',
            color: isJackpot ? 'var(--brand-jewel-magenta)' : 'var(--brand-gold)',
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
