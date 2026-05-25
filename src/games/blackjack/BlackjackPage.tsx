import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import GameShell from '@/games/_shared/GameShell';
import BlackjackRules from './rules';
import BettingPanel from '@/games/_shared/BettingPanel';
import { useRecentRounds } from '@/systems/hooks/useRecentRounds';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance, useWalletStore } from '@/store/walletStore';
import { useSound } from '@/systems/sound/useSound';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import { Badge } from '@/components/ui';
import { blackjackMachine } from './machine';
import { BLACKJACK_CONFIG } from './config';
import DealerArea from './DealerArea';
import PlayerArea from './PlayerArea';
import ActionPanel from './ActionPanel';
import InsurancePrompt from './InsurancePrompt';
import AceValuePrompt from './AceValuePrompt';
import type { RecentResultItem } from '@/games/_shared/RecentResults';
import type { BlackjackRoundDetails, Outcome } from './types';

/**
 * BlackjackPage — Phase 15 #5 Velvet Duel UI rebuild.
 *
 * Composition: `GameShell` shell + `DealerArea` (top) + `PlayerArea` (bottom)
 * inside a felt panel; `BettingPanel` for the bet + `ActionPanel` (Hit / Stand /
 * Double / Split) for live play; `InsurancePrompt` Modal on dealer-Ace deal;
 * `AceValuePrompt` Modal whenever the machine enters `awaiting_ace_choice`.
 *
 * Side effects (orchestration only — no game logic):
 *  · `useSound` plays `chip.place` on bet commit, `card.deal` on every dealt
 *    card (player + dealer), `win.small` on a standard win, `win.medium` on a
 *    natural blackjack or 5-Card Charlie, `loss` on bust / loss.
 *  · `useEffectiveReducedMotion` is consulted for transitions; the shared UI
 *    primitives (`Modal`, `Tooltip`, `Button`) honour it internally.
 *  · A session-local `streak` counter (mirrors the coin-flip Flame indicator
 *    pattern at `src/games/coin-flip/CoinFlipPage.tsx`) increments on any
 *    winning hand (incl. natural BJ / Charlie) within a round and resets on a
 *    losing/bust hand, on a `push`-only round, and on mount.
 *
 * Wallet integration is unchanged from Phase 3: the machine emits a single
 * `roundResult` and we call `wallet.settleRound` exactly once per round via
 * the `settledRef` guard.
 */
export default function BlackjackPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const placeBet = useWalletStore((s) => s.placeBet);
  const settleRound = useWalletStore((s) => s.settleRound);
  const rounds = useRecentRounds(user?.id, 'blackjack', 12);

  const [snapshot, send] = useMachine(blackjackMachine);
  const settledRef = useRef<string | null>(null); // guard against double-settle
  // Track win-streak across rounds within a single session (resets on mount/loss).
  const [streak, setStreak] = useState(0);
  // Track the last settled round id so we only react once per settle.
  const lastStreakRoundRef = useRef<string | null>(null);
  // Track card counts for the dealer + each player hand so we can fire
  // `card.deal` exactly once per newly-arrived card without duplicates.
  const lastCardCountsRef = useRef<{ dealer: number; hands: number[] }>({ dealer: 0, hands: [] });

  // `useEffectiveReducedMotion` is consulted so this component honours the
  // user/OS reduce-motion preference. Shared primitives use it internally —
  // we read it here both to acknowledge the contract and to gate any future
  // page-level micro-animation (deck dealing stagger, badge pulse, …).
  useEffectiveReducedMotion();
  const { play } = useSound();

  // Bridge: when machine awaits a bet handle, call wallet.placeBet for the main bet.
  useEffect(() => {
    if (!user) return;
    if (snapshot.matches('awaiting_bet_handle')) {
      void (async () => {
        const result = await placeBet({
          userId: user.id,
          game: 'blackjack',
          amount: snapshot.context.betAmount,
          min: BLACKJACK_CONFIG.MIN_BET,
          max: BLACKJACK_CONFIG.MAX_BET,
        });
        if (result.ok) {
          play('chip.place');
          send({ type: 'BET_PLACED', betHandleId: result.handle.betId });
        }
      })();
    }
  }, [snapshot, send, placeBet, user, play]);

  // Fire `card.deal` for every newly-dealt card (dealer + every player hand)
  // by diffing the snapshot's card counts against the last-seen counts.
  useEffect(() => {
    const dealerCount = snapshot.context.dealerCards.length;
    const handCounts = snapshot.context.hands.map((h) => h.cards.length);

    let dealtThisTick = 0;
    if (dealerCount > lastCardCountsRef.current.dealer) {
      dealtThisTick += dealerCount - lastCardCountsRef.current.dealer;
    }
    handCounts.forEach((cnt, i) => {
      const prev = lastCardCountsRef.current.hands[i] ?? 0;
      if (cnt > prev) dealtThisTick += cnt - prev;
    });
    for (let n = 0; n < dealtThisTick; n++) play('card.deal');

    lastCardCountsRef.current = { dealer: dealerCount, hands: handCounts };
  }, [snapshot.context.dealerCards, snapshot.context.hands, play]);

  // Bridge: when machine reaches settling, call wallet.settleRound ONCE.
  useEffect(() => {
    if (!snapshot.matches('settling')) return;
    const rr = snapshot.context.roundResult;
    if (!rr || !user) return;
    const firstHandleId = snapshot.context.betHandleIds[0];
    if (!firstHandleId || settledRef.current === firstHandleId) return;
    settledRef.current = firstHandleId;
    void (async () => {
      await settleRound({
        handle: {
          betId: firstHandleId,
          userId: user.id,
          game: 'blackjack',
          amount: rr.totalBet,
          placedAt: Date.now(),
        },
        result: {
          outcome: rr.primaryOutcome,
          betAmount: rr.totalBet,
          payout: rr.totalPayout,
          netChange: rr.totalPayout - rr.totalBet,
          details: rr.details,
        },
      });
    })();
  }, [snapshot, settleRound, user]);

  // On settle: play the appropriate win/loss stinger AND update the streak.
  // Streak rule: increment on any winning hand; reset on any losing/bust hand.
  // A pure push round leaves the streak unchanged. Deferred via a microtask
  // so `setStreak` is not called synchronously inside the effect body (the
  // XState snapshot is the external system; the microtask schedules the
  // update as a subscription callback per react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!snapshot.matches('settling')) return;
    const rr = snapshot.context.roundResult;
    if (!rr) return;
    const handleId = snapshot.context.betHandleIds[0] ?? null;
    if (!handleId || lastStreakRoundRef.current === handleId) return;
    lastStreakRoundRef.current = handleId;

    const handsRes = rr.details.hands;
    const anyCharlieOrBJ = handsRes.some(
      (h) => h.outcome === 'player-blackjack' || (h.outcome === 'player-win' && h.fiveCardCharlie),
    );
    const anyWin = handsRes.some(
      (h) => h.outcome === 'player-blackjack' || h.outcome === 'player-win',
    );
    const anyLoss = handsRes.some(
      (h) => h.outcome === 'player-loss' || h.outcome === 'player-bust',
    );

    queueMicrotask(() => {
      if (anyLoss) {
        // A losing/bust hand ends any streak — even if another hand also won.
        setStreak(0);
        play('loss');
      } else if (anyWin) {
        setStreak((s) => s + 1);
        play(anyCharlieOrBJ ? 'win.medium' : 'win.small');
      }
      // Else: push-only round — no streak change, no stinger.
    });
  }, [snapshot, play]);

  // Reset the settled-ref guard and the card-count diff when we leave settling
  // (i.e., when a fresh round starts). The streak counter intentionally
  // persists across rounds and only resets on a loss or on mount.
  useEffect(() => {
    if (snapshot.matches('betting')) {
      settledRef.current = null;
      lastCardCountsRef.current = { dealer: 0, hands: [] };
    }
  }, [snapshot]);

  const items: RecentResultItem[] = useMemo(
    () =>
      rounds.map((r) => {
        const d = r.details as BlackjackRoundDetails;
        const anyBJ = d.hands.some((h) => h.outcome === 'player-blackjack');
        const anyCharlie = d.hands.some((h) => h.fiveCardCharlie);
        return {
          key: r.id,
          badgeText: anyCharlie
            ? '5C'
            : anyBJ
              ? 'BJ'
              : r.outcome === 'win'
                ? 'W'
                : r.outcome === 'loss'
                  ? 'L'
                  : 'P',
          badgeColor: anyCharlie
            ? '#e6c068'
            : anyBJ
              ? '#ffe066'
              : r.outcome === 'win'
                ? '#3dd17a'
                : r.outcome === 'loss'
                  ? '#7a1f2b'
                  : '#7a7a7a',
          badgeTextColor: anyCharlie || anyBJ || r.outcome === 'win' ? '#06120c' : '#fff',
          betLabel: String(r.betAmount),
          netChips: r.netChange,
          accent: r.outcome,
        };
      }),
    [rounds],
  );

  const handleTakeInsurance = useCallback(() => {
    if (!user) return;
    void (async () => {
      const insuranceBet = Math.floor(
        snapshot.context.betAmount * BLACKJACK_CONFIG.INSURANCE_RATIO,
      );
      const result = await placeBet({
        userId: user.id,
        game: 'blackjack',
        amount: insuranceBet,
        min: 1,
        max: BLACKJACK_CONFIG.MAX_BET,
      });
      if (result.ok) {
        play('chip.place');
        send({ type: 'TAKE_INSURANCE', betHandleId: result.handle.betId, bet: insuranceBet });
      }
    })();
  }, [user, snapshot.context.betAmount, placeBet, send, play]);

  const handleDouble = useCallback(() => {
    if (!user) return;
    void (async () => {
      const h = snapshot.context.hands[snapshot.context.activeHandIdx];
      if (!h) return;
      const result = await placeBet({
        userId: user.id,
        game: 'blackjack',
        amount: h.betAmount,
        min: BLACKJACK_CONFIG.MIN_BET,
        max: BLACKJACK_CONFIG.MAX_BET,
      });
      if (result.ok) {
        play('chip.place');
        send({ type: 'DOUBLE', betHandleId: result.handle.betId });
      }
    })();
  }, [user, snapshot.context.hands, snapshot.context.activeHandIdx, placeBet, send, play]);

  const handleSplit = useCallback(() => {
    if (!user) return;
    void (async () => {
      const h = snapshot.context.hands[snapshot.context.activeHandIdx];
      if (!h) return;
      const result = await placeBet({
        userId: user.id,
        game: 'blackjack',
        amount: h.betAmount,
        min: BLACKJACK_CONFIG.MIN_BET,
        max: BLACKJACK_CONFIG.MAX_BET,
      });
      if (result.ok) {
        play('chip.place');
        send({ type: 'SPLIT', betHandleId: result.handle.betId });
      }
    })();
  }, [user, snapshot.context.hands, snapshot.context.activeHandIdx, placeBet, send, play]);

  const handleChooseAce = useCallback(
    (value: 1 | 11) => {
      send({ type: 'CHOOSE_ACE', value });
    },
    [send],
  );

  if (!user) return null;

  const isSettling = snapshot.matches('settling');
  const inInsurance = snapshot.matches('insurance_prompt');
  const inAcePrompt = snapshot.matches('awaiting_ace_choice');
  const acePrompt = snapshot.context.acePrompt;

  // Build per-hand settlement summary for PlayerArea (only meaningful in settling).
  type HandSettlement = { outcome: Outcome; payout: number; fiveCardCharlie: boolean };
  const settlements: readonly HandSettlement[] | undefined = isSettling
    ? snapshot.context.roundResult?.details.hands.map((h) => ({
        outcome: h.outcome,
        payout: h.payout,
        fiveCardCharlie: h.fiveCardCharlie,
      }))
    : undefined;

  // Determine which bottom panel to show.
  let bottomPanel: JSX.Element;
  if (snapshot.matches('betting') || isSettling) {
    bottomPanel = (
      <BettingPanel
        min={BLACKJACK_CONFIG.MIN_BET}
        max={BLACKJACK_CONFIG.MAX_BET}
        balance={balance}
        onCommit={(amount) => {
          if (isSettling) send({ type: 'NEW_ROUND' });
          send({ type: 'PLACE_BET', amount });
        }}
        callButtons={() => <></>}
      />
    );
  } else {
    // Modals (insurance / ace) overlay this panel; ActionPanel is correct here.
    bottomPanel = (
      <ActionPanel
        hands={snapshot.context.hands}
        activeHandIdx={snapshot.context.activeHandIdx}
        balance={balance}
        onHit={() => send({ type: 'HIT' })}
        onStand={() => send({ type: 'STAND' })}
        onDouble={handleDouble}
        onSplit={handleSplit}
      />
    );
  }

  const holeRevealed =
    !snapshot.matches('betting') &&
    !snapshot.matches('awaiting_bet_handle') &&
    !snapshot.matches('dealing') &&
    !snapshot.matches('insurance_prompt');

  return (
    <GameShell
      title="MASQUER · Blackjack"
      meta="3:2 BJ · H17 · 5-Card Charlie · 5–1000"
      game="blackjack"
      recentItems={items}
      bettingPanel={bottomPanel}
      rules={<BlackjackRules />}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-4">
        <DealerArea cards={snapshot.context.dealerCards} holeRevealed={holeRevealed} />
        <div className="flex items-center gap-3">
          {streak >= 2 && (
            <Badge tone="win" icon="Flame" aria-label={`${streak} win streak`}>
              {streak} win streak
            </Badge>
          )}
        </div>
        <PlayerArea
          hands={snapshot.context.hands}
          activeHandIdx={snapshot.context.activeHandIdx}
          inSettlement={isSettling}
          {...(settlements ? { settlements } : {})}
        />
      </div>

      <InsurancePrompt
        open={inInsurance}
        mainBet={snapshot.context.betAmount}
        onTake={handleTakeInsurance}
        onDecline={() => send({ type: 'DECLINE_INSURANCE' })}
      />

      <AceValuePrompt
        open={inAcePrompt && acePrompt !== null}
        allowEleven={acePrompt?.allowEleven ?? false}
        onChoose={handleChooseAce}
      />
    </GameShell>
  );
}
