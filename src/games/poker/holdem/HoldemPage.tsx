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
import type { Archetype } from '../_shared/ai/archetypes';
import { decide } from '../_shared/ai/decide';
import { assignMaskName } from '../_shared/maskNames';
import PokerOddsHeader from '../_shared/PokerOddsHeader';
import PokerRulesModal from '../_shared/PokerRulesModal';
import { holdemMachine, type MachineInput, type PokerContext } from './machine';
import SetupPanel from './SetupPanel';
import PokerTable from './PokerTable';
import type { WinTier } from './ShowdownReveal';

// ── Seeded mulberry32 (same algo as deck.ts, but per-session) ────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function stringSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function pickArchetype(rng: () => number): Archetype {
  const archetypes: Archetype[] = ['rock', 'station', 'maniac', 'shark'];
  return archetypes[Math.floor(rng() * archetypes.length)]!;
}

function buildMachineInput(
  sessionId: string,
  buyIn: number,
  tableSize: number,
  stakes: { sb: number; bb: number },
  rng: () => number,
): MachineInput {
  // Mask names mask the archetype from the player — `decide()` still
  // gets the real archetype internally; the UI only ever sees the mask name.
  const maskNames = assignMaskName(rng, tableSize);
  const aiArchetypes = Array.from({ length: tableSize - 1 }, (_, i) => {
    const archetype = pickArchetype(rng);
    const name = maskNames[i]!;
    const stack = stakes.bb * 80;
    return { archetype, name, stack };
  });
  return { sessionId, buyIn, tableSize, stakes, aiArchetypes };
}

function makeSessionId(): string {
  const seedBuf = new Uint32Array(1);
  crypto.getRandomValues(seedBuf);
  return `poker-${Date.now()}-${seedBuf[0]!}`;
}

/** Win-tier classification per spec §4.4. */
function pickWinTier(wonAmount: number, committed: number): WinTier {
  if (wonAmount <= 0) return 'loss';
  const ratio = wonAmount / Math.max(1, committed);
  if (ratio >= 20) return 'jackpot';
  if (ratio >= 2) return 'medium';
  return 'small';
}

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

interface HoldemSessionProps {
  session: SessionState;
  onSessionOver: () => void;
  onReset: () => void;
}

function HoldemSession({ session, onSessionOver, onReset }: HoldemSessionProps): JSX.Element {
  const { placeBet, settle } = useGameRound('poker');
  const balance = useBalance();
  const reduce = useEffectiveReducedMotion();
  const { play } = useSound();
  const rngRef = useRef(session.rng);
  const handleRef = useRef(session.handle);
  const settledRef = useRef(false);

  const [snapshot, send] = useMachine(holdemMachine, { input: session.input });
  const startedRef = useRef(false);

  // Reveal-complete gate for auto-next-hand. Reset on every new hand_complete.
  const [revealComplete, setRevealComplete] = useState(false);
  const lastHandNumberRef = useRef<number>(snapshot.context.handNumber);
  const playerStartStackRef = useRef<number>(session.input.buyIn);

  // Prior-state tracking for sound transitions.
  const prevStateValueRef = useRef<string>('idle');
  const prevStreetRef = useRef<string>('preflop');

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
      // Capture player's stack at hand start to compute win-tier on completion.
      const playerSeat = snapshot.context.seats.find((s) => s.seatId === 0);
      if (playerSeat) {
        playerStartStackRef.current = playerSeat.stack + playerSeat.committedThisHand;
      }
    }
  }, [snapshot.context.handNumber, snapshot.context.seats]);

  // ── Auto-next-hand after idle (post hand_complete) — gated on revealComplete
  useEffect(() => {
    if (!startedRef.current) return;
    if (!snapshot.matches('idle')) return;
    if (snapshot.context.handsPlayed === 0) return;
    // Wait for the ShowdownReveal stagger to finish before queueing next hand.
    if (!revealComplete) return;

    const t = setTimeout(() => {
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
    }, 250); // Short tail-pause after the reveal completes.
    return () => clearTimeout(t);
  }, [snapshot, send, revealComplete]);

  // ── AI turn driver ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!snapshot.matches('betting')) return;
    const { toActSeat, seats, board, street, pot, currentBet, minRaise } = snapshot.context;
    if (toActSeat === 0) return;

    const seat = seats.find((s) => s.seatId === toActSeat);
    if (!seat || seat.occupant === 'you') return;
    if (seat.status !== 'active') return;

    const toCall = Math.max(0, currentBet - seat.committedThisStreet);
    const visibleBoard = (() => {
      if (street === 'preflop') return [];
      if (street === 'flop') return board.slice(0, 3);
      if (street === 'turn') return board.slice(0, 4);
      return board.slice(0, 5);
    })();

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
    const decision = decide({
      holeCards: seat.holeCards,
      board: visibleBoard,
      street,
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

  // ── Sound: chip.place on PLAYER_ACTION-driven state transitions ───────────
  // We watch the machine's state value and currentBet/street transitions and
  // map them to appropriate sounds. Simpler than instrumenting every event.
  useEffect(() => {
    const stateValue = typeof snapshot.value === 'string' ? snapshot.value : 'idle';
    const prev = prevStateValueRef.current;
    const prevStreet = prevStreetRef.current;
    const curStreet = snapshot.context.street;

    // Entering posting_blinds — SB + BB chip placements.
    if (stateValue === 'posting_blinds' && prev !== 'posting_blinds') {
      play('chip.place');
      // Second blind: small delay so they don't stack.
      const t = setTimeout(() => play('chip.place'), 80);
      const tCards = setTimeout(() => play('card.deal'), 200);
      prevStateValueRef.current = stateValue;
      prevStreetRef.current = curStreet;
      return () => {
        clearTimeout(t);
        clearTimeout(tCards);
      };
    }

    // Street advanced (flop/turn/river) — board card(s) dealt.
    if (stateValue === 'betting' && prev === 'advance_street' && curStreet !== prevStreet) {
      if (curStreet === 'flop') {
        // 3 staggered card.deal sounds.
        const timers: ReturnType<typeof setTimeout>[] = [];
        for (let i = 0; i < 3; i += 1) {
          timers.push(setTimeout(() => play('card.deal'), i * 120));
        }
        prevStateValueRef.current = stateValue;
        prevStreetRef.current = curStreet;
        return () => timers.forEach(clearTimeout);
      }
      play('card.deal');
    }

    prevStateValueRef.current = stateValue;
    prevStreetRef.current = curStreet;
    return undefined;
  }, [snapshot.value, snapshot.context.street, play, snapshot]);

  // ── Settle helper ─────────────────────────────────────────────────────────
  const doSettle = useCallback(
    async (ctx: PokerContext) => {
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
          variant: 'holdem',
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

  // ── Betting actions (fire chip.place for player commits) ──────────────────
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
    const w = snapshot.context.handResult.winners.find((w) => w.seatId === 0);
    return w?.awarded ?? 0;
  })();
  const playerHandCommitted = playerSeat?.committedThisHand ?? 0;
  const winTier: WinTier = pickWinTier(playerHandWonAmount, playerHandCommitted);

  const handleRevealComplete = useCallback(() => {
    setRevealComplete(true);
  }, []);

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
            <button
              className="rounded-md bg-gold px-6 py-3 font-display text-sm tracking-[0.18em] text-felt-deep hover:bg-gold-bright"
              onClick={() => handleRebuy(rebuyAmount)}
              data-rebuy
            >
              REBUY {rebuyAmount.toLocaleString()}
            </button>
          )}
          <button
            className="rounded-md border border-brass/60 px-6 py-3 font-display text-sm tracking-[0.18em] text-ivory hover:bg-velvet"
            onClick={handleLeave}
            data-leave-bust
          >
            LEAVE TABLE
          </button>
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

  // ── Playing ───────────────────────────────────────────────────────────────
  const stateValue = typeof snapshot.value === 'string' ? snapshot.value : 'idle';
  return (
    <PokerTable
      ctx={snapshot.context}
      stateValue={stateValue}
      winTier={winTier}
      onRevealComplete={handleRevealComplete}
      onFold={handleFold}
      onCheck={handleCheck}
      onCall={handleCall}
      onRaise={handleRaise}
      onLeave={handleLeave}
    />
  );
}

// ── Top-level page: manages session lifecycle ─────────────────────────────────

export default function HoldemPage(): JSX.Element | null {
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

        const sessionId = makeSessionId();
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
        <PokerOddsHeader variant="holdem" />
      </div>

      <main className="flex flex-1 flex-col overflow-hidden p-3 pt-14">
        <header className="mb-2 text-center">
          <h1 className="font-display text-2xl tracking-[0.18em] text-gold-bright">
            MASQUER &middot; Hold&apos;em
          </h1>
          <p
            className="mt-1 font-display text-[10px] uppercase tracking-[0.18em] text-ivory/55"
            data-holdem-subtitle
          >
            Texas &middot; No-Limit &middot; Cash
          </p>
        </header>

        {!session ? (
          <div className="flex flex-1 items-center justify-center">
            <SetupPanel balance={balance} onSitDown={handleSitDown} />
          </div>
        ) : (
          <HoldemSession
            key={`${session.input.sessionId}-${sessionKey}`}
            session={session}
            onSessionOver={handleSessionOver}
            onReset={handleReset}
          />
        )}
      </main>

      <RulesButton onClick={() => setRulesOpen(true)} />
      <PokerRulesModal open={rulesOpen} variant="holdem" onClose={() => setRulesOpen(false)} />
    </div>
  );
}
