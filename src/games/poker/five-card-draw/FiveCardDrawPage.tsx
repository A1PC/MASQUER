import type { JSX } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import { useGameRound } from '@/games/_shared/useGameRound';
import LobbyButton from '@/games/_shared/LobbyButton';
import RulesButton from '@/games/_shared/RulesButton';
import { Button } from '@/components/ui';
import { useSound } from '@/systems/sound/useSound';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import type { BetHandle } from '@/systems/wallet';
import { decide } from '../_shared/ai/decide';
import { decideDiscard } from '../_shared/ai/decideDiscard';
import { assignMaskName } from '../_shared/maskNames';
import PokerOddsHeader from '../_shared/PokerOddsHeader';
import PokerRulesModal from '../_shared/PokerRulesModal';
import {
  mulberry32,
  stringSeed,
  pickArchetype,
  buildMachineInput,
  makeSessionId,
  pickWinTier,
} from '../_shared/sessionBootstrap';
import { drawMachine, type DrawContext, type MachineInput } from './machine';
import { STAKES } from '../holdem/stakesConfig';
import type { StakesTier } from '../holdem/stakesConfig';
import DrawTable from './DrawTable';
import type { WinTier } from '../holdem/ShowdownReveal';

interface SitDownConfig {
  tableSize: number;
  stakes: { sb: number; bb: number };
  buyIn: number;
}

interface SessionState {
  input: MachineInput;
  handle: BetHandle;
  rng: () => number;
}

// ── Inner component: mounts only when seated; recreated per session via key ──

interface DrawSessionProps {
  session: SessionState;
  onSessionOver: () => void;
  onReset: () => void;
}

function DrawSession({ session, onSessionOver, onReset }: DrawSessionProps): JSX.Element {
  const { placeBet, settle } = useGameRound('poker');
  const balance = useBalance();
  const reduce = useEffectiveReducedMotion();
  const { play } = useSound();
  const rngRef = useRef(session.rng);
  const handleRef = useRef(session.handle);
  const settledRef = useRef(false);

  const [snapshot, send] = useMachine(drawMachine, { input: session.input });
  const startedRef = useRef(false);

  // Reveal-complete gate for auto-next-hand. Reset on every new hand_complete.
  const [revealComplete, setRevealComplete] = useState(false);
  const lastHandNumberRef = useRef<number>(snapshot.context.handNumber);
  const playerStartStackRef = useRef<number>(session.input.buyIn);

  // Between-hands grace period — gives the player 15s to read the table and
  // leave before the next hand auto-deals. Banner with the outcome shows for
  // the first 3s then fades, leaving the leave-vs-deal-now controls.
  const LEAVE_GRACE_MS = 15_000;
  const OUTCOME_BANNER_MS = 3_000;
  const [graceRemainingMs, setGraceRemainingMs] = useState<number | null>(null);
  const [outcomeBannerVisible, setOutcomeBannerVisible] = useState(false);

  // Prior-state tracking for sound transitions.
  const prevStateValueRef = useRef<string>('idle');

  // ── Initial START_HAND ─────────────────────────────────────────────────────
  useEffect(() => {
    if (startedRef.current) return;
    if (!snapshot.matches('idle')) return;
    startedRef.current = true;
    send({ type: 'START_HAND' });
  }, [snapshot, send]);

  // ── Reset reveal-complete gate at the start of every new hand ─────────────
  useEffect(() => {
    if (snapshot.context.handNumber !== lastHandNumberRef.current) {
      lastHandNumberRef.current = snapshot.context.handNumber;
      setRevealComplete(false);
      setGraceRemainingMs(null);
      setOutcomeBannerVisible(false);
      // Capture player's stack at hand start to compute win-tier on completion.
      const playerSeat = snapshot.context.seats.find((s) => s.seatId === 0);
      if (playerSeat) {
        playerStartStackRef.current = playerSeat.stack + playerSeat.committedThisHand;
      }
    }
  }, [snapshot.context.handNumber, snapshot.context.seats]);

  // ── 3s outcome banner ────────────────────────────────────────────────────
  useEffect(() => {
    if (!outcomeBannerVisible) return;
    const t = setTimeout(() => setOutcomeBannerVisible(false), OUTCOME_BANNER_MS);
    return () => clearTimeout(t);
  }, [outcomeBannerVisible, OUTCOME_BANNER_MS]);

  // ── Fallback grace-period trigger ───────────────────────────────────────
  // ShowdownReveal only mounts while the machine is `showdown` or
  // `hand_complete`. Hand completion in Draw funnels through `hand_complete`
  // (which `always` → `idle`) the same as Hold'em, so uncontested wins (fold
  // outs) may never mount the reveal component → its `onRevealComplete` never
  // fires → grace never starts. This effect kicks the grace period once the
  // machine settles into `idle` post-hand. If ShowdownReveal does mount and
  // fire first, the `revealComplete` guard makes this a no-op.
  useEffect(() => {
    if (revealComplete) return;
    if (!startedRef.current) return;
    if (!snapshot.matches('idle')) return;
    if (snapshot.context.handsPlayed === 0) return;
    if (!snapshot.context.handResult) return;
    const t = setTimeout(() => {
      setRevealComplete(true);
      setGraceRemainingMs(LEAVE_GRACE_MS);
      setOutcomeBannerVisible(true);
    }, 100);
    return () => clearTimeout(t);
  }, [snapshot, revealComplete, LEAVE_GRACE_MS]);

  // ── Between-hands countdown tick ─────────────────────────────────────────
  useEffect(() => {
    if (graceRemainingMs === null) return;
    if (graceRemainingMs <= 0) return;
    const t = setTimeout(() => {
      setGraceRemainingMs((ms) => (ms === null ? null : Math.max(0, ms - 1000)));
    }, 1000);
    return () => clearTimeout(t);
  }, [graceRemainingMs]);

  // ── Auto-next-hand after idle (post hand_complete) — gated on revealComplete
  //     AND the 15s leave-grace countdown reaching 0
  useEffect(() => {
    if (!startedRef.current) return;
    if (!snapshot.matches('idle')) return;
    if (snapshot.context.handsPlayed === 0) return;
    if (!revealComplete) return;
    if (graceRemainingMs === null || graceRemainingMs > 0) return;

    for (const seat of snapshot.context.seats) {
      if (seat.seatId !== 0 && seat.status === 'busted') {
        const rng = rngRef.current;
        const archetype = pickArchetype(rng);
        // Assign a fresh single mask name for the reseat.
        const [name] = assignMaskName(rng, 2);
        const stack = snapshot.context.stakes.bb * 80;
        send({ type: 'RESEAT_AI', seatId: seat.seatId, archetype, name: name ?? 'Bauta', stack });
      }
    }
    send({ type: 'START_HAND' });
    // Reset the grace gate via a microtask so the state update lands outside
    // the effect body (per react-hooks/set-state-in-effect). The handNumber
    // reset-effect will also clear graceRemainingMs once the new hand starts;
    // this guards against re-firing in the gap before that effect runs.
    const t = setTimeout(() => setGraceRemainingMs(null), 0);
    return () => clearTimeout(t);
  }, [snapshot, send, revealComplete, graceRemainingMs]);

  // ── AI betting driver ─────────────────────────────────────────────────────
  useEffect(() => {
    const sv = snapshot.value as string;
    if (sv !== 'bet_predraw' && sv !== 'bet_postdraw') return;

    const { toActSeat, seats, street, pot, currentBet, minRaise } = snapshot.context;
    if (toActSeat === 0) return;

    const seat = seats.find((s) => s.seatId === toActSeat);
    if (!seat || seat.occupant === 'you') return;
    if (seat.status !== 'active') return;

    const toCall = Math.max(0, currentBet - seat.committedThisStreet);

    const activeSeatIds = seats
      .filter((s) => s.status === 'active' || s.status === 'all-in')
      .map((s) => s.seatId);
    const numActivePlayers = activeSeatIds.length;
    const posIdx = activeSeatIds.indexOf(toActSeat);
    const position: 'early' | 'late' | 'blinds' =
      posIdx < activeSeatIds.length / 3
        ? 'early'
        : posIdx > (activeSeatIds.length * 2) / 3
          ? 'late'
          : 'blinds';

    const rng = rngRef.current;

    // CRITICAL: Use street:'flop' + board:[] so decide() uses postflopStrength(evaluateBest5(...))
    // on the full 5-card hand instead of the 2-card preflopStrength path (spec §5).
    void street; // street context not used for decision — always treat as postflop
    const decision = decide({
      holeCards: seat.holeCards,
      board: [],
      street: 'flop',
      potSize: pot,
      toCall,
      minRaise,
      stack: seat.stack,
      position,
      numActivePlayers,
      archetype: seat.occupant.archetype,
      rng,
    });

    const thinkingMs = reduce ? 0 : 600 + Math.floor(rng() * 600);
    const t = setTimeout(() => {
      send({ type: 'AI_ACTION', seatId: toActSeat, decision });
    }, thinkingMs);
    return () => clearTimeout(t);
  }, [snapshot, send, reduce]);

  // ── AI draw driver ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!snapshot.matches('drawing')) return;

    const { toActSeat, seats } = snapshot.context;
    if (toActSeat === 0) return;

    const seat = seats.find((s) => s.seatId === toActSeat);
    if (!seat || seat.occupant === 'you') return;
    if (seat.hasDrawn) return;
    if (seat.status !== 'active' && seat.status !== 'all-in') return;

    const rng = rngRef.current;
    const indices = decideDiscard(seat.holeCards, seat.occupant.archetype, rng);

    const thinkingMs = reduce ? 0 : 400 + Math.floor(rng() * 400);
    const t = setTimeout(() => {
      send({ type: 'AI_DISCARD', seatId: toActSeat, indices });
    }, thinkingMs);
    return () => clearTimeout(t);
  }, [snapshot, send, reduce]);

  // ── Sound: state-transition driven (mirrors HoldemPage taxonomy) ──────────
  // Entering posting_blinds → SB + BB chip placements + initial 5-card deal
  // stagger (one card.deal per seat, capped ~12/sec so a 6-player table's
  // 30-card deal stays sane). Entering drawing → one card.deal per seat
  // 80ms apart. Entering hand_complete with player outcome → win.{tier} or
  // loss stinger.
  useEffect(() => {
    const stateValue = typeof snapshot.value === 'string' ? snapshot.value : 'idle';
    const prev = prevStateValueRef.current;

    if (stateValue === 'posting_blinds' && prev !== 'posting_blinds') {
      // SB then BB.
      play('chip.place');
      const tSb = setTimeout(() => play('chip.place'), 80);
      // Initial 5-card deal — one card.deal per active seat (5 cards each),
      // stagger ~80ms between seats to keep the audio under ~12/sec.
      const activeSeats = snapshot.context.seats.filter(
        (s) => s.status === 'active' || s.status === 'all-in',
      ).length;
      const timers: ReturnType<typeof setTimeout>[] = [];
      for (let i = 0; i < activeSeats; i += 1) {
        timers.push(setTimeout(() => play('card.deal'), 200 + i * 80));
      }
      prevStateValueRef.current = stateValue;
      return () => {
        clearTimeout(tSb);
        timers.forEach(clearTimeout);
      };
    }

    if (stateValue === 'drawing' && prev !== 'drawing') {
      // One card.deal per live seat that will draw, stagger 80ms.
      const liveSeats = snapshot.context.seats.filter(
        (s) => s.status === 'active' || s.status === 'all-in',
      ).length;
      const timers: ReturnType<typeof setTimeout>[] = [];
      for (let i = 0; i < liveSeats; i += 1) {
        timers.push(setTimeout(() => play('card.deal'), i * 80));
      }
      prevStateValueRef.current = stateValue;
      return () => timers.forEach(clearTimeout);
    }

    prevStateValueRef.current = stateValue;
    return undefined;
  }, [snapshot.value, play, snapshot]);

  // ── Settle helper ─────────────────────────────────────────────────────────
  const doSettle = useCallback(
    async (ctx: DrawContext) => {
      if (settledRef.current) return;
      settledRef.current = true;
      const finalStack = ctx.seats.find((s) => s.seatId === 0)?.stack ?? 0;
      const { totalBoughtIn } = ctx;
      const outcome =
        finalStack > totalBoughtIn ? 'win' : finalStack === totalBoughtIn ? 'push' : 'loss';
      await settle(handleRef.current, {
        outcome,
        betAmount: totalBoughtIn,
        payout: finalStack,
        netChange: finalStack - totalBoughtIn,
        details: {
          variant: 'five-card-draw',
          tableSize: ctx.tableSize,
          stakes: ctx.stakes,
          handsPlayed: ctx.handsPlayed,
          rebuys: ctx.rebuys,
          biggestPotWon: ctx.biggestPotWon,
          sessionId: ctx.sessionId,
        },
      });
    },
    [settle],
  );

  // ── Handle session_over ───────────────────────────────────────────────────
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

  // ── Betting actions ───────────────────────────────────────────────────────
  const handleFold = useCallback(() => {
    send({ type: 'PLAYER_ACTION', action: 'fold' });
  }, [send]);
  const handleCheck = useCallback(() => {
    send({ type: 'PLAYER_ACTION', action: 'check' });
  }, [send]);
  const handleCall = useCallback(() => {
    play('chip.place');
    send({ type: 'PLAYER_ACTION', action: 'call' });
  }, [play, send]);
  const handleRaise = useCallback(
    (amount: number) => {
      play('chip.place');
      send({ type: 'PLAYER_RAISE', amount });
    },
    [play, send],
  );
  const handleDraw = useCallback(
    (indices: number[]) => {
      send({ type: 'PLAYER_DISCARD', indices });
    },
    [send],
  );

  // ── LEAVE TABLE ───────────────────────────────────────────────────────────
  const handleLeave = useCallback(() => {
    void doSettle(snapshot.context).then(() => {
      send({ type: 'LEAVE_TABLE' });
    });
  }, [doSettle, snapshot.context, send]);

  // ── REBUY ────────────────────────────────────────────────────────────────
  const handleRebuy = useCallback(
    (amount: number) => {
      void (async () => {
        const result = await placeBet(amount, { min: amount, max: amount });
        if (!result.ok) return;
        play('chip.place');
        send({ type: 'REBUY', amount });
      })();
    },
    [placeBet, play, send],
  );

  // ── Showdown win-tier (player-side) ──────────────────────────────────────
  const playerSeat = snapshot.context.seats.find((s) => s.seatId === 0);
  const playerHandWonAmount = (() => {
    if (!snapshot.context.handResult || !playerSeat) return 0;
    const w = snapshot.context.handResult.winners.find((wn) => wn.seatId === 0);
    return w?.awarded ?? 0;
  })();
  const playerHandCommitted = playerSeat?.committedThisHand ?? 0;
  const winTier: WinTier = pickWinTier(playerHandWonAmount, playerHandCommitted);

  const handleRevealComplete = useCallback(() => {
    setRevealComplete(true);
    setGraceRemainingMs(LEAVE_GRACE_MS);
    setOutcomeBannerVisible(true);
  }, [LEAVE_GRACE_MS]);

  const handleDealNow = useCallback(() => {
    setGraceRemainingMs(0);
  }, []);

  // ── Win/loss stinger on hand_complete ────────────────────────────────────
  useEffect(() => {
    if (!outcomeBannerVisible) return;
    if (winTier === 'loss') {
      play('loss');
    } else {
      play(`win.${winTier}`);
    }
    // intentionally only re-fire when the banner toggles visible
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcomeBannerVisible]);

  // ── bust_prompt ───────────────────────────────────────────────────────────
  if (snapshot.matches('bust_prompt')) {
    const ctx = snapshot.context;
    const rebuyAmount = ctx.stakes.bb * 40;
    const canRebuy = (balance ?? 0) >= rebuyAmount;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 bg-felt-table text-ivory">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-brass/60 bg-velvet-deep p-8">
          <h2 className="font-display text-xl tracking-[0.18em] text-casino-red">OUT OF CHIPS</h2>
          <p className="text-ivory/85">You busted. Rebuy to continue.</p>
          {canRebuy && (
            <Button
              variant="primary"
              size="lg"
              className="rounded-md font-display tracking-[0.18em]"
              onClick={() => handleRebuy(rebuyAmount)}
              data-rebuy
            >
              REBUY {rebuyAmount.toLocaleString()}
            </Button>
          )}
          <Button
            variant="secondary"
            size="lg"
            className="rounded-md font-display tracking-[0.18em]"
            onClick={handleLeave}
            data-leave-bust
          >
            LEAVE TABLE
          </Button>
        </div>
      </div>
    );
  }

  // ── session_over (rendered briefly while settle resolves) ─────────────────
  if (snapshot.matches('session_over')) {
    const ctx = snapshot.context;
    const finalStack = ctx.seats.find((s) => s.seatId === 0)?.stack ?? 0;
    const net = finalStack - ctx.totalBoughtIn;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 bg-felt-table text-ivory">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-brass/60 bg-velvet-deep p-8">
          <h2
            className="font-display text-2xl tracking-[0.18em] text-gold-bright"
            data-session-over
          >
            SESSION OVER
          </h2>
          <div className="flex flex-col items-center gap-2">
            <span className="text-ivory/70">Hands played: {ctx.handsPlayed}</span>
            <span className="text-ivory/70">Bought in: {ctx.totalBoughtIn.toLocaleString()}</span>
            <span className="text-ivory/70">Final stack: {finalStack.toLocaleString()}</span>
            <span
              className={`font-numeral text-xl font-bold tabular-nums ${net >= 0 ? 'text-chip-win' : 'text-casino-red'}`}
              data-session-over-net
            >
              {net >= 0 ? '+' : ''}
              {net.toLocaleString()}
            </span>
          </div>
          <Button
            variant="primary"
            size="lg"
            className="rounded-md font-display tracking-[0.18em]"
            onClick={onReset}
            data-play-again
          >
            PLAY AGAIN
          </Button>
        </div>
      </div>
    );
  }

  // ── Playing ───────────────────────────────────────────────────────────────
  const stateValue = typeof snapshot.value === 'string' ? snapshot.value : 'idle';
  const inGracePeriod = graceRemainingMs !== null && graceRemainingMs > 0;
  const isPlayerWin = winTier !== 'loss' && playerHandWonAmount > 0;
  return (
    <div className="relative h-full">
      <DrawTable
        ctx={snapshot.context}
        stateValue={stateValue}
        winTier={winTier}
        onRevealComplete={handleRevealComplete}
        onFold={handleFold}
        onCheck={handleCheck}
        onCall={handleCall}
        onRaise={handleRaise}
        onDraw={handleDraw}
        onLeave={handleLeave}
      />
      {outcomeBannerVisible && (
        <div
          className="pointer-events-none absolute inset-x-0 top-24 z-40 flex justify-center"
          data-outcome-banner
        >
          <div
            className={[
              'rounded-lg border-2 px-10 py-5 text-center backdrop-blur-sm shadow-2xl',
              isPlayerWin
                ? 'border-gold-bright bg-velvet-deep/95 text-gold-bright'
                : 'border-casino-red bg-velvet-deep/95 text-casino-red',
            ].join(' ')}
            data-outcome-banner-tone={isPlayerWin ? 'win' : 'loss'}
          >
            <div className="font-display text-3xl tracking-[0.22em]">
              {isPlayerWin
                ? `YOU WIN +${playerHandWonAmount.toLocaleString()}`
                : 'BETTER LUCK NEXT HAND'}
            </div>
          </div>
        </div>
      )}
      {inGracePeriod && (
        <div
          className="absolute inset-x-0 bottom-6 z-30 flex justify-center"
          data-between-hands-bar
        >
          <div className="flex items-center gap-4 rounded-md border border-brass/60 bg-velvet-deep/95 px-6 py-3 shadow-xl">
            <span className="font-display text-xs tracking-[0.18em] text-ivory/70">
              Next hand in{' '}
              <span className="text-gold-bright tabular-nums" data-grace-seconds>
                {Math.ceil(graceRemainingMs / 1000)}s
              </span>
            </span>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleLeave}
              className="rounded-md font-display tracking-[0.18em]"
              data-leave-grace
            >
              LEAVE NOW
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDealNow}
              className="rounded-md font-display tracking-[0.18em] text-ivory"
              data-deal-now
            >
              DEAL NOW
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Draw SetupPanel wrapper (adds "FIVE-CARD DRAW" label) ────────────────────

interface DrawSetupPanelProps {
  balance: number | null;
  onSitDown: (config: SitDownConfig) => void;
}

function DrawSetupPanel({ balance, onSitDown }: DrawSetupPanelProps): JSX.Element {
  const [tableSize, setTableSize] = useState<2 | 3 | 4 | 5 | 6>(4);
  const [tier, setTier] = useState<StakesTier>('low');
  const [buyIn, setBuyIn] = useState(STAKES.low.defaultBuyIn);

  const stakesCfg = STAKES[tier];
  const effectiveBuyIn = Math.max(stakesCfg.minBuyIn, Math.min(stakesCfg.maxBuyIn, buyIn));
  const canSit = balance !== null && balance >= stakesCfg.minBuyIn;

  function handleTierChange(t: StakesTier) {
    setTier(t);
    setBuyIn(STAKES[t].defaultBuyIn);
  }

  function handleBuyInSlider(e: React.ChangeEvent<HTMLInputElement>) {
    setBuyIn(Math.round(Number(e.target.value)));
  }

  function handleSitDown() {
    onSitDown({
      tableSize,
      stakes: { sb: stakesCfg.sb, bb: stakesCfg.bb },
      buyIn: effectiveBuyIn,
    });
  }

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-lg border border-brass/60 bg-velvet-deep p-6"
      data-setup-panel
    >
      <h2 className="text-center font-display text-lg tracking-[0.18em] text-gold-bright">
        FIVE-CARD DRAW
      </h2>

      {/* Table size */}
      <div className="flex flex-col gap-2">
        <label className="font-display text-xs tracking-[0.18em] text-ivory/55">TABLE SIZE</label>
        <div className="flex gap-2" data-table-size-group>
          {([2, 3, 4, 5, 6] as const).map((n) => (
            <button
              key={n}
              className={[
                'flex-1 rounded py-2 font-display text-xs tracking-[0.18em]',
                tableSize === n
                  ? 'bg-gold text-felt-deep'
                  : 'border border-brass/40 text-ivory/85 hover:bg-velvet',
              ].join(' ')}
              onClick={() => setTableSize(n)}
              data-table-size={n}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Stakes tier */}
      <div className="flex flex-col gap-2">
        <label className="font-display text-xs tracking-[0.18em] text-ivory/55">STAKES</label>
        <div className="flex gap-2" data-stakes-group>
          {(['low', 'mid', 'high'] as StakesTier[]).map((t) => (
            <button
              key={t}
              className={[
                'flex-1 rounded py-2 font-display text-xs tracking-[0.18em]',
                tier === t
                  ? 'bg-gold text-felt-deep'
                  : 'border border-brass/40 text-ivory/85 hover:bg-velvet',
              ].join(' ')}
              onClick={() => handleTierChange(t)}
              data-stakes-tier={t}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <span className="text-center text-[11px] text-ivory/55">{stakesCfg.label}</span>
      </div>

      {/* Buy-in slider */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="font-display text-xs tracking-[0.18em] text-ivory/55">BUY-IN</label>
          <span className="font-mono text-sm tabular-nums text-gold-bright" data-buyin-amount>
            {effectiveBuyIn.toLocaleString()}
          </span>
        </div>
        <input
          type="range"
          min={stakesCfg.minBuyIn}
          max={stakesCfg.maxBuyIn}
          step={stakesCfg.bb}
          value={effectiveBuyIn}
          onChange={handleBuyInSlider}
          className="w-full accent-brass"
          data-buyin-slider
        />
        <div className="flex justify-between text-[10px] text-ivory/55">
          <span>{stakesCfg.minBuyIn.toLocaleString()}</span>
          <span>{stakesCfg.maxBuyIn.toLocaleString()}</span>
        </div>
      </div>

      {/* Balance display */}
      <div className="text-center text-[11px] text-ivory/55">
        Balance:{' '}
        <span className="font-mono tabular-nums text-gold-bright">
          {balance !== null ? balance.toLocaleString() : '—'}
        </span>
      </div>

      {/* SIT DOWN */}
      <button
        className="w-full rounded bg-gold py-3 font-display text-sm tracking-[0.18em] text-felt-deep
          hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canSit}
        onClick={handleSitDown}
        data-sit-down
      >
        SIT DOWN
      </button>

      {!canSit && balance !== null && (
        <p className="text-center text-[10px] text-casino-red" data-insufficient>
          Insufficient balance. Min buy-in: {stakesCfg.minBuyIn.toLocaleString()}
        </p>
      )}
    </div>
  );
}

// ── Top-level page: manages session lifecycle ─────────────────────────────────

export default function FiveCardDrawPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance();
  const { placeBet } = useGameRound('poker');

  const [session, setSession] = useState<SessionState | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);

  const handleSitDown = useCallback(
    (config: SitDownConfig) => {
      void (async () => {
        const result = await placeBet(config.buyIn, { min: config.buyIn, max: config.buyIn * 3 });
        if (!result.ok) return;

        const sessionId = makeSessionId('draw');
        const rng = mulberry32(stringSeed(sessionId));
        const input = buildMachineInput(
          sessionId,
          config.buyIn,
          config.tableSize,
          config.stakes,
          rng,
        );

        setSession({ input, handle: result.handle, rng });
      })();
    },
    [placeBet],
  );

  const handleSessionOver = useCallback(() => {
    // Session has ended and been settled — show session over view
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
        <PokerOddsHeader variant="five-card-draw" />
      </div>

      <main className="flex flex-1 flex-col overflow-hidden p-3 pt-14">
        <header className="mb-2 text-center">
          <h1 className="font-display text-2xl tracking-[0.18em] text-gold-bright">
            MASQUER &middot; Five-Card Draw
          </h1>
          <p
            className="mt-1 font-display text-[10px] uppercase tracking-[0.18em] text-ivory/55"
            data-draw-subtitle
          >
            Five-Card Draw &middot; No-Limit &middot; Cash
          </p>
        </header>

        {!session ? (
          <div className="flex flex-1 items-center justify-center">
            <DrawSetupPanel balance={balance} onSitDown={handleSitDown} />
          </div>
        ) : (
          <DrawSession
            key={`${session.input.sessionId}-${sessionKey}`}
            session={session}
            onSessionOver={handleSessionOver}
            onReset={handleReset}
          />
        )}
      </main>

      <RulesButton onClick={() => setRulesOpen(true)} />
      <PokerRulesModal
        open={rulesOpen}
        variant="five-card-draw"
        onClose={() => setRulesOpen(false)}
      />
    </div>
  );
}
