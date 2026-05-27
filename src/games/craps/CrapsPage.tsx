import type { JSX } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import { useGameRound } from '@/games/_shared/useGameRound';
import LobbyButton from '@/games/_shared/LobbyButton';
import RulesButton from '@/games/_shared/RulesButton';
import { useSound } from '@/systems/sound/useSound';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import type { BetHandle } from '@/systems/wallet';
import { crapsMachine, type CrapsContext, type MachineInput } from './machine';
import type { Phase } from './bets';
import { BET_TYPES } from './bets';
import { CRAPS_STAKES, type StakesTier } from './stakes';
import { rollDice, rngFromSeed } from './dice';
import SetupPanel from './SetupPanel';
import CrapsTable, { type FlashMap } from './CrapsTable';
import ChipTray from './ChipTray';
import SessionBar from './SessionBar';
import CrapsOddsHeader from './CrapsOddsHeader';
import CrapsRulesModal from './CrapsRulesModal';
import LeaveConfirmModal from './LeaveConfirmModal';

// ── Constants ───────────────────────────────────────────────────────────────

const FLASH_WIN_MS = 2_000;
const FLASH_LOSS_MS = 1_500;
const OUTCOME_BANNER_MS = 3_000;
const BANNER_DEBOUNCE_MS = 1_000;
const JACKPOT_RATIO = 20;

type BannerKind = 'point-made' | 'seven-out' | 'jackpot' | 'natural-streak';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeSessionId(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return `craps-${Date.now()}-${buf[0]!}`;
}

/** Win-tier classification per spec §4.5 — drives `win.small/medium/jackpot`. */
function pickWinTier(net: number, committed: number): 'small' | 'medium' | 'jackpot' {
  const ratio = net / Math.max(1, committed);
  if (ratio >= 20) return 'jackpot';
  if (ratio >= 2) return 'medium';
  return 'small';
}

/** Banner copy keyed by kind + optional payout amount. */
function bannerCopy(kind: BannerKind, amount: number): string {
  switch (kind) {
    case 'point-made':
      return amount > 0 ? `POINT MADE +${amount.toLocaleString()}` : 'POINT MADE';
    case 'seven-out':
      return 'SEVEN OUT';
    case 'jackpot':
      return `JACKPOT +${amount.toLocaleString()}`;
    case 'natural-streak':
      return amount > 0 ? `ON A ROLL +${amount.toLocaleString()}` : 'ON A ROLL';
  }
}

interface SessionState {
  input: MachineInput;
  handle: BetHandle;
}

// ── Inner session component ─────────────────────────────────────────────────

interface CrapsSessionProps {
  session: SessionState;
  onSessionOver: () => void;
  onReset: () => void;
}

function CrapsSession({ session, onSessionOver, onReset }: CrapsSessionProps): JSX.Element {
  const { settle } = useGameRound('craps');
  const settledRef = useRef(false);
  const handleRef = useRef(session.handle);
  // `reduce` is read for future motion-gated polish (banner crossfade etc.);
  // referenced via void to satisfy `no-unused-vars` without disabling the rule.
  const reduce = useEffectiveReducedMotion();
  void reduce;
  const { play } = useSound();

  const [snapshot, send] = useMachine(crapsMachine, { input: session.input });
  const ctx = snapshot.context;

  // Chip denomination state.
  const [selectedChip, setSelectedChip] = useState<number>(ctx.stakes.chips[0] ?? 10);

  // ── Hybrid feedback state ────────────────────────────────────────────────
  const [flashMap, setFlashMap] = useState<FlashMap>({});
  const [outcomeBanner, setOutcomeBanner] = useState<{ kind: BannerKind; amount: number } | null>(
    null,
  );
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  // Banner debounce + transition refs. Initialized to -Infinity so the first
  // banner always fires regardless of `performance.now()` clock origin.
  const lastBannerAtRef = useRef<number>(Number.NEGATIVE_INFINITY);
  const prevPhaseRef = useRef<Phase>(ctx.phase);
  const prevPointRef = useRef<number | null>(ctx.point);
  const prevRollNumberRef = useRef<number>(ctx.rollNumber);
  const naturalStreakRef = useRef<number>(0);

  // Per-bet-type wagering tracker — written into details.betTypeWagered on settle.
  const betTypeWageredRef = useRef<Record<string, number>>({});

  // ── Settle helper ────────────────────────────────────────────────────────
  const doSettle = useCallback(
    async (context: CrapsContext) => {
      if (settledRef.current) return;
      settledRef.current = true;
      const { bankroll, totalBoughtIn } = context;
      const outcome =
        bankroll > totalBoughtIn ? 'win' : bankroll === totalBoughtIn ? 'push' : 'loss';
      await settle(handleRef.current, {
        outcome,
        betAmount: totalBoughtIn,
        payout: bankroll,
        netChange: bankroll - totalBoughtIn,
        details: {
          tier: context.stakes.tier,
          rollsPlayed: context.rollsPlayed,
          rebuys: context.rebuys,
          biggestRollWin: context.biggestWin,
          sessionId: context.sessionId,
          // NEW additive field — see spec §7. Old pre-PR-A sessions lack
          // this; the future /admin/craps page handles undefined gracefully.
          betTypeWagered: { ...betTypeWageredRef.current },
        },
      });
    },
    [settle],
  );

  // ── Handle session_over from machine ─────────────────────────────────────
  useEffect(() => {
    if (!snapshot.matches('session_over')) return;
    void doSettle(snapshot.context).then(() => {
      onSessionOver();
    });
  }, [snapshot, doSettle, onSessionOver]);

  // ── beforeunload best-effort settle ──────────────────────────────────────
  useEffect(() => {
    function handleUnload() {
      if (settledRef.current) return;
      void doSettle(snapshot.context);
    }
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [snapshot, doSettle]);

  // ── Roll-resolution → flash + banner + win/loss stinger ──────────────────
  // State updates land via a 0ms setTimeout to keep React's
  // `react-hooks/set-state-in-effect` rule happy (same pattern as
  // HoldemPage's grace-period reset).
  useEffect(() => {
    if (ctx.rollNumber === prevRollNumberRef.current) return;
    prevRollNumberRef.current = ctx.rollNumber;
    if (!ctx.lastRoll || !ctx.lastResolution) return;

    // Build flash map + tally player net.
    const newFlashes: FlashMap = {};
    let playerNet = 0;
    let playerCommitted = 0;
    for (const { bet, outcome } of ctx.lastResolution.perBet) {
      playerCommitted += bet.amount;
      if (outcome.kind === 'win') {
        const betType = BET_TYPES[bet.betId];
        const winnings =
          outcome.winnings ??
          (outcome.multiplier !== undefined
            ? bet.amount * outcome.multiplier
            : (betType?.payout(bet.amount, bet.betPoint) ?? 0));
        if (winnings > 0) {
          newFlashes[bet.betId] = { tone: 'win', payout: winnings };
          playerNet += winnings;
        }
      } else if (outcome.kind === 'lose') {
        newFlashes[bet.betId] = { tone: 'loss', payout: 0 };
        playerNet -= bet.amount;
      }
      // push / standing / move → no flash (bet stays on the table silently).
    }

    // Sound: win tier stinger or loss sting (side-effect — safe in effect body).
    if (playerNet > 0) {
      const tier = pickWinTier(playerNet, playerCommitted);
      play(`win.${tier}`);
    } else if (playerNet < 0) {
      play('loss');
    }

    // ── Big-event banner detection ────────────────────────────────────────
    const prevPhase = prevPhaseRef.current;
    const prevPoint = prevPointRef.current;
    const rollTotal = ctx.lastRoll.total;
    let bannerKind: BannerKind | null = null;
    let bannerAmount = 0;

    // POINT MADE: previous phase was 'point' and we just transitioned back to
    // 'come-out' on a roll equal to the previous point.
    if (prevPhase === 'point' && ctx.phase === 'come-out' && rollTotal === prevPoint) {
      bannerKind = 'point-made';
      bannerAmount = playerNet > 0 ? playerNet : 0;
    }
    // SEVEN-OUT: previous phase was 'point' and we just transitioned back to
    // 'come-out' on a 7 (i.e. NOT a point made — they're disjoint since point
    // is one of 4,5,6,8,9,10).
    else if (prevPhase === 'point' && ctx.phase === 'come-out' && rollTotal === 7) {
      bannerKind = 'seven-out';
    }
    // JACKPOT: any roll where player single-roll net ≥ 20× committed.
    if (
      !bannerKind &&
      playerNet > 0 &&
      playerCommitted > 0 &&
      playerNet / playerCommitted >= JACKPOT_RATIO
    ) {
      bannerKind = 'jackpot';
      bannerAmount = playerNet;
    }
    // NATURAL STREAK: two come-out 7/11s in a row.
    if (
      prevPhase === 'come-out' &&
      ctx.phase === 'come-out' &&
      (rollTotal === 7 || rollTotal === 11)
    ) {
      naturalStreakRef.current += 1;
      if (naturalStreakRef.current >= 2 && !bannerKind) {
        bannerKind = 'natural-streak';
        bannerAmount = playerNet > 0 ? playerNet : 0;
      }
    } else if (ctx.phase === 'point' || rollTotal === 2 || rollTotal === 3 || rollTotal === 12) {
      naturalStreakRef.current = 0;
    }

    prevPhaseRef.current = ctx.phase;
    prevPointRef.current = ctx.point;

    // Defer state updates to a microtask so we land outside the effect body.
    const now = performance.now();
    const shouldFireBanner =
      bannerKind !== null && now - lastBannerAtRef.current >= BANNER_DEBOUNCE_MS;
    if (shouldFireBanner) lastBannerAtRef.current = now;
    const t = setTimeout(() => {
      setFlashMap(newFlashes);
      if (shouldFireBanner && bannerKind) {
        setOutcomeBanner({ kind: bannerKind, amount: bannerAmount });
      }
    }, 0);
    return () => clearTimeout(t);
  }, [ctx.rollNumber, ctx.phase, ctx.point, ctx.lastRoll, ctx.lastResolution, play]);

  // ── Dice tumble sound — 2 staggered reel.stop per roll ───────────────────
  // Separate effect from the resolution effect so the sound fires even if the
  // resolution is empty (e.g. a roll with no active bets — rare but legal).
  const lastDiceSoundRollRef = useRef<number>(0);
  useEffect(() => {
    if (ctx.rollNumber === 0) return;
    if (ctx.rollNumber === lastDiceSoundRollRef.current) return;
    lastDiceSoundRollRef.current = ctx.rollNumber;
    const t1 = setTimeout(() => play('reel.stop'), 0);
    const t2 = setTimeout(() => play('reel.stop'), 80);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [ctx.rollNumber, play]);

  // ── Banner auto-dismiss after 3s ─────────────────────────────────────────
  useEffect(() => {
    if (!outcomeBanner) return;
    const t = setTimeout(() => setOutcomeBanner(null), OUTCOME_BANNER_MS);
    return () => clearTimeout(t);
  }, [outcomeBanner]);

  // ── Flash auto-clear — uses the longer of the two windows so loss flashes
  //     also fade out cleanly without leaving stale entries in the map.
  useEffect(() => {
    if (Object.keys(flashMap).length === 0) return;
    const t = setTimeout(() => setFlashMap({}), Math.max(FLASH_WIN_MS, FLASH_LOSS_MS) + 100);
    return () => clearTimeout(t);
  }, [flashMap]);

  // ── ROLL driver ──────────────────────────────────────────────────────────
  const handleRoll = useCallback(() => {
    const seed = `${ctx.sessionId}.${ctx.rollNumber}`;
    const rng = rngFromSeed(seed);
    const roll = rollDice(rng);
    send({ type: 'ROLL', roll });
  }, [ctx.sessionId, ctx.rollNumber, send]);

  // ── Place bet (tracks per-bet-type wagered for details.betTypeWagered) ──
  const handlePlace = useCallback(
    (betId: string, betPoint?: number) => {
      const event =
        betPoint !== undefined
          ? { type: 'PLACE_BET' as const, betId, amount: selectedChip, betPoint }
          : { type: 'PLACE_BET' as const, betId, amount: selectedChip };
      // Pre-check the guard so we only track + sound when the bet will land.
      // The machine's guard runs anyway; mirroring its conditions here keeps
      // the tracker accurate for rejected bets.
      const bt = BET_TYPES[betId];
      const willPlace =
        !!bt &&
        bt.canPlace(ctx.phase, { point: ctx.point }) &&
        selectedChip >= ctx.stakes.tableMin &&
        selectedChip <= ctx.stakes.tableMax &&
        ctx.bankroll >= selectedChip;
      send(event);
      if (willPlace) {
        play('chip.place');
        betTypeWageredRef.current[betId] = (betTypeWageredRef.current[betId] ?? 0) + selectedChip;
      }
    },
    [selectedChip, send, play, ctx.phase, ctx.point, ctx.bankroll, ctx.stakes],
  );

  // ── Remove bet ───────────────────────────────────────────────────────────
  const handleRemove = useCallback(
    (betId: string, betPoint?: number) => {
      const event =
        betPoint !== undefined
          ? { type: 'REMOVE_BET' as const, betId, betPoint }
          : { type: 'REMOVE_BET' as const, betId };
      send(event);
    },
    [send],
  );

  // ── LEAVE TABLE confirm flow ─────────────────────────────────────────────
  const handleLeaveClick = useCallback(() => setLeaveConfirmOpen(true), []);
  const handleLeaveCancel = useCallback(() => setLeaveConfirmOpen(false), []);
  const handleLeaveConfirm = useCallback(() => {
    setLeaveConfirmOpen(false);
    void doSettle(snapshot.context).then(() => {
      send({ type: 'LEAVE_TABLE' });
    });
  }, [doSettle, snapshot.context, send]);

  // ── session_over render ──────────────────────────────────────────────────
  if (snapshot.matches('session_over')) {
    const net = ctx.bankroll - ctx.totalBoughtIn;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 bg-felt-table text-ivory">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-brass/60 bg-velvet-deep p-8">
          <h2
            className="font-display text-2xl tracking-[0.18em] text-gold-bright"
            data-session-over
          >
            SESSION OVER
          </h2>
          <div className="flex flex-col items-center gap-2 text-[13px]">
            <span className="text-ivory/70">Rolls played: {ctx.rollsPlayed}</span>
            <span className="text-ivory/70">Bought in: {ctx.totalBoughtIn.toLocaleString()}</span>
            <span className="text-ivory/70">Final bankroll: {ctx.bankroll.toLocaleString()}</span>
            <span
              className={`font-mono text-xl font-bold ${net >= 0 ? 'text-chip-win' : 'text-casino-red'}`}
            >
              {net >= 0 ? '+' : ''}
              {net.toLocaleString()}
            </span>
          </div>
          <button
            className="rounded-md bg-gold px-6 py-3 font-display text-sm tracking-[0.18em] text-felt-deep hover:bg-gold-bright"
            onClick={onReset}
            data-play-again
          >
            PLAY AGAIN
          </button>
        </div>
      </div>
    );
  }

  const isAtTable = snapshot.matches('table');
  if (!isAtTable) {
    return (
      <div className="flex h-full items-center justify-center bg-felt-table text-ivory">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col gap-3 bg-felt-table p-3 text-ivory">
      <SessionBar
        bankroll={ctx.bankroll}
        totalBoughtIn={ctx.totalBoughtIn}
        rollsPlayed={ctx.rollsPlayed}
        canLeave={true}
        onLeave={handleLeaveClick}
      />
      <div className="mx-auto w-full max-w-3xl">
        <CrapsTable
          ctx={ctx}
          onPlace={handlePlace}
          onRemove={handleRemove}
          onRoll={handleRoll}
          canRoll={true}
          flashMap={flashMap}
        />
      </div>
      <div className="mx-auto w-full max-w-3xl">
        <ChipTray
          chips={ctx.stakes.chips}
          selected={selectedChip}
          bankroll={ctx.bankroll}
          onSelectChip={setSelectedChip}
        />
      </div>

      {outcomeBanner && (
        <div
          className="pointer-events-none absolute inset-x-0 top-24 z-40 flex justify-center"
          data-outcome-banner
        >
          <div
            className={[
              'rounded-lg border-2 px-10 py-5 text-center shadow-2xl backdrop-blur-sm',
              outcomeBanner.kind === 'seven-out'
                ? 'border-casino-red bg-velvet-deep/95 text-casino-red'
                : 'border-gold-bright bg-velvet-deep/95 text-gold-bright',
            ].join(' ')}
            data-outcome-banner-kind={outcomeBanner.kind}
          >
            <div className="font-display text-3xl tracking-[0.22em]">
              {bannerCopy(outcomeBanner.kind, outcomeBanner.amount)}
            </div>
          </div>
        </div>
      )}

      <LeaveConfirmModal
        open={leaveConfirmOpen}
        bankroll={ctx.bankroll}
        totalBoughtIn={ctx.totalBoughtIn}
        onCancel={handleLeaveCancel}
        onConfirm={handleLeaveConfirm}
      />
    </div>
  );
}

// ── Top-level page: manages session lifecycle ───────────────────────────────

export default function CrapsPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance();
  const { placeBet } = useGameRound('craps');

  const [session, setSession] = useState<SessionState | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);

  const handleSitDown = useCallback(
    ({ tier, buyIn }: { tier: StakesTier; buyIn: number }) => {
      void (async () => {
        const stakes = CRAPS_STAKES[tier];
        const result = await placeBet(buyIn, { min: stakes.buyInMin, max: stakes.buyInMax });
        if (!result.ok) return;

        const sessionId = makeSessionId();
        const input: MachineInput = { sessionId, buyIn, stakes };
        setSession({ input, handle: result.handle });
      })();
    },
    [placeBet],
  );

  const handleSessionOver = useCallback(() => {
    // session_over state is handled inside CrapsSession (renders the PLAY AGAIN screen).
  }, []);

  const handleReset = useCallback(() => {
    setSession(null);
    setSessionKey((k) => k + 1);
  }, []);

  if (!user) return null;

  return (
    <div className="relative flex h-full flex-col bg-felt-table text-ivory">
      {/* Top-left back button */}
      <div className="absolute left-4 top-4 z-20">
        <LobbyButton />
      </div>
      {/* Top-right odds info */}
      <div className="absolute right-4 top-4 z-20">
        <CrapsOddsHeader />
      </div>

      <main className="flex flex-1 flex-col overflow-hidden p-3 pt-14">
        <header className="mb-2 text-center">
          <h1 className="font-display text-2xl tracking-[0.18em] text-gold-bright">
            MASQUER · Craps
          </h1>
          <p
            className="mt-1 font-display text-[10px] uppercase tracking-[0.18em] text-ivory/55"
            data-craps-subtitle
          >
            Cash Table · Continuous Play · Two Dice
          </p>
        </header>

        {!session ? (
          <div className="flex flex-1 items-center justify-center">
            <SetupPanel balance={balance} onSitDown={handleSitDown} />
          </div>
        ) : (
          <CrapsSession
            key={`${session.input.sessionId}-${sessionKey}`}
            session={session}
            onSessionOver={handleSessionOver}
            onReset={handleReset}
          />
        )}
      </main>

      <RulesButton onClick={() => setRulesOpen(true)} />
      <CrapsRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}
