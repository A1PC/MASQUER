import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import { useGameRound } from '@/games/_shared/useGameRound';
import {
  AUTO_INTERVAL_MS,
  BET_MAX,
  BET_MIN,
  MULTIPLIER_CURVES,
  dropBall,
  payoutFor,
  type AutoIntervalKey,
  type Risk,
  _mulberry32,
} from './logic';
import { plinkoMachine } from './machine';
import SetupPanel from './SetupPanel';
import Board from './Board';
import FallingBall from './FallingBall';
import BinRow from './BinRow';
import HistoryStrip from './HistoryStrip';
import AutoDropControls from './AutoDropControls';
import EndScreen from './EndScreen';

/** Generate a uint32 seed from crypto.getRandomValues (no Math.random). */
function cryptoSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]!;
}

export default function PlinkoPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const { placeBet, settle } = useGameRound('plinko');
  const [snapshot, send] = useMachine(plinkoMachine);

  // Setup panel local state
  const [pendingRisk, setPendingRisk] = useState<Risk>('low');
  const [pendingBet, setPendingBet] = useState<number>(50);
  const [pendingMode, setPendingMode] = useState<'manual' | 'auto'>('manual');
  const [pendingAutoBalls, setPendingAutoBalls] = useState<number>(10);
  const [pendingAutoInterval, setPendingAutoInterval] = useState<AutoIntervalKey>('normal');

  // For session entries shown in EndScreen — the last autoBallsSpawned entries.
  const sessionEntries = useMemo(
    () => snapshot.context.history.slice(0, snapshot.context.autoBallsSpawned),
    [snapshot.context.history, snapshot.context.autoBallsSpawned],
  );

  // Flashed bin for current ball landing (drives BinRow pulse).
  const [flashedBinIdx, setFlashedBinIdx] = useState<number | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerFlash = useCallback((bin: number) => {
    setFlashedBinIdx(bin);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setFlashedBinIdx(null), 600);
  }, []);

  useEffect(
    () => () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    },
    [],
  );

  // Stable RNG instance per page mount — seeded from crypto, not Math.random.
  const rngRef = useRef<() => number>(_mulberry32(cryptoSeed()));

  // Manual drop handler.
  const handleManualDrop = useCallback(async () => {
    if (!user) return;
    const result = await placeBet(pendingBet, { min: BET_MIN, max: BET_MAX });
    if (!result.ok) return;
    const { path, bin } = dropBall(rngRef.current);
    const multiplier = MULTIPLIER_CURVES[pendingRisk][bin]!;
    const payout = payoutFor(pendingRisk, bin, pendingBet);
    const ballId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    send({
      type: 'DROP_MANUAL',
      bet: pendingBet,
      risk: pendingRisk,
      betHandleId: result.handle.betId,
      path,
      bin,
      multiplier,
      payout,
      ballId,
      sessionId,
    });
  }, [user, placeBet, pendingBet, pendingRisk, send]);

  // Start-auto handler.
  const handleStartAuto = useCallback(() => {
    const sessionId = crypto.randomUUID();
    send({
      type: 'START_AUTO',
      bet: pendingBet,
      risk: pendingRisk,
      ballsRequested: pendingAutoBalls,
      intervalMs: AUTO_INTERVAL_MS[pendingAutoInterval],
      sessionId,
    });
  }, [pendingBet, pendingRisk, pendingAutoBalls, pendingAutoInterval, send]);

  // Auto scheduler — runs while in playing-auto, spawns balls on interval.
  useEffect(() => {
    if (!snapshot.matches('playing-auto')) return;
    if (snapshot.context.autoBallsSpawned >= snapshot.context.autoBallsRequested) return;
    if (!user) return;

    const t = setTimeout(() => {
      void (async () => {
        if (balance < snapshot.context.bet) {
          send({ type: 'AUTO_STOP', reason: 'insufficient-chips' });
          return;
        }
        const result = await placeBet(snapshot.context.bet, { min: BET_MIN, max: BET_MAX });
        if (!result.ok) {
          send({ type: 'AUTO_STOP', reason: 'insufficient-chips' });
          return;
        }
        const { path, bin } = dropBall(rngRef.current);
        const multiplier = MULTIPLIER_CURVES[snapshot.context.risk][bin]!;
        const payout = payoutFor(snapshot.context.risk, bin, snapshot.context.bet);
        const ballId = crypto.randomUUID();
        send({
          type: 'AUTO_TICK',
          betHandleId: result.handle.betId,
          path,
          bin,
          multiplier,
          payout,
          ballId,
        });
      })();
    }, snapshot.context.autoIntervalMs);

    return () => clearTimeout(t);
  }, [snapshot, balance, user, placeBet, send]);

  // Ball-landed callback: settle wallet, send BALL_LANDED, trigger BinRow flash.
  const handleBallLanded = useCallback(
    (ballId: string) => {
      void (async () => {
        const ball = snapshot.context.inFlightBalls.find((b) => b.ballId === ballId);
        if (!ball || !user) return;
        triggerFlash(ball.bin);
        const outcome = ball.payout > ball.bet ? 'win' : ball.payout === ball.bet ? 'push' : 'loss';
        await settle(
          {
            betId: ball.betHandleId,
            userId: user.id,
            game: 'plinko',
            amount: ball.bet,
            placedAt: ball.spawnedAt,
          },
          {
            outcome,
            betAmount: ball.bet,
            payout: ball.payout,
            netChange: ball.payout - ball.bet,
            details: {
              risk: ball.risk,
              bin: ball.bin,
              multiplier: ball.multiplier,
              sessionId: snapshot.context.sessionId,
            },
          },
        );
        send({ type: 'BALL_LANDED', ballId });
      })();
    },
    [snapshot, user, settle, send, triggerFlash],
  );

  // Show EndScreen when auto session has ended (idle + autoStopReason set).
  const showEndScreen = snapshot.matches('idle') && snapshot.context.autoStopReason !== null;

  // Show SetupPanel when truly idle (no in-flight balls, no history, no end screen).
  const showSetup =
    snapshot.matches('idle') &&
    snapshot.context.inFlightBalls.length === 0 &&
    snapshot.context.history.length === 0 &&
    snapshot.context.autoStopReason === null;

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-felt-deep text-white">
      <main className="flex-1 overflow-auto p-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-base tracking-wider text-gold-bright">
            🔻 PLINKO
            {snapshot.context.mode === 'auto' && snapshot.matches('playing-auto')
              ? ` — ${snapshot.context.risk.toUpperCase()}`
              : ''}
          </h1>
          <span className="font-display text-xs text-white/60">
            Balance:{' '}
            <span className="text-gold-bright tabular-nums">{balance.toLocaleString()}</span>
          </span>
        </header>

        {showSetup && (
          <SetupPanel
            risk={pendingRisk}
            bet={pendingBet}
            mode={pendingMode}
            autoBalls={pendingAutoBalls}
            autoInterval={pendingAutoInterval}
            balance={balance}
            onRiskChange={setPendingRisk}
            onBetChange={setPendingBet}
            onModeChange={setPendingMode}
            onAutoBallsChange={setPendingAutoBalls}
            onAutoIntervalChange={setPendingAutoInterval}
            onDrop={() => void handleManualDrop()}
            onStartAuto={handleStartAuto}
          />
        )}

        {!showSetup && !showEndScreen && (
          <div className="flex gap-4">
            <div className="flex-1">
              <Board>
                {snapshot.context.inFlightBalls.map((ball) => (
                  <FallingBall
                    key={ball.ballId}
                    path={ball.path}
                    bin={ball.bin}
                    onLanded={() => handleBallLanded(ball.ballId)}
                  />
                ))}
              </Board>
              <BinRow risk={snapshot.context.risk || pendingRisk} flashedBinIdx={flashedBinIdx} />

              {snapshot.matches('playing-auto') && (
                <div className="mt-4">
                  <AutoDropControls
                    ballsSpawned={snapshot.context.autoBallsSpawned}
                    ballsRequested={snapshot.context.autoBallsRequested}
                    onStop={() => send({ type: 'AUTO_STOP', reason: 'user-stop' })}
                  />
                </div>
              )}

              {snapshot.matches('idle') && snapshot.context.inFlightBalls.length === 0 && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => send({ type: 'RESET' })}
                    className="px-4 py-2 rounded-md border border-gold/40 bg-felt-deep text-gold-bright text-xs hover:border-gold"
                  >
                    BACK TO SETUP
                  </button>
                </div>
              )}
            </div>
            <div className="w-32">
              <HistoryStrip history={snapshot.context.history} />
            </div>
          </div>
        )}

        {showEndScreen && (
          <EndScreen
            reason={snapshot.context.autoStopReason!}
            entries={sessionEntries}
            onPlayMore={() => send({ type: 'RESET' })}
          />
        )}
      </main>
    </div>
  );
}
