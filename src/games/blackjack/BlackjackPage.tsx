import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMachine } from '@xstate/react';
import GameShell from '@/games/_shared/GameShell';
import BlackjackRules from './rules';
import BettingPanel from '@/games/_shared/BettingPanel';
import { useRecentRounds } from '@/systems/hooks/useRecentRounds';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance, useWalletStore } from '@/store/walletStore';
import { blackjackMachine } from './machine';
import { BLACKJACK_CONFIG } from './config';
import DealerArea from './DealerArea';
import PlayerArea from './PlayerArea';
import ActionPanel from './ActionPanel';
import InsurancePrompt from './InsurancePrompt';
import type { RecentResultItem } from '@/games/_shared/RecentResults';
import type { BlackjackRoundDetails } from './types';

export default function BlackjackPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const placeBet = useWalletStore((s) => s.placeBet);
  const settleRound = useWalletStore((s) => s.settleRound);
  const rounds = useRecentRounds(user?.id, 'blackjack', 12);

  const [snapshot, send] = useMachine(blackjackMachine);
  const settledRef = useRef<string | null>(null); // guard against double-settle

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
          send({ type: 'BET_PLACED', betHandleId: result.handle.betId });
        }
        // If failure, machine stays in awaiting_bet_handle; UI shows error in PR D follow-up.
        // For Phase 3, BettingPanel's own validation prevents most failures.
      })();
    }
  }, [snapshot, send, placeBet, user]);

  // Bridge: when machine reaches settling, call wallet.settleRound ONCE with the aggregate.
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
      // After settle persists, auto-advance to NEW_ROUND after a short delay (UI shows result).
      // For simplicity in Phase 3, immediately allow user to dismiss via PLACE BET (machine sends NEW_ROUND inside BettingPanel hook below).
    })();
  }, [snapshot, settleRound, user]);

  // Reset the settled-ref guard when we leave settling.
  useEffect(() => {
    if (!snapshot.matches('settling')) {
      settledRef.current = null;
    }
  }, [snapshot]);

  const items: RecentResultItem[] = useMemo(
    () =>
      rounds.map((r) => {
        const d = r.details as BlackjackRoundDetails;
        const anyBJ = d.hands.some((h) => h.outcome === 'player-blackjack');
        return {
          key: r.id,
          badgeText: anyBJ ? 'BJ' : r.outcome === 'win' ? 'W' : r.outcome === 'loss' ? 'L' : 'P',
          badgeColor: anyBJ
            ? '#ffe066'
            : r.outcome === 'win'
              ? '#3dd17a'
              : r.outcome === 'loss'
                ? '#7a1f2b'
                : '#7a7a7a',
          badgeTextColor: anyBJ || r.outcome === 'win' ? '#06120c' : '#fff',
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
        min: 1, // insurance bet bypasses table min
        max: BLACKJACK_CONFIG.MAX_BET,
      });
      if (result.ok) {
        send({ type: 'TAKE_INSURANCE', betHandleId: result.handle.betId, bet: insuranceBet });
      }
    })();
  }, [user, snapshot.context.betAmount, placeBet, send]);

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
      if (result.ok) send({ type: 'DOUBLE', betHandleId: result.handle.betId });
    })();
  }, [user, snapshot.context.hands, snapshot.context.activeHandIdx, placeBet, send]);

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
      if (result.ok) send({ type: 'SPLIT', betHandleId: result.handle.betId });
    })();
  }, [user, snapshot.context.hands, snapshot.context.activeHandIdx, placeBet, send]);

  if (!user) return null;

  // Determine which bottom panel to show.
  let bottomPanel: JSX.Element;
  if (snapshot.matches('betting') || snapshot.matches('settling')) {
    bottomPanel = (
      <BettingPanel
        min={BLACKJACK_CONFIG.MIN_BET}
        max={BLACKJACK_CONFIG.MAX_BET}
        balance={balance}
        onCommit={(amount) => {
          if (snapshot.matches('settling')) send({ type: 'NEW_ROUND' });
          send({ type: 'PLACE_BET', amount });
        }}
        callButtons={() => <></>}
      />
    );
  } else if (snapshot.matches('insurance_prompt')) {
    bottomPanel = (
      <InsurancePrompt
        mainBet={snapshot.context.betAmount}
        onTake={handleTakeInsurance}
        onDecline={() => send({ type: 'DECLINE_INSURANCE' })}
      />
    );
  } else {
    // player_action / after_action / dealer_check / dealer_action
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
      title="🃏 BLACKJACK"
      meta="3:2 BJ · H17 · 5–1000"
      game="blackjack"
      recentItems={items}
      bettingPanel={bottomPanel}
      rules={<BlackjackRules />}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-4">
        <DealerArea cards={snapshot.context.dealerCards} holeRevealed={holeRevealed} />
        <div className="h-px w-[420px] border-t border-dashed border-gold/20" />
        <PlayerArea
          hands={snapshot.context.hands}
          activeHandIdx={snapshot.context.activeHandIdx}
          inSettlement={snapshot.matches('settling')}
        />
      </div>
    </GameShell>
  );
}
