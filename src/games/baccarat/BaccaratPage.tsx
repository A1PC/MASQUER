import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import GameShell from '@/games/_shared/GameShell';
import LobbyButton from '@/games/_shared/LobbyButton';
import OddsInfoBox from '@/games/_shared/OddsInfoBox';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import { useSound } from '@/systems/sound/useSound';
import type { RecentResultItem } from '@/games/_shared/RecentResults';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance, useWalletStore } from '@/store/walletStore';
import { useRecentRounds } from '@/systems/hooks/useRecentRounds';
import { baccaratMachine } from './machine';
import { BET_LIMITS, DEFAULT_CHIP, type ChipDenomination } from './config';
import { computePayouts } from './logic';
import { BET_ZONE_KEYS, type BetZoneKey, type Bets, type Payouts, type RoundResult } from './types';
import HandView from './HandView';
import BetArea from './BetArea';
import ShoeIndicator from './ShoeIndicator';
import Scoreboard from './Scoreboard';
import WinCelebration from './WinCelebration';
import ChipSelector from './ChipSelector';
import BaccaratRules from './rules';

/**
 * MASQUER · Baccarat — Phase 15 #8 re-skin of the Punto Banco table on the
 * Velvet Deco design system.
 *
 * Pure logic (`logic.ts` / `shoe.ts` / `types.ts` / `config.ts` / `machine.ts`)
 * is byte-stable: the canonical Punto Banco third-card tableau (ADR-0036),
 * floor-rounded banker commission (ADR-0036), persistent 8-deck shoe with cut
 * card (ADR-0037), and all 9 bet zones are untouched.
 *
 * Page-level changes vs. the original v0.7 page:
 *   - `MASQUER · Baccarat` title + shared `LobbyButton` / `OddsInfoBox` per
 *     the Phase 15 shell conventions (#226 / #230 / #232 / #235).
 *   - `meta` prop removed — `OddsInfoBox` replaces the right-side caption.
 *   - `ChipSelector` now consumes the shared `ChipDenominationButton` so the
 *     chip palette is byte-identical to Slots / Roulette / Blackjack /
 *     Coin-flip.
 *   - Tokenised felt + brass-frame visuals across the bet area, hand panels,
 *     scoreboard, shoe indicator, and celebration overlay. Scoreboard cells
 *     ride the new `scoreboard-banker / -player / -tie` brand tokens.
 *   - `useSound` integration: `chip.place` on every bet-zone click,
 *     `card.deal` per card reveal, `win.{small,medium,jackpot}` / `loss`
 *     stinger on settle, `wheel.spin` when the cut card triggers a
 *     reshuffle. All gated on `useEffectiveReducedMotion`.
 */

const ANIMATIONS = `
  @keyframes baccaratJackpot { 0% { opacity: 0; } 20% { opacity: 1; } 100% { opacity: 0; } }
  @keyframes baccaratMediumBurst {
    0% { opacity: 0; transform: scale(0.6); }
    40% { opacity: 1; transform: scale(1.1); }
    100% { opacity: 0; transform: scale(1.3); }
  }
  @keyframes baccaratCoinFall {
    0% { transform: translateY(-30px); opacity: 0; }
    20% { opacity: 1; }
    100% { transform: translateY(320px); opacity: 0; }
  }
`;

interface AggregatedSettlement {
  betAmount: number;
  payout: number;
  netChange: number;
  outcome: 'win' | 'loss' | 'push';
}

function aggregate(bets: Bets, payouts: Payouts): AggregatedSettlement {
  let betAmount = 0;
  let payout = 0;
  let netChange = 0;
  for (const zone of BET_ZONE_KEYS) {
    const b = bets[zone];
    if (b === 0) continue;
    const change = payouts[zone];
    betAmount += b;
    netChange += change;
    if (change > 0)
      payout += b + change; // win: stake returned + winnings
    else if (change === 0) payout += b; // push: stake returned
    // change < 0: payout += 0 (stake forfeit)
  }
  const outcome: AggregatedSettlement['outcome'] =
    netChange > 0 ? 'win' : netChange < 0 ? 'loss' : 'push';
  return { betAmount, payout, netChange, outcome };
}

/**
 * Map a settled round to a sound-stinger tier per spec §4.4:
 *   - jackpot — any natural win, OR a Dragon 30:1 hit (margin 9, non-natural).
 *   - medium  — non-jackpot ties, pairs, big dragons, big single-zone wins.
 *   - small   — modest wins (typical player / banker single-zone, big / small).
 *   - loss    — net negative on the round.
 *   - none    — net zero (push) or no winning zones.
 */
type SoundTier = 'jackpot' | 'medium' | 'small' | 'loss' | 'none';

function soundTierFor(result: RoundResult, payouts: Payouts, net: number): SoundTier {
  if (net < 0) return 'loss';
  // Naturals always jackpot per spec.
  if (result.winnerNatural) return 'jackpot';
  // Dragon 30:1 hit → jackpot.
  if (
    result.margin === 9 &&
    !result.winnerNatural &&
    (payouts.playerDragon > 0 || payouts.bankerDragon > 0)
  ) {
    return 'jackpot';
  }
  let bestRank = 0;
  for (const [zone, change] of Object.entries(payouts) as [keyof Payouts, number][]) {
    if (change <= 0) continue;
    const r = zoneSoundRank(zone, result);
    if (r > bestRank) bestRank = r;
  }
  if (bestRank >= 2) return 'medium';
  if (bestRank === 1) return 'small';
  return 'none';
}

function zoneSoundRank(zone: keyof Payouts, result: RoundResult): number {
  if (zone === 'playerDragon' || zone === 'bankerDragon') {
    if (result.margin >= 7) return 2;
    return 1;
  }
  if (zone === 'tie') return 2;
  if (zone === 'playerPair' || zone === 'bankerPair') return 2;
  if (zone === 'player' || zone === 'banker') return 1;
  if (zone === 'big' || zone === 'small') return 1;
  return 0;
}

export default function BaccaratPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const reducedMotion = useEffectiveReducedMotion();
  const { play } = useSound();

  const [state, send] = useMachine(baccaratMachine, { input: { reducedMotion } });
  const [selectedChip, setSelectedChip] = useState<ChipDenomination>(DEFAULT_CHIP);

  const placeBet = useWalletStore((s) => s.placeBet);
  const settleRound = useWalletStore((s) => s.settleRound);

  // Reveal pacing: drive how many cards are visible per side as the machine advances.
  const [playerRevealed, setPlayerRevealed] = useState(0);
  const [bankerRevealed, setBankerRevealed] = useState(0);

  const playerCardCount = state.context.playerCards.length;
  const bankerCardCount = state.context.bankerCards.length;
  const roundCount = state.context.roundCount;

  // Reset revealed counters when machine starts a new round, and drive the
  // staggered reveal of newly-drawn cards. The setState calls here are
  // legitimate UI ↔ machine cross-system sync (the alternative is a custom
  // hook with useReducer that obscures the simple intent). setState inside
  // the setTimeout callbacks below is allowed (external source).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setPlayerRevealed(0);
    setBankerRevealed(0);
  }, [roundCount]);

  useEffect(() => {
    if (reducedMotion) {
      setPlayerRevealed(playerCardCount);
      setBankerRevealed(bankerCardCount);
      return;
    }
    // Reveal one card at a time at ~400ms intervals, interleaving P/B.
    // A `card.deal` stinger fires alongside each card-flip tick so the
    // audio cadence tracks the visual cadence (spec §4.4).
    const ids: number[] = [];
    let step = 0;
    const tick = () => {
      setPlayerRevealed((n) => Math.min(playerCardCount, n + (step % 2 === 0 ? 1 : 0)));
      setBankerRevealed((n) => Math.min(bankerCardCount, n + (step % 2 === 1 ? 1 : 0)));
      step += 1;
      play('card.deal');
    };
    const totalSteps = playerCardCount + bankerCardCount;
    for (let i = 0; i < totalSteps; i++) {
      ids.push(window.setTimeout(tick, 400 * (i + 1)));
    }
    return () => {
      ids.forEach(window.clearTimeout);
    };
  }, [playerCardCount, bankerCardCount, reducedMotion, play]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Wallet bridge — settle once per round when roundResult appears.
  // Uses a single placeBet + single settleRound (one rounds row per round, ADR-0016).
  // Reads betsAtDeal (snapshot taken at DEAL time) because state.context.bets
  // has been mutated by clearLosingBets by the time settling fires.
  const settledRef = useRef<number>(-1);
  const betsAtDeal = state.context.betsAtDeal;
  useEffect(() => {
    if (!user) return;
    const result = state.context.roundResult;
    if (!result) return;
    if (!betsAtDeal) return;
    if (settledRef.current === roundCount) return;
    settledRef.current = roundCount;
    const payouts = computePayouts(betsAtDeal, result);
    const agg = aggregate(betsAtDeal, payouts);
    void persistRound(user.id, betsAtDeal, result, payouts, agg, placeBet, settleRound);
    // Spec §4.4 sound stingers fire alongside the wallet write — `play()`
    // no-ops under user prefs or OS reduced-motion so guarding is optional,
    // but we honour `reducedMotion` here too for consistency with Slots /
    // Roulette.
    if (!reducedMotion) {
      const tier = soundTierFor(result, payouts, agg.netChange);
      if (tier === 'jackpot') play('win.jackpot');
      else if (tier === 'medium') play('win.medium');
      else if (tier === 'small') play('win.small');
      else if (tier === 'loss') play('loss');
    }
  }, [
    state.context.roundResult,
    roundCount,
    betsAtDeal,
    user,
    placeBet,
    settleRound,
    play,
    reducedMotion,
  ]);

  // Spec §4.4 optional `wheel.spin` whoosh when the cut card has been
  // crossed and a reshuffle is queued. Fires once per crossing event.
  const cutCardRef = useRef<boolean>(false);
  useEffect(() => {
    const passed = state.context.shoe.cutCardPassed;
    if (passed && !cutCardRef.current) {
      cutCardRef.current = true;
      if (!reducedMotion) play('wheel.spin');
    } else if (!passed && cutCardRef.current) {
      cutCardRef.current = false;
    }
  }, [state.context.shoe.cutCardPassed, reducedMotion, play]);

  // History for the scoreboard — from the rounds table.
  const rounds = useRecentRounds(user?.id, 'baccarat', 60);
  const history = useMemo(
    () =>
      rounds
        .slice()
        .reverse() // useRecentRounds returns newest-first; scoreboard needs oldest-first
        .map((r) => {
          const d = (r.details ?? {}) as {
            winner?: RoundResult['winner'];
            playerPair?: boolean;
            bankerPair?: boolean;
          };
          return {
            winner: d.winner ?? 'tie',
            playerPair: Boolean(d.playerPair),
            bankerPair: Boolean(d.bankerPair),
          };
        }),
    [rounds],
  );

  // Recent results for GameShell's right-rail (newest-first, matches other games).
  // Badge colours reference the new scoreboard tokens via CSS vars so the
  // pill backgrounds stay byte-identical to the bead-plate / big-road palette.
  const recentItems: RecentResultItem[] = useMemo(
    () =>
      rounds.map((r) => {
        const d = (r.details ?? {}) as { winner?: RoundResult['winner'] };
        const winner = d.winner ?? 'tie';
        const badgeText = winner === 'player' ? 'P' : winner === 'banker' ? 'B' : 'T';
        const badgeColor =
          winner === 'player'
            ? 'var(--brand-scoreboard-player)'
            : winner === 'banker'
              ? 'var(--brand-scoreboard-banker)'
              : 'var(--brand-scoreboard-tie)';
        return {
          key: r.id,
          badgeText,
          badgeColor,
          badgeTextColor: 'var(--brand-ivory)',
          betLabel: String(r.betAmount),
          netChips: r.netChange,
          accent: r.outcome,
        };
      }),
    [rounds],
  );

  const inBetting = state.matches('betting');

  const handleAddChip = useCallback(
    (zone: BetZoneKey) => {
      if (!inBetting) return;
      const limit = BET_LIMITS[zone];
      const current = state.context.bets[zone];
      // Add the selected chip's value, clamped to the zone's max.
      const next = Math.min(limit.max, current + selectedChip);
      const delta = next - current;
      if (delta <= 0) return;
      send({ type: 'PLACE_CHIP', zone, amount: delta });
      // Chip-place stinger per spec §4.4 — fires only when a chip actually
      // lands (i.e. the zone wasn't already at max). `play()` no-ops under
      // user prefs; we still guard on reducedMotion for the per-page contract.
      if (!reducedMotion) play('chip.place');
    },
    [inBetting, send, state.context.bets, selectedChip, play, reducedMotion],
  );

  const handleClearZone = useCallback(
    (zone: BetZoneKey) => {
      if (!inBetting) return;
      send({ type: 'CLEAR_ZONE', zone });
    },
    [inBetting, send],
  );

  const handleDeal = useCallback(() => {
    if (!inBetting) return;
    const sum = Object.values(state.context.bets).reduce((s, n) => s + n, 0);
    if (sum === 0) return;
    if (sum > balance) return;
    send({ type: 'DEAL' });
  }, [inBetting, send, state.context.bets, balance]);

  const payouts = useMemo(
    () =>
      state.context.roundResult
        ? computePayouts(state.context.bets, state.context.roundResult)
        : null,
    [state.context.bets, state.context.roundResult],
  );

  if (!user) return null;

  const totalBet = Object.values(state.context.bets).reduce((s, n) => s + n, 0);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
      :root {
        --brand-scoreboard-banker: #a3122a;
        --brand-scoreboard-player: #1e3a8a;
        --brand-scoreboard-tie: #3dd17a;
        --brand-ivory: #f2e7cc;
      }
      ${ANIMATIONS}
    `,
        }}
      />
      <GameShell
        title="MASQUER · Baccarat"
        game="baccarat"
        lobbyButton={<LobbyButton />}
        oddsInfo={
          <OddsInfoBox>
            Player 1:1 · Banker 1:1 (−5%) · Tie 8:1 · Pairs 11:1 · Big 0.54:1 · Small 1.5:1 ·
            Dragons up to 30:1
          </OddsInfoBox>
        }
        recentItems={recentItems}
        rules={<BaccaratRules />}
        bettingPanel={
          <div className="mx-auto flex max-w-[900px] flex-col gap-2 px-2">
            <div className="flex items-center justify-between gap-3">
              <ShoeIndicator
                shoe={state.context.shoe}
                freshShoeBanner={state.context.freshShoeBanner}
              />
              <div className="text-xs text-ivory/70">
                Bet: <span className="font-display text-gold-bright">{totalBet}</span> · Balance:{' '}
                <span className="font-mono text-ivory/90">{balance.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <ChipSelector value={selectedChip} onChange={setSelectedChip} disabled={!inBetting} />
              <button
                type="button"
                onClick={handleDeal}
                disabled={!inBetting || totalBet === 0 || totalBet > balance}
                aria-label="Deal the round"
                className={[
                  'min-h-[44px] min-w-[120px] rounded-md border border-brass bg-velvet px-6 py-2.5',
                  'font-display text-sm uppercase tracking-[0.22em] text-ivory shadow-gold-glow',
                  'transition-colors duration-150 hover:bg-velvet-deep disabled:opacity-40',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-felt-table-deep',
                ].join(' ')}
              >
                DEAL
              </button>
            </div>
          </div>
        }
      >
        <div className="relative grid flex-1 grid-cols-[1fr_240px] gap-6 px-4 py-6">
          <div className="flex flex-col gap-6">
            <div className="flex justify-around gap-6">
              <HandView
                label="PLAYER"
                cards={state.context.playerCards}
                revealedCount={playerRevealed}
                highlight={state.context.roundResult?.winner === 'player'}
              />
              <HandView
                label="BANKER"
                cards={state.context.bankerCards}
                revealedCount={bankerRevealed}
                highlight={state.context.roundResult?.winner === 'banker'}
              />
            </div>
            <BetArea
              bets={state.context.bets}
              disabled={!inBetting}
              onAddChip={handleAddChip}
              onClearZone={handleClearZone}
            />
          </div>
          <Scoreboard history={history} />
          <WinCelebration
            result={state.context.roundResult}
            payouts={payouts}
            reducedMotion={reducedMotion}
          />
        </div>
      </GameShell>
    </>
  );
}

async function persistRound(
  userId: string,
  bets: Bets,
  result: RoundResult,
  payouts: Payouts,
  agg: AggregatedSettlement,
  placeBet: ReturnType<typeof useWalletStore.getState>['placeBet'],
  settleRound: ReturnType<typeof useWalletStore.getState>['settleRound'],
): Promise<void> {
  if (agg.betAmount === 0) return;
  const placed = await placeBet({
    userId,
    game: 'baccarat',
    amount: agg.betAmount,
    min: 1,
    max: 99_999,
  });
  if (!placed.ok) {
    console.warn('Baccarat persistRound: placeBet failed', placed.error);
    return;
  }
  // Build the per-zone snapshot for details.
  const zoneSnapshot: Record<string, { bet: number; change: number }> = {};
  for (const zone of BET_ZONE_KEYS) {
    if (bets[zone] > 0) {
      zoneSnapshot[zone] = { bet: bets[zone], change: payouts[zone] };
    }
  }
  await settleRound({
    handle: placed.handle,
    result: {
      outcome: agg.outcome,
      betAmount: agg.betAmount,
      payout: agg.payout,
      netChange: agg.netChange,
      details: {
        winner: result.winner,
        margin: result.margin,
        playerCards: result.player.cards,
        bankerCards: result.banker.cards,
        playerTotal: result.player.total,
        bankerTotal: result.banker.total,
        playerPair: result.playerPair,
        bankerPair: result.bankerPair,
        winnerNatural: result.winnerNatural,
        bothNatural: result.bothNatural,
        totalCards: result.totalCards,
        zones: zoneSnapshot,
      },
    },
  });
}
