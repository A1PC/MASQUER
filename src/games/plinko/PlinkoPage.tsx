import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMachine } from '@xstate/react';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import { useGameRound } from '@/games/_shared/useGameRound';
import LobbyButton from '@/games/_shared/LobbyButton';
import OddsInfoBox from '@/games/_shared/OddsInfoBox';
import RulesButton from '@/games/_shared/RulesButton';
import RulesModal from '@/games/_shared/RulesModal';
import { useSound } from '@/systems/sound/useSound';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
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
import { BIN_COUNT } from './geometry';
import { plinkoMachine } from './machine';
import SetupPanel from './SetupPanel';
import Board from './Board';
import FallingBall from './FallingBall';
import BinRow from './BinRow';
import HistoryStrip from './HistoryStrip';
import AutoDropControls from './AutoDropControls';
import EndScreen from './EndScreen';
import PlinkoRules from './PlinkoRules';

/** Generate a uint32 seed from crypto.getRandomValues (no Math.random). */
function cryptoSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]!;
}

/** Debounce window for `peg.ping` across all in-flight balls. Plan §A.7
 *  Step 3 — max ~33/sec ceiling so multi-ball auto mode doesn't drown the
 *  player in clicks. */
const PEG_PING_DEBOUNCE_MS = 30;

/** Manual-drop cooldown. Prevents stack-clicking visual chaos (spec §4.8). */
const MANUAL_COOLDOWN_MS = 150;

/** Edge-bin celebration cooldown — at most one celebration per ~1 second so
 *  multi-ball auto mode can't stack 5 coin-showers (spec §8). */
const CELEBRATION_DEBOUNCE_MS = 1000;

/** Stylable coin-shower particle for edge-bin celebrations. */
function CoinShower({ active }: { active: boolean }): JSX.Element | null {
  if (!active) return null;
  const particles = Array.from({ length: 20 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" data-coin-shower>
      {particles.map((i) => {
        const left = ((i * 53) % 100) + ((i % 3) * 4 - 4);
        const delay = (i % 7) * 0.05;
        return (
          <motion.span
            key={i}
            className="absolute h-2 w-2 rounded-full bg-gold-bright shadow-[0_0_5px_rgba(232,189,109,0.85)]"
            style={{ left: `${left}%`, top: '-2%' }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: ['0%', '120%'], opacity: [0, 1, 0] }}
            transition={{ duration: 1.8, delay, ease: 'easeIn' }}
          />
        );
      })}
    </div>
  );
}

export default function PlinkoPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const { placeBet, settle } = useGameRound('plinko');
  const [snapshot, send] = useMachine(plinkoMachine);
  const { play } = useSound();
  const reduceMotion = useEffectiveReducedMotion();

  // Setup panel local state
  const [pendingRisk, setPendingRisk] = useState<Risk>('low');
  const [pendingBet, setPendingBet] = useState<number>(50);
  const [pendingMode, setPendingMode] = useState<'manual' | 'auto'>('manual');
  const [pendingAutoBalls, setPendingAutoBalls] = useState<number>(10);
  const [pendingAutoInterval, setPendingAutoInterval] = useState<AutoIntervalKey>('normal');
  const [rulesOpen, setRulesOpen] = useState(false);

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

  // Sound: peg.ping debounce across ALL in-flight balls (one ref shared by
  // every FallingBall's onPegHit callback).
  const lastPegPingAtRef = useRef<number>(0);
  const handlePegHit = useCallback(() => {
    const now = performance.now();
    if (now - lastPegPingAtRef.current < PEG_PING_DEBOUNCE_MS) return;
    lastPegPingAtRef.current = now;
    play('peg.ping');
  }, [play]);

  // Manual-drop cooldown gate.
  const [manualCooldown, setManualCooldown] = useState(false);
  const cooldownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
    },
    [],
  );

  // Edge-bin celebration state (debounced; spec §8).
  const [celebrationActive, setCelebrationActive] = useState(false);
  const lastCelebrationAtRef = useRef<number>(0);
  const celebrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current);
    },
    [],
  );

  // Manual drop handler.
  const handleManualDrop = useCallback(async () => {
    if (!user) return;
    if (manualCooldown) return;
    setManualCooldown(true);
    if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
    cooldownTimeoutRef.current = setTimeout(() => setManualCooldown(false), MANUAL_COOLDOWN_MS);
    const result = await placeBet(pendingBet, { min: BET_MIN, max: BET_MAX });
    if (!result.ok) return;
    play('chip.place');
    play('ball.drop');
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
  }, [user, manualCooldown, placeBet, pendingBet, pendingRisk, send, play]);

  // Start-auto handler.
  const handleStartAuto = useCallback(() => {
    const sessionId = crypto.randomUUID();
    play('chip.place');
    send({
      type: 'START_AUTO',
      bet: pendingBet,
      risk: pendingRisk,
      ballsRequested: pendingAutoBalls,
      intervalMs: AUTO_INTERVAL_MS[pendingAutoInterval],
      sessionId,
    });
  }, [pendingBet, pendingRisk, pendingAutoBalls, pendingAutoInterval, send, play]);

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
        play('ball.drop');
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
  }, [snapshot, balance, user, placeBet, send, play]);

  // Ball-landed callback: settle wallet, send BALL_LANDED, trigger BinRow flash,
  // fire tier stinger, trigger edge-bin celebration when applicable.
  const handleBallLanded = useCallback(
    (ballId: string) => {
      void (async () => {
        const ball = snapshot.context.inFlightBalls.find((b) => b.ballId === ballId);
        if (!ball || !user) return;
        triggerFlash(ball.bin);
        const outcome = ball.payout > ball.bet ? 'win' : ball.payout === ball.bet ? 'push' : 'loss';

        // Tier stinger gated on payout/stake ratio (per spec §4.10).
        const ratio = ball.payout / ball.bet;
        if (outcome === 'win') {
          if (ratio >= 20) play('win.jackpot');
          else if (ratio >= 2) play('win.medium');
          else play('win.small');
        } else if (outcome === 'loss') {
          play('loss');
        }

        // Edge-bin celebration (debounced + reduced-motion respect).
        const isEdge = ball.bin === 0 || ball.bin === BIN_COUNT - 1;
        const isHighEdge = isEdge && ball.risk === 'high';
        if (isHighEdge) {
          const now = performance.now();
          if (now - lastCelebrationAtRef.current >= CELEBRATION_DEBOUNCE_MS) {
            lastCelebrationAtRef.current = now;
            if (!reduceMotion) {
              setCelebrationActive(true);
              if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current);
              celebrationTimeoutRef.current = setTimeout(() => setCelebrationActive(false), 2000);
            }
          }
        }

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
    [snapshot, user, settle, send, triggerFlash, play, reduceMotion],
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

  const inGame =
    snapshot.matches('playing-auto') ||
    snapshot.matches('playing-auto-stopping') ||
    snapshot.context.inFlightBalls.length > 0;
  const activeRisk = inGame ? snapshot.context.risk : pendingRisk;
  const subtitle = inGame
    ? `Risk: ${activeRisk.toUpperCase()}`
    : `Setup · ${pendingRisk.toUpperCase()}`;

  return (
    <div className="relative flex min-h-screen bg-felt-table text-ivory">
      {/* Top-left back button */}
      <div className="absolute left-4 top-4 z-20">
        <LobbyButton />
      </div>
      {/* Top-right odds info */}
      <div className="absolute right-4 top-4 z-20">
        <OddsInfoBox>
          <span className="tabular-nums">
            Safe ~{MULTIPLIER_CURVES.safe[0]}x &middot; Low ~{MULTIPLIER_CURVES.low[0]}x &middot;
            Medium ~{MULTIPLIER_CURVES.medium[0]}x &middot; High ~{MULTIPLIER_CURVES.high[0]}x
            (centre &lt; 1x)
          </span>
        </OddsInfoBox>
      </div>

      <main className="flex-1 overflow-hidden p-4 pt-16">
        <header className="mb-2 text-center">
          <h1 className="font-display text-2xl tracking-[0.18em] text-gold-bright">
            MASQUER &middot; Plinko
          </h1>
          <p
            className="mt-1 font-display text-[10px] uppercase tracking-[0.18em] text-ivory/55"
            data-plinko-subtitle
          >
            {subtitle}
          </p>
          <p className="mt-1 font-display text-[10px] uppercase tracking-[0.18em] text-ivory/55">
            Balance:{' '}
            <span className="text-gold-bright tabular-nums">{balance.toLocaleString()}</span>
          </p>
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
          <div className="relative">
            <motion.div
              animate={celebrationActive && !reduceMotion ? { x: [0, -2, 2, -1, 1, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              className="relative"
            >
              <Board>
                <CoinShower active={celebrationActive} />
                <AnimatePresence>
                  {snapshot.context.inFlightBalls.map((ball) => (
                    <FallingBall
                      key={ball.ballId}
                      path={ball.path}
                      bin={ball.bin}
                      onLanded={() => handleBallLanded(ball.ballId)}
                      onPegHit={handlePegHit}
                    />
                  ))}
                </AnimatePresence>
              </Board>
              <BinRow risk={activeRisk} flashedBinIdx={flashedBinIdx} />
            </motion.div>

            <div className="absolute right-0 top-0 w-32">
              <HistoryStrip history={snapshot.context.history} />
            </div>

            {snapshot.matches('playing-auto') && (
              <div className="mt-3">
                <AutoDropControls
                  ballsSpawned={snapshot.context.autoBallsSpawned}
                  ballsRequested={snapshot.context.autoBallsRequested}
                  onStop={() => send({ type: 'AUTO_STOP', reason: 'user-stop' })}
                />
              </div>
            )}

            {snapshot.matches('idle') && snapshot.context.inFlightBalls.length === 0 && (
              <div className="mt-3 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleManualDrop()}
                  disabled={manualCooldown || balance < pendingBet}
                  className={[
                    'rounded-md border-2 border-brass bg-velvet px-4 py-2 font-display text-xs tracking-[0.18em] text-ivory',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                    manualCooldown ? 'ring-1 ring-brass/40' : '',
                  ].join(' ')}
                  data-drop-button
                >
                  DROP ({pendingBet.toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={() => send({ type: 'RESET' })}
                  className="rounded-md border border-brass/40 bg-felt-table-deep px-4 py-2 font-display text-xs text-ivory hover:border-brass"
                >
                  BACK TO SETUP
                </button>
              </div>
            )}
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

      <RulesButton onClick={() => setRulesOpen(true)} />
      <RulesModal open={rulesOpen} title="MASQUER · Plinko" onClose={() => setRulesOpen(false)}>
        <PlinkoRules />
      </RulesModal>
    </div>
  );
}
