import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Navigate, useNavigate } from 'react-router';
import { useMachine } from '@xstate/react';
import { AnimatePresence } from 'framer-motion';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import { useGameRound } from '@/games/_shared/useGameRound';
import { bingoMachine, type ClaimLogEntry } from './machine';
import { BUY_IN, type BingoSpeed, type Difficulty, type Variant } from './logic';
import SetupPanel from './SetupPanel';
import BingoCard from './BingoCard';
import CallBoard from './CallBoard';
import CpuCardMini from './CpuCardMini';
import { useBingoBallCaller } from './useBingoBallCaller';
import DaubToggle from './DaubToggle';
import WinBanner from './WinBanner';
import EndScreen from './EndScreen';

function isVariant(v: string | null): v is Variant {
  return v === 'british' || v === 'american';
}

export default function BingoPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const variantParam = searchParams.get('variant');
  const variant: Variant = isVariant(variantParam) ? variantParam : 'british';
  const invalidVariant = !isVariant(variantParam);

  const { placeBet, settle } = useGameRound('bingo');
  const [snapshot, send] = useMachine(bingoMachine);

  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty>('easy');
  const [pendingSpeed, setPendingSpeed] = useState<BingoSpeed>('normal');
  const [pendingDaubMode, setPendingDaubMode] = useState<'auto' | 'manual'>('auto');
  const settledRef = useRef<string | null>(null);
  const [activeBanners, setActiveBanners] = useState<Array<{ key: string; entry: ClaimLogEntry }>>(
    [],
  );
  const shownClaimsRef = useRef<number>(0);

  // Banner sync from claimLog.
  useEffect(() => {
    const log = snapshot.context.claimLog;
    if (log.length === 0) {
      if (shownClaimsRef.current > 0) {
        shownClaimsRef.current = 0;
        setActiveBanners([]);
      }
      return;
    }
    if (log.length > shownClaimsRef.current) {
      const newBanners: Array<{ key: string; entry: ClaimLogEntry }> = [];
      for (let i = shownClaimsRef.current; i < log.length; i += 1) {
        newBanners.push({ key: `${i}-${log[i]!.tier}`, entry: log[i]! });
      }
      shownClaimsRef.current = log.length;
      setActiveBanners((cur) => [...cur, ...newBanners]);
    }
  }, [snapshot.context.claimLog]);

  const dismissBanner = useCallback((key: string) => {
    setActiveBanners((cur) => cur.filter((b) => b.key !== key));
  }, []);

  const handleCall = useCallback(() => send({ type: 'CALL' }), [send]);
  useBingoBallCaller({
    enabled: snapshot.matches('playing'),
    speed: snapshot.context.speed,
    onCall: handleCall,
  });

  useEffect(() => {
    if (!snapshot.matches('settling')) return;
    if (!user) return;
    const handleId = snapshot.context.betHandleId;
    if (!handleId || settledRef.current === handleId) return;
    settledRef.current = handleId;
    const ctx = snapshot.context;
    const totalPayout = ctx.bonusesEarned + (ctx.winner === 'user' ? ctx.pot : 0);
    const netChange = totalPayout - ctx.betAmount;
    const outcome = ctx.winner === 'user' ? 'win' : totalPayout >= ctx.betAmount ? 'push' : 'loss';
    void settle(
      {
        betId: handleId,
        userId: user.id,
        game: 'bingo',
        amount: ctx.betAmount,
        placedAt: Date.now(),
      },
      {
        outcome,
        betAmount: ctx.betAmount,
        payout: totalPayout,
        netChange,
        details: {
          variant: ctx.variant,
          difficulty: ctx.difficulty,
          speed: ctx.speed,
          daubMode: ctx.daubMode,
          finalCallCount: ctx.callIndex,
          cpuCount: ctx.cpuCards.length,
          userTier1: ctx.userTier1,
          userTier2: ctx.userTier2,
          userTier3: ctx.userTier3,
          cpuTier3Winner: ctx.cpuTier3Winner,
          bonusesEarned: ctx.bonusesEarned,
          pot: ctx.pot,
        },
      },
    ).then(() => {
      send({ type: 'SETTLED' });
    });
  }, [snapshot, settle, send, user]);

  useEffect(() => {
    if (!snapshot.matches('settling')) settledRef.current = null;
  }, [snapshot]);

  const calledSoFar = useMemo(
    () => snapshot.context.callSequence.slice(0, snapshot.context.callIndex),
    [snapshot.context.callSequence, snapshot.context.callIndex],
  );

  // Find latest claim per CPU for highlight.
  const cpuHighlights = useMemo<Record<number, 'tier1' | 'tier2' | 'tier3' | null>>(() => {
    const out: Record<number, 'tier1' | 'tier2' | 'tier3' | null> = {};
    for (const entry of snapshot.context.claimLog) {
      if (entry.source === 'cpu' && entry.cpuIdx !== undefined) out[entry.cpuIdx] = entry.tier;
    }
    return out;
  }, [snapshot.context.claimLog]);

  // Guards that fire after all hooks
  if (invalidVariant) {
    return <Navigate to="/lobby" replace />;
  }

  if (!user) return null;

  function handleBuyAndStart(): void {
    void (async () => {
      if (!user) return;
      const result = await placeBet(BUY_IN, { min: BUY_IN, max: BUY_IN });
      if (!result.ok) return;
      send({
        type: 'BUY_AND_START',
        variant,
        difficulty: pendingDifficulty,
        speed: pendingSpeed,
        daubMode: pendingDaubMode,
      });
      send({ type: 'BET_PLACED', betHandleId: result.handle.betId });
    })();
  }

  return (
    <div className="flex min-h-screen bg-felt-deep text-white">
      <main className="flex-1 overflow-auto p-6">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-base tracking-wider text-gold-bright">
              🎯 BINGO — {variant === 'british' ? '🇬🇧' : '🇺🇸'}{' '}
              {snapshot.context.difficulty.toUpperCase() || 'SETUP'}
            </h1>
            {(snapshot.matches('playing') ||
              snapshot.matches('settling') ||
              snapshot.matches('done')) && (
              <DaubToggle
                mode={snapshot.context.daubMode}
                onToggle={() => send({ type: 'TOGGLE_DAUB' })}
                disabled={snapshot.context.difficulty === 'hard'}
                {...(snapshot.context.difficulty === 'hard'
                  ? { disabledReason: 'Hard difficulty requires manual daub' }
                  : {})}
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
            variant={variant}
            difficulty={pendingDifficulty}
            speed={pendingSpeed}
            daubMode={pendingDaubMode}
            balance={balance}
            onDifficultyChange={(d) => {
              setPendingDifficulty(d);
              if (d === 'hard') setPendingDaubMode('manual');
            }}
            onSpeedChange={setPendingSpeed}
            onDaubModeChange={setPendingDaubMode}
            onBuyAndStart={handleBuyAndStart}
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
                  {activeBanners.map(({ key, entry }) => (
                    <WinBanner
                      key={key}
                      bannerKey={key}
                      source={entry.source}
                      {...(entry.cpuIdx !== undefined ? { cpuIdx: entry.cpuIdx } : {})}
                      tier={entry.tier}
                      variant={variant}
                      onDismiss={() => dismissBanner(key)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
            <CallBoard
              calledSoFar={calledSoFar}
              callCount={snapshot.context.callIndex}
              variant={variant}
            />
            <div className="flex justify-center" data-your-card>
              <BingoCard
                card={snapshot.context.userCard.card}
                daubed={snapshot.context.userCard.daubed}
                variant={variant}
                size="large"
                manualMode={snapshot.context.daubMode === 'manual'}
                {...(snapshot.context.daubMode === 'manual' && snapshot.matches('playing')
                  ? {
                      onCellClick: (row: number, col: number) =>
                        send({ type: 'MANUAL_DAUB', row, col }),
                    }
                  : {})}
              />
            </div>
            <div className="text-[10px] tracking-wider text-white/50 mt-2">COMPUTERS</div>
            <div className="grid grid-cols-3 gap-2" data-cpu-grid>
              {snapshot.context.cpuCards.map((cpu, idx) => (
                <CpuCardMini
                  key={idx}
                  cpu={cpu}
                  cpuIdx={idx}
                  variant={variant}
                  highlightTier={cpuHighlights[idx] ?? null}
                />
              ))}
            </div>
          </div>
        )}

        {snapshot.matches('done') && (
          <div className="mt-4">
            <EndScreen
              variant={variant}
              winner={snapshot.context.winner}
              cpuTier3Winner={snapshot.context.cpuTier3Winner}
              pot={snapshot.context.pot}
              bonusesEarned={snapshot.context.bonusesEarned}
              claimLog={snapshot.context.claimLog}
              onPlayAgain={() => send({ type: 'PLAY_AGAIN' })}
              onChangeVariant={() => {
                void navigate('/lobby');
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
