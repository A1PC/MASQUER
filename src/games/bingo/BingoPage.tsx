import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import { useGameRound } from '@/games/_shared/useGameRound';
import { bingoMachine } from './machine';
import { BINGO_CONFIG, type BingoSpeed } from './logic';
import SetupPanel from './SetupPanel';
import BingoCard from './BingoCard';
import CallBoard from './CallBoard';
import { useBingoBallCaller } from './useBingoBallCaller';

export default function BingoPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const { placeBet, settle } = useGameRound('bingo');
  const [snapshot, send] = useMachine(bingoMachine);
  const [pendingCardCount, setPendingCardCount] = useState(1);
  const [pendingSpeed, setPendingSpeed] = useState<BingoSpeed>('normal');
  const settledRef = useRef<string | null>(null);

  // Ball caller — fires while in playing state.
  const handleCall = useCallback(() => {
    send({ type: 'CALL' });
  }, [send]);
  useBingoBallCaller({
    enabled: snapshot.matches('playing'),
    speed: snapshot.context.speed,
    onCall: handleCall,
  });

  // Settle bridge — runs once when we enter settling.
  useEffect(() => {
    if (!snapshot.matches('settling')) return;
    if (!user) return;
    const handleId = snapshot.context.betHandleId;
    if (!handleId || settledRef.current === handleId) return;
    settledRef.current = handleId;
    const totalPayout = snapshot.context.wins.reduce((s, w) => s + w.payout, 0);
    const betAmount = snapshot.context.betAmount;
    const netChange = totalPayout - betAmount;
    const outcome = totalPayout > betAmount ? 'win' : totalPayout === betAmount ? 'push' : 'loss';
    const perCardPayouts = snapshot.context.cards.map((cardState) => ({
      cardId: cardState.card.id,
      tiers: Array.from(cardState.achievedTiers),
      payout: snapshot.context.wins
        .filter((w) => w.cardId === cardState.card.id)
        .reduce((s, w) => s + w.payout, 0),
    }));
    const fastFullHouse = snapshot.context.wins.some((w) => w.tier === 'fast-full-house');
    void (async () => {
      await settle(
        {
          betId: handleId,
          userId: user.id,
          game: 'bingo',
          amount: betAmount,
          placedAt: Date.now(),
        },
        {
          outcome,
          betAmount,
          payout: totalPayout,
          netChange,
          details: {
            cardCount: snapshot.context.cardCount,
            speed: snapshot.context.speed,
            daubMode: snapshot.context.daubMode,
            finalCallCount: snapshot.context.callIndex,
            fastFullHouse,
            perCardPayouts,
          },
        },
      );
      send({ type: 'SETTLED' });
    })();
  }, [snapshot, settle, send, user]);

  // Reset the settled-ref when we leave settling (PLAY_AGAIN can re-enter the cycle).
  useEffect(() => {
    if (!snapshot.matches('settling')) {
      settledRef.current = null;
    }
  }, [snapshot]);

  const calledSoFar = useMemo(
    () => snapshot.context.callSequence.slice(0, snapshot.context.callIndex),
    [snapshot.context.callSequence, snapshot.context.callIndex],
  );

  if (!user) return null;

  async function handleBuyAndStart(): Promise<void> {
    if (!user) return;
    const cost = pendingCardCount * BINGO_CONFIG.CARD_COST;
    const result = await placeBet(cost, {
      min: BINGO_CONFIG.CARD_COST,
      max: BINGO_CONFIG.CARD_COST * BINGO_CONFIG.MAX_CARDS_PER_GAME,
    });
    if (!result.ok) return;
    send({ type: 'BUY_AND_START', cardCount: pendingCardCount, speed: pendingSpeed });
    send({ type: 'BET_PLACED', betHandleId: result.handle.betId });
  }

  return (
    <div className="flex min-h-screen bg-felt-deep text-white">
      <main className="flex-1 overflow-auto p-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-base tracking-wider text-gold-bright">🎯 BINGO</h1>
          <span className="font-display text-xs text-white/60">
            Balance:{' '}
            <span className="text-gold-bright tabular-nums">{balance.toLocaleString()}</span>
          </span>
        </header>

        {snapshot.matches('setup') && (
          <SetupPanel
            cardCount={pendingCardCount}
            speed={pendingSpeed}
            balance={balance}
            onCardCountChange={setPendingCardCount}
            onSpeedChange={setPendingSpeed}
            onBuyAndStart={() => void handleBuyAndStart()}
          />
        )}

        {snapshot.matches('awaiting_bet_handle') && (
          <p className="text-center text-xs text-white/60">Placing bet…</p>
        )}

        {(snapshot.matches('playing') ||
          snapshot.matches('settling') ||
          snapshot.matches('done')) && (
          <div className="flex flex-col gap-4">
            <CallBoard calledSoFar={calledSoFar} callCount={snapshot.context.callIndex} />
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${snapshot.context.cards.length}, minmax(0, 1fr))`,
              }}
            >
              {snapshot.context.cards.map((cardState) => (
                <BingoCard
                  key={cardState.card.id}
                  card={cardState.card}
                  daubed={cardState.daubed}
                  achievedTiers={cardState.achievedTiers}
                />
              ))}
            </div>
          </div>
        )}

        {snapshot.matches('done') && (
          <section
            className="mt-4 rounded border border-gold/40 bg-felt-deep p-4 text-center"
            data-end-screen
          >
            <h2 className="mb-2 font-display text-lg tracking-wider text-gold-bright">GAME OVER</h2>
            <p className="text-sm text-white/80">
              Total won:{' '}
              <span className="font-display text-gold-bright tabular-nums">
                {snapshot.context.wins.reduce((s, w) => s + w.payout, 0).toLocaleString()} chips
              </span>
            </p>
            <button
              type="button"
              onClick={() => send({ type: 'PLAY_AGAIN' })}
              className="mt-3 rounded-md border-2 border-gold bg-casino-red px-6 py-2 font-display text-sm tracking-wider text-white"
            >
              PLAY AGAIN
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
