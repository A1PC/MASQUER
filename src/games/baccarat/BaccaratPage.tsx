import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { useReducedMotion } from 'framer-motion';
import GameShell from '@/games/_shared/GameShell';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance, useWalletStore } from '@/store/walletStore';
import { useRecentRounds } from '@/systems/hooks/useRecentRounds';
import { baccaratMachine } from './machine';
import { BET_LIMITS } from './config';
import { computePayouts } from './logic';
import { BET_ZONE_KEYS, type BetZoneKey, type Bets, type Payouts, type RoundResult } from './types';
import HandView from './HandView';
import BetArea from './BetArea';
import ShoeIndicator from './ShoeIndicator';
import Scoreboard from './Scoreboard';
import WinCelebration from './WinCelebration';

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

// Default chip increment when clicking a zone. UI chip-denom selector can replace this later.
const CHIP_INCREMENT = 5;

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

export default function BaccaratPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const reducedMotion = useReducedMotion() ?? false;

  const [state, send] = useMachine(baccaratMachine, { input: { reducedMotion } });

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
    const ids: number[] = [];
    let step = 0;
    const tick = () => {
      setPlayerRevealed((n) => Math.min(playerCardCount, n + (step % 2 === 0 ? 1 : 0)));
      setBankerRevealed((n) => Math.min(bankerCardCount, n + (step % 2 === 1 ? 1 : 0)));
      step += 1;
    };
    const totalSteps = playerCardCount + bankerCardCount;
    for (let i = 0; i < totalSteps; i++) {
      ids.push(window.setTimeout(tick, 400 * (i + 1)));
    }
    return () => {
      ids.forEach(window.clearTimeout);
    };
  }, [playerCardCount, bankerCardCount, reducedMotion]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Wallet bridge — settle once per round when roundResult appears.
  // Uses a single placeBet + single settleRound (one rounds row per round, ADR-0016).
  const settledRef = useRef<number>(-1);
  useEffect(() => {
    if (!user) return;
    const result = state.context.roundResult;
    if (!result) return;
    if (settledRef.current === roundCount) return;
    settledRef.current = roundCount;
    const bets = state.context.bets;
    const payouts = computePayouts(bets, result);
    const agg = aggregate(bets, payouts);
    void persistRound(user.id, bets, result, payouts, agg, placeBet, settleRound);
  }, [state.context.roundResult, roundCount, state.context.bets, user, placeBet, settleRound]);

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

  const inBetting = state.matches('betting');

  const handleAddChip = useCallback(
    (zone: BetZoneKey) => {
      if (!inBetting) return;
      const limit = BET_LIMITS[zone];
      const current = state.context.bets[zone];
      const next = Math.min(limit.max, current === 0 ? limit.min : current + CHIP_INCREMENT);
      const delta = next - current;
      if (delta <= 0) return;
      send({ type: 'PLACE_CHIP', zone, amount: delta });
    },
    [inBetting, send, state.context.bets],
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
      <style dangerouslySetInnerHTML={{ __html: ANIMATIONS }} />
      <GameShell
        title="🎴 BACCARAT"
        meta="8-deck shoe · 9 zones"
        game="baccarat"
        bettingPanel={
          <div className="mx-auto flex max-w-[800px] items-center justify-between gap-3 px-2">
            <ShoeIndicator
              shoe={state.context.shoe}
              freshShoeBanner={state.context.freshShoeBanner}
            />
            <div className="text-xs text-white/60">
              Bet: <span className="font-display text-gold">{totalBet}</span>
            </div>
            <button
              type="button"
              onClick={handleDeal}
              disabled={!inBetting || totalBet === 0 || totalBet > balance}
              className="rounded bg-gold px-6 py-2 font-display text-sm tracking-wider text-felt-deep hover:bg-gold-bright disabled:opacity-40"
            >
              DEAL
            </button>
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
    // Caller checked sum vs balance before DEAL, so this should be unreachable.
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
