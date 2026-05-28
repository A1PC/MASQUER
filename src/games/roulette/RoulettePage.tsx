import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import GameShell from '@/games/_shared/GameShell';
import LobbyButton from '@/games/_shared/LobbyButton';
import OddsInfoBox from '@/games/_shared/OddsInfoBox';
import RouletteRules from './rules';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance, useWalletStore } from '@/store/walletStore';
import { useRecentRounds } from '@/systems/hooks/useRecentRounds';
import { useSound } from '@/systems/sound/useSound';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import { formatChips } from '@/lib/formatChips';
import type { RecentResultItem } from '@/games/_shared/RecentResults';
import BettingLayout from './BettingLayout';
import ChipSelector from './ChipSelector';
import WheelView from './WheelView';
import ResultBanner from './ResultBanner';
import { rouletteMachine } from './machine';
import { ROULETTE_CONFIG, type ChipDenomination } from './config';
import type { RouletteRoundDetails } from './types';

// Pocket-colour CSS vars are declared on :root by the <style> block below
// so the recent-items badges, WheelView's POCKET_FILL, and BettingLayout's
// CELL_FILLS all reference one source of truth. Same pattern as Slots'
// `--brand-jewel-magenta`, Baccarat's `--brand-scoreboard-*`, and Coin-flip's
// `--brand-coin-*` — a future brand retune touches one block.
const POCKET_RED_VAR = 'var(--brand-roulette-red)';
const POCKET_BLACK_VAR = 'var(--brand-roulette-black)';
const POCKET_GREEN_VAR = 'var(--brand-roulette-green)';
const POCKET_BADGE_INK_VAR = 'var(--brand-felt-table-deep)';
const TIMER_RING_SIZE = 56;
const TIMER_RING_STROKE = 4;
const TIMER_RING_RADIUS = (TIMER_RING_SIZE - TIMER_RING_STROKE) / 2;
const TIMER_RING_CIRC = 2 * Math.PI * TIMER_RING_RADIUS;

/**
 * Phase 15 #6 — MASQUER / Velvet Deco rebuild of the European-roulette table.
 *
 * Adds the auto-spin betting windows (ADR-0046), the unlimited-positions /
 * 1000-max chip rules (ADR-0030 amendment), and the ball-centre fix
 * (ADR-0031 amendment). Pure game logic (`logic.ts` / `bets.ts` / `wheel.ts`)
 * is byte-stable.
 *
 * Round lifecycle:
 *   placing_bets (30 s) ─SPIN_NOW/timer─► spinning ─after spin─► settled ─after 1.5 s─►
 *   between_rounds (10 s) ─SPIN_NOW/timer─► spinning ...
 *
 * Wallet bridge: on entry to `spinning` we deferred-place each on-felt bet
 * via `wallet.placeBet` (refund pattern on partial failure). The settle
 * bridge on entry to `settled` calls `wallet.settleRound` exactly once per
 * spin when there are staked bets. A zero-bet auto-spin runs cosmetically
 * and calls `wallet.recordSpinOnly` to write a single zero-stake
 * (`betAmount: 0`, `payout: 0`, `netChange: 0`, `outcome: 'push'`)
 * `rounds` row so every spin appears in the recent-results feed
 * (ADR-0046 amendment 2026-05-25; refines ADR-0016).
 */
export default function RoulettePage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const reduce = useEffectiveReducedMotion();
  const { play } = useSound();

  const [chip, setChip] = useState<ChipDenomination>(5);

  const [state, send] = useMachine(rouletteMachine, {
    input: { spinDurationMs: reduce ? 0 : ROULETTE_CONFIG.SPIN_DURATION_MS },
  });

  const placeBet = useWalletStore((s) => s.placeBet);
  const settleRound = useWalletStore((s) => s.settleRound);
  const recordSpinOnly = useWalletStore((s) => s.recordSpinOnly);

  // Map of bet-position key → wallet bet-handle id for the current spin.
  const handlesRef = useRef<Map<string, string>>(new Map());
  // Promise that resolves once the current spin's placeBet calls have all
  // finished (success or failure). The settle bridge awaits this before
  // calling settleRound so wallet handles are always present in handlesRef
  // by the time settle fires, even when the spin animation is short
  // (reduced-motion → spinDurationMs = 0).
  const placingPromiseRef = useRef<Promise<void> | null>(null);
  const placedSpinRef = useRef<symbol | null>(null);
  const settledRef = useRef<string | null>(null);

  const inPlacingBets = state.matches('placing_bets');
  const inSpinning = state.matches('spinning');
  const inSettled = state.matches('settled');
  const inBetweenRounds = state.matches('between_rounds');
  const canPlace = inPlacingBets || inBetweenRounds;
  const targetNumber = state.context.spinResult?.number ?? null;
  const betWindowEndsAt = state.context.betWindowEndsAt;
  const hasBets = state.context.bets.length > 0;

  // ─── Place-bet bridge: on entry to `spinning`, deferred-place every bet ──
  useEffect(() => {
    if (!inSpinning || !user) return;
    if (placingPromiseRef.current !== null) return;
    const bets = state.context.bets;
    play('wheel.spin');
    if (bets.length === 0) {
      // Zero-bet auto-spin — nothing to record (ADR-0046 zero-bet path).
      placingPromiseRef.current = Promise.resolve();
      return;
    }
    const spinTag = Symbol('spin');
    placedSpinRef.current = spinTag;
    placingPromiseRef.current = (async () => {
      const newHandles: [string, string][] = [];
      let ok = true;
      for (const bet of bets) {
        const result = await placeBet({
          userId: user.id,
          game: 'roulette',
          amount: bet.amount,
          min: ROULETTE_CONFIG.MIN_BET,
          max: ROULETTE_CONFIG.MAX_BET,
        });
        if (!result.ok) {
          ok = false;
          for (const [k, hId] of newHandles) {
            const amount = bets.find((b) => b.key === k)!.amount;
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
          if (import.meta.env.DEV) {
            console.warn('Roulette spin: placeBet failed', result.error);
          }
          break;
        }
        newHandles.push([bet.key, result.handle.betId]);
      }
      if (ok && placedSpinRef.current === spinTag) {
        for (const [k, h] of newHandles) handlesRef.current.set(k, h);
      }
    })();
  }, [inSpinning, user, state.context.bets, placeBet, settleRound, play]);

  // ─── Settle bridge: on entry to `settled`, settle once ─────────────────
  useEffect(() => {
    if (!inSettled || !user) return;
    play('ball.drop');
    const spinResult = state.context.spinResult;
    const rr = state.context.roundResult;
    const firstKey = state.context.bets[0]?.key;

    // ── Zero-bet auto-spin: write a single zero-stake rounds row so the
    //    spin appears in the recent-results feed (ADR-0046 amendment,
    //    refines ADR-0016). Use the spin number+payload as the dedupe tag.
    if (!firstKey) {
      if (!spinResult) return;
      const settleTag = `spin-only-${spinResult.number}-${spinResult.pocketIndex}`;
      if (settledRef.current === settleTag) return;
      settledRef.current = settleTag;
      const details: RouletteRoundDetails = { spin: spinResult, bets: [] };
      void recordSpinOnly({
        userId: user.id,
        game: 'roulette',
        details,
      });
      return;
    }

    if (!rr) return;
    const settleTag = `${firstKey}-${rr.betAmount}-${rr.payout}`;
    if (settledRef.current === settleTag) return;
    settledRef.current = settleTag;
    void (async () => {
      // Wait for the place-bet bridge to finish populating handlesRef before
      // we settle. Required for the reduced-motion / zero-spinDuration path
      // where `settled` is reached before the async placements resolve.
      const placing = placingPromiseRef.current;
      if (placing) await placing;
      const firstHandleId = handlesRef.current.get(firstKey);
      if (!firstHandleId) return; // place-bet aborted (insufficient chips).
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
      if (rr.outcome === 'win') {
        const isBig = rr.payout >= rr.betAmount * 35;
        play(isBig ? 'win.medium' : 'win.small');
      } else if (rr.outcome === 'loss') {
        play('loss');
      }
    })();
  }, [
    inSettled,
    user,
    state.context.roundResult,
    state.context.bets,
    state.context.spinResult,
    settleRound,
    recordSpinOnly,
    play,
  ]);

  // Clear settled-ref when leaving `settled` so the next round can settle.
  useEffect(() => {
    if (!inSettled) settledRef.current = null;
  }, [inSettled]);

  // Clear handles when re-entering placing_bets / between_rounds with no spin result.
  useEffect(() => {
    if ((inPlacingBets || inBetweenRounds) && state.context.spinResult === null) {
      handlesRef.current.clear();
      placingPromiseRef.current = null;
      placedSpinRef.current = null;
    }
  }, [inPlacingBets, inBetweenRounds, state.context.spinResult]);

  // ─── Timer countdown — re-renders every 100ms while a window is armed ──
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (betWindowEndsAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [betWindowEndsAt]);

  const windowMs = inPlacingBets
    ? ROULETTE_CONFIG.INITIAL_BET_WINDOW_MS
    : ROULETTE_CONFIG.BETWEEN_ROUNDS_MS;
  const remainingMs = betWindowEndsAt !== null ? Math.max(0, betWindowEndsAt - now) : 0;
  const remainingSec = Math.ceil(remainingMs / 1000);
  const progress = betWindowEndsAt !== null ? Math.max(0, Math.min(1, remainingMs / windowMs)) : 0;
  const dashoffset = TIMER_RING_CIRC * (1 - progress);

  // ─── Rules modal pause / resume ────────────────────────────────────────
  const handleRulesOpenChange = useCallback(
    (open: boolean) => {
      send(open ? { type: 'PAUSE_TIMER' } : { type: 'RESUME_TIMER' });
    },
    [send],
  );

  // ─── SPIN NOW handler ──────────────────────────────────────────────────
  const handleSpinNow = useCallback(() => {
    if (!canPlace) return;
    send({ type: 'SPIN_NOW' });
  }, [canPlace, send]);

  const handlePlaceBet = useCallback(
    (
      bet: Parameters<typeof BettingLayout>[0]['onPlaceBet'] extends (b: infer B) => void
        ? B
        : never,
    ) => {
      send({ type: 'PLACE_BET', bet: { ...bet, betHandleId: '' } });
      play('chip.place');
    },
    [send, play],
  );

  // ─── Recent rounds ─────────────────────────────────────────────────────
  const rounds = useRecentRounds(user?.id, 'roulette', 12);
  const recentItems: RecentResultItem[] = useMemo(
    () =>
      rounds.map((r) => {
        const d = r.details as RouletteRoundDetails;
        const color = d.spin?.color ?? 'green';
        const badgeBg =
          color === 'red'
            ? POCKET_RED_VAR
            : color === 'black'
              ? POCKET_BLACK_VAR
              : POCKET_GREEN_VAR;
        return {
          key: r.id,
          badgeText: String(d.spin?.number ?? '?'),
          badgeColor: badgeBg,
          badgeTextColor: color === 'black' ? '#fff' : POCKET_BADGE_INK_VAR,
          betLabel: String(r.betAmount),
          netChips: r.netChange,
          accent: r.outcome,
        };
      }),
    [rounds],
  );

  if (!user) return null;

  // Live-region announcement: round to nearest 5 seconds to keep SR users sane.
  const announceSec = Math.max(0, Math.round(remainingSec / 5) * 5);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
      :root {
        --brand-roulette-red: #a3122a;
        --brand-roulette-black: #1a1a1a;
        --brand-roulette-green: #3dd17a;
        --brand-felt-table-deep: #0e2e21;
      }
    `,
        }}
      />
      <GameShell
        title="MASQUER · Roulette"
        game="roulette"
        lobbyButton={<LobbyButton />}
        oddsInfo={
          <OddsInfoBox>
            Straight 35:1 · Split 17:1 · Street 11:1 · Corner 8:1 · Six-line 5:1 · Column 2:1 ·
            Dozen 2:1 · Red/Black/Odd/Even/Low/High 1:1
          </OddsInfoBox>
        }
        recentItems={recentItems}
        rules={<RouletteRules />}
        onRulesOpenChange={handleRulesOpenChange}
        bettingPanel={
          <div className="mx-auto flex max-w-[760px] flex-col gap-3 px-2">
            <ResultBanner
              visible={inSettled}
              spin={state.context.spinResult}
              netChange={state.context.roundResult?.netChange ?? 0}
            />
            <BettingLayout
              bets={state.context.bets}
              disabled={!canPlace}
              chipAmount={chip}
              onPlaceBet={handlePlaceBet}
              onRemoveBet={(key) => send({ type: 'REMOVE_BET', key })}
              onClearAll={() => send({ type: 'CLEAR_ALL' })}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ChipSelector value={chip} onChange={setChip} disabled={!canPlace} />
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-ivory/60">
                  Balance: <span className="font-mono text-ivory/90">{formatChips(balance)}</span>
                </span>
                <CountdownRing
                  visible={canPlace && betWindowEndsAt !== null}
                  reduce={reduce}
                  progress={progress}
                  dashoffset={dashoffset}
                  remainingSec={remainingSec}
                  announceSec={announceSec}
                />
                {/* TODO(#15-followup): extract <GameActionButton> primitive shared with
                  Slots' SPIN and Baccarat's DEAL buttons (same min-h-[44px] /
                  brass-on-velvet pattern). Deferred per Phase 15 #15 spec §5.3
                  — no new shared components in the cold-look polish pass. */}
                <button
                  type="button"
                  aria-label={hasBets ? 'Spin the wheel now' : 'Spin the wheel now without bets'}
                  data-spin-now={canPlace ? 'true' : 'false'}
                  onClick={handleSpinNow}
                  disabled={!canPlace}
                  className={[
                    'min-h-[44px] rounded-md border border-brass bg-velvet px-5 py-2.5',
                    'font-display text-sm uppercase tracking-[0.18em] text-ivory shadow-gold-glow',
                    'transition-colors duration-150 hover:bg-velvet-deep disabled:opacity-40',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-felt-table-deep',
                  ].join(' ')}
                >
                  SPIN NOW
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
            durationMs={reduce ? 0 : ROULETTE_CONFIG.SPIN_DURATION_MS}
            reducedMotion={reduce}
          />
        </div>
      </GameShell>
    </>
  );
}

interface CountdownRingProps {
  visible: boolean;
  reduce: boolean;
  progress: number;
  dashoffset: number;
  remainingSec: number;
  announceSec: number;
}

function CountdownRing({
  visible,
  reduce,
  progress,
  dashoffset,
  remainingSec,
  announceSec,
}: CountdownRingProps): JSX.Element | null {
  if (!visible) return null;
  // Reduced-motion: collapse to a static label, no ring.
  if (reduce) {
    return (
      <div
        data-countdown
        data-reduced-motion="true"
        className="font-display text-xs uppercase tracking-[0.18em] text-gold-bright"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span aria-hidden>Auto-spin in {remainingSec}s</span>
        <span className="sr-only">Spin in {announceSec} seconds</span>
      </div>
    );
  }
  return (
    <div
      data-countdown
      data-reduced-motion="false"
      className="relative grid place-items-center"
      style={{ width: TIMER_RING_SIZE, height: TIMER_RING_SIZE }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <svg
        width={TIMER_RING_SIZE}
        height={TIMER_RING_SIZE}
        viewBox={`0 0 ${TIMER_RING_SIZE} ${TIMER_RING_SIZE}`}
        className="absolute inset-0 -rotate-90"
        aria-hidden
      >
        <circle
          cx={TIMER_RING_SIZE / 2}
          cy={TIMER_RING_SIZE / 2}
          r={TIMER_RING_RADIUS}
          fill="none"
          className="stroke-brass/20"
          strokeWidth={TIMER_RING_STROKE}
        />
        <circle
          data-countdown-progress
          data-progress={progress.toFixed(3)}
          cx={TIMER_RING_SIZE / 2}
          cy={TIMER_RING_SIZE / 2}
          r={TIMER_RING_RADIUS}
          fill="none"
          stroke="currentColor"
          className="text-gold-bright"
          strokeWidth={TIMER_RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={TIMER_RING_CIRC}
          strokeDashoffset={dashoffset}
        />
      </svg>
      <span className="font-mono text-[12px] font-bold text-gold-bright" aria-hidden>
        {remainingSec}s
      </span>
      <span className="sr-only">Auto-spin in {announceSec} seconds</span>
    </div>
  );
}
