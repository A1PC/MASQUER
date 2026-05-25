import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import GameShell from '@/games/_shared/GameShell';
import LobbyButton from '@/games/_shared/LobbyButton';
import OddsInfoBox from '@/games/_shared/OddsInfoBox';
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
import AceChoicePanel from './AceChoicePanel';
import InsurancePrompt from './InsurancePrompt';
import type { RecentResultItem } from '@/games/_shared/RecentResults';
import type { BlackjackRoundDetails, Outcome } from './types';

/**
 * BlackjackPage — Phase 15 #5 Velvet Duel UI (post-test-feedback fix batch).
 *
 * Composition: `GameShell` shell + `DealerArea` (top) + `PlayerArea` (bottom)
 * inside a felt panel; `BettingPanel` for the bet; the bottom action slot
 * shows `ActionPanel` (Hit / Stand / Double / Split) during play, swaps to
 * `AceChoicePanel` while the machine is in `awaiting_ace_choice`, and the
 * `InsurancePrompt` Modal still fires on dealer-Ace deals (Insurance keeps
 * its Modal — it's an opt-in bet that benefits from a focus-trapped commit).
 *
 * Card animation: each dealt card animates from the deck anchor → its slot
 * (translate, ≤400ms) and then flips face-up (rotateY 180→0, ≤300ms). The
 * dealer's hole card lands face-down and does NOT flip until the machine's
 * `revealHoleCard` action runs (driven by `holeRevealed`). The four opening-
 * deal cards are staggered P1 @ 0ms / D1 @ 200ms / P2 @ 400ms / D2 @ 600ms.
 * `useEffectiveReducedMotion` collapses every animation to instant and fires
 * a single `card.deal` per batch (instead of one per landing) — handled by
 * the page so individual `AnimatedCard`s don't need to coordinate.
 *
 * Side effects (orchestration only — no game logic):
 *  · `useSound` plays `chip.place` on bet commit, `card.deal` on each card
 *    LANDING (or once-per-batch in reduced-motion), `win.small` on a standard
 *    win, `win.medium` on a natural blackjack or 5-Card Charlie, `loss` on
 *    bust / loss.
 *  · A session-local `streak` counter (mirrors the coin-flip Flame indicator
 *    pattern at `src/games/coin-flip/CoinFlipPage.tsx`) increments on any
 *    winning hand within a round and resets on a losing/bust hand, on a
 *    `push`-only round, and on mount.
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
  // Previously-seen card counts used ONLY by the reduced-motion sound effect
  // to batch a single `card.deal` per dealt batch. Held in a ref (not state)
  // so updating it does NOT trigger a re-render — re-renders during animation
  // were yanking the in-flight motion.divs and replacing them with static
  // ones, causing cards to snap to rest with no visible flight. Animations
  // are now driven purely by Framer Motion's one-shot `initial` on mount.
  const lastCardCountsRef = useRef<{ dealer: number; hands: number[] }>({
    dealer: 0,
    hands: [],
  });

  const reduceMotion = useEffectiveReducedMotion();
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

  // Reduced-motion sound batcher: diff the snapshot's card counts vs the
  // last-seen counts. When new cards appeared this tick AND reduced-motion is
  // active (so per-card `onLanded` won't fire), play one `card.deal` per
  // batch. Refs (not state) so this never triggers a re-render — re-renders
  // during a flight animation would unmount/remount the motion.divs.
  useEffect(() => {
    const dealerCount = snapshot.context.dealerCards.length;
    const handCounts = snapshot.context.hands.map((h) => h.cards.length);
    const prev = lastCardCountsRef.current;

    let dealtThisTick = 0;
    if (dealerCount > prev.dealer) dealtThisTick += dealerCount - prev.dealer;
    handCounts.forEach((cnt, i) => {
      const p = prev.hands[i] ?? 0;
      if (cnt > p) dealtThisTick += cnt - p;
    });
    if (reduceMotion && dealtThisTick > 0) play('card.deal');

    lastCardCountsRef.current = { dealer: dealerCount, hands: handCounts };
  }, [snapshot.context.dealerCards, snapshot.context.hands, play, reduceMotion]);

  // Card-landing callbacks → fire `card.deal` on the landing of each new card
  // (the spec: "fire `card.deal` sound on each card LANDING (not start)").
  // Suppressed in reduced-motion — the batched sound above handles that path.
  const handleDealerCardLanded = useCallback(() => {
    if (!reduceMotion) play('card.deal');
  }, [play, reduceMotion]);
  const handlePlayerCardLanded = useCallback(() => {
    if (!reduceMotion) play('card.deal');
  }, [play, reduceMotion]);

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
      // The card-count diff effect above will resynchronise on the next
      // dealing render — no need to reset state here (an empty hands array
      // will naturally drive `lastCardCounts` back to {dealer:0, hands:[]}).
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

  // ---- Card animation orchestration ------------------------------------
  // Animations are driven by Framer Motion's one-shot `initial` inside
  // AnimatedCard — newly-mounted cards animate; cards already on the table
  // stay put. React reconciliation (HandView keys cards by `${idx}-${rank}${suit}`)
  // ensures new cards mount fresh while existing ones survive re-renders.
  // Round transitions clear hands/dealerCards to [], which unmounts every
  // card so the next deal mounts them fresh.
  const dealerCards = snapshot.context.dealerCards;
  const hands = snapshot.context.hands;

  // Opening-deal stagger: when the table shape is exactly the opening four
  // (1 player hand × 2 cards + 2 dealer cards), pass position-based delays.
  // These are consumed only when the cards MOUNT (Framer Motion `initial` is
  // one-shot); subsequent renders pass the same delays but they're no-ops
  // because the motion.divs are already past `initial`. In-game draws never
  // match this shape and so use no delay.
  const isOpeningDealShape =
    dealerCards.length === 2 && hands.length === 1 && hands[0]!.cards.length === 2;
  const openingDealerDelays = isOpeningDealShape ? [200, 600] : undefined; // D1, D2(hole)
  const openingPlayerDelaysPerHand: (number[] | undefined)[] = isOpeningDealShape
    ? [[0, 400]]
    : hands.map(() => undefined);

  // Per-card highlight: ring the Ace card being valued. The machine's
  // `acePrompt` carries the exact `{ handIdx, cardIdx }`.
  const highlightsPerHand: (boolean[] | undefined)[] = hands.map((h, hi) => {
    if (!acePrompt || !inAcePrompt) return undefined;
    if (hi !== acePrompt.handIdx) return undefined;
    return h.cards.map((_, ci) => ci === acePrompt.cardIdx);
  });

  // Determine which bottom panel to show. Three-way swap:
  //   · betting / settling → BettingPanel (place a bet, settle a round)
  //   · awaiting_ace_choice → AceChoicePanel (inline; hand stays visible)
  //   · everything else → ActionPanel (Hit / Stand / Double / Split)
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
  } else if (inAcePrompt && acePrompt) {
    bottomPanel = <AceChoicePanel allowEleven={acePrompt.allowEleven} onChoose={handleChooseAce} />;
  } else {
    // Insurance modal overlays this panel; ActionPanel is correct here.
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
      game="blackjack"
      recentItems={items}
      bettingPanel={bottomPanel}
      rules={<BlackjackRules />}
      lobbyButton={<LobbyButton />}
      oddsInfo={
        <OddsInfoBox>Blackjack 3:2 · Win 1:1 · Insurance 2:1 · 5-Card Charlie 3:2</OddsInfoBox>
      }
    >
      <div className="relative flex flex-1 flex-col items-center justify-center gap-5 px-4 py-4">
        <DealerArea
          cards={dealerCards}
          holeRevealed={holeRevealed}
          {...(openingDealerDelays ? { delaysMs: openingDealerDelays } : {})}
          onCardLanded={handleDealerCardLanded}
        />
        <div className="flex items-center gap-3">
          {streak >= 2 && (
            <Badge tone="win" icon="Flame" aria-label={`${streak} win streak`}>
              {streak} win streak
            </Badge>
          )}
        </div>
        <PlayerArea
          hands={hands}
          activeHandIdx={snapshot.context.activeHandIdx}
          inSettlement={isSettling}
          {...(settlements ? { settlements } : {})}
          delaysMsPerHand={openingPlayerDelaysPerHand}
          highlightsPerHand={highlightsPerHand}
          onCardLanded={handlePlayerCardLanded}
        />
      </div>

      <InsurancePrompt
        open={inInsurance}
        mainBet={snapshot.context.betAmount}
        onTake={handleTakeInsurance}
        onDecline={() => send({ type: 'DECLINE_INSURANCE' })}
      />
    </GameShell>
  );
}
