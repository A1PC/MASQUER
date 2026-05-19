import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { AnimatePresence } from 'framer-motion';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import { useGameRound } from '@/games/_shared/useGameRound';
import { bingoMachine } from './machine';
import { BINGO_CONFIG, type BingoSpeed, type BingoTier } from './logic';
import SetupPanel from './SetupPanel';
import BingoCard from './BingoCard';
import CallBoard from './CallBoard';
import { useBingoBallCaller } from './useBingoBallCaller';
import DaubToggle from './DaubToggle';
import WinBanner from './WinBanner';
import EndScreen from './EndScreen';

export default function BingoPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const { placeBet, settle } = useGameRound('bingo');
  const [snapshot, send] = useMachine(bingoMachine);
  const [pendingCardCount, setPendingCardCount] = useState(1);
  const [pendingSpeed, setPendingSpeed] = useState<BingoSpeed>('normal');
  const settledRef = useRef<string | null>(null);

  // Win-banner state tracking.
  const [activeBanners, setActiveBanners] = useState<
    Array<{ key: string; tier: BingoTier; cardId: string }>
  >([]);
  const shownKeysRef = useRef<Set<string>>(new Set());

  // Sync banner display with the XState machine's wins array.
  // setState here is legitimate UI ↔ XState machine sync — the banner list
  // is externally driven by the machine, not derived from other React state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // When wins resets to empty (PLAY_AGAIN), clear banners.
    if (snapshot.context.wins.length === 0) {
      if (shownKeysRef.current.size > 0) {
        shownKeysRef.current = new Set();
        setActiveBanners([]);
      }
      return;
    }
    // Append any newly-added wins that have not been shown yet.
    const newBanners: Array<{ key: string; tier: BingoTier; cardId: string }> = [];
    for (let i = 0; i < snapshot.context.wins.length; i += 1) {
      const w = snapshot.context.wins[i]!;
      const key = `${w.cardId}-${w.tier}-${i}`;
      if (shownKeysRef.current.has(key)) continue;
      shownKeysRef.current.add(key);
      newBanners.push({ key, tier: w.tier, cardId: w.cardId });
    }
    if (newBanners.length > 0) {
      setActiveBanners((cur) => [...cur, ...newBanners]);
    }
  }, [snapshot.context.wins]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const dismissBanner = useCallback((key: string) => {
    setActiveBanners((cur) => cur.filter((b) => b.key !== key));
  }, []);

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
          <div className="flex items-center gap-3">
            <h1 className="font-display text-base tracking-wider text-gold-bright">🎯 BINGO</h1>
            {(snapshot.matches('playing') ||
              snapshot.matches('settling') ||
              snapshot.matches('done')) && (
              <DaubToggle
                mode={snapshot.context.daubMode}
                onToggle={() => send({ type: 'TOGGLE_DAUB' })}
              />
            )}
          </div>
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
            {activeBanners.length > 0 && (
              <div className="flex flex-col items-center gap-2" data-banner-stack>
                <AnimatePresence>
                  {activeBanners.map((b) => (
                    <WinBanner
                      key={b.key}
                      tier={b.tier}
                      cardId={b.cardId}
                      onDismiss={() => dismissBanner(b.key)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
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
                  {...(snapshot.context.daubMode === 'manual' && snapshot.matches('playing')
                    ? {
                        onCellClick: (row: number, col: number) =>
                          send({ type: 'MANUAL_DAUB', cardId: cardState.card.id, row, col }),
                      }
                    : {})}
                  manualMode={snapshot.context.daubMode === 'manual'}
                />
              ))}
            </div>
          </div>
        )}

        {snapshot.matches('done') && (
          <div className="mt-4">
            <EndScreen
              cards={snapshot.context.cards}
              wins={snapshot.context.wins}
              onPlayAgain={() => send({ type: 'PLAY_AGAIN' })}
            />
          </div>
        )}
      </main>
    </div>
  );
}
