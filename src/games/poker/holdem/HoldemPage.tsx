import type { JSX } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { useReducedMotion } from 'framer-motion';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import { useGameRound } from '@/games/_shared/useGameRound';
import type { BetHandle } from '@/systems/wallet';
import type { Archetype } from '../_shared/ai/archetypes';
import { decide } from '../_shared/ai/decide';
import { holdemMachine, type MachineInput, type PokerContext } from './machine';
import SetupPanel from './SetupPanel';
import PokerTable from './PokerTable';

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

const ARCHETYPE_NAMES: Record<Archetype, string> = {
  rock: 'Rock',
  station: 'Station',
  maniac: 'Maniac',
  shark: 'Shark',
};

function buildMachineInput(
  sessionId: string,
  buyIn: number,
  tableSize: number,
  stakes: { sb: number; bb: number },
  rng: () => number,
): MachineInput {
  const aiArchetypes = Array.from({ length: tableSize - 1 }, (_, i) => {
    const archetype = pickArchetype(rng);
    const name = `${ARCHETYPE_NAMES[archetype]} ${i + 1}`;
    const stack = stakes.bb * 80;
    return { archetype, name, stack };
  });
  return { sessionId, buyIn, tableSize, stakes, aiArchetypes };
}

function makeSessionId(): string {
  return `poker-${Date.now()}-${Math.floor(mulberry32(stringSeed(String(Date.now())))() * 1_000_000)}`;
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
  const reduce = useReducedMotion();
  const rngRef = useRef(session.rng);
  const handleRef = useRef(session.handle);
  const settledRef = useRef(false);

  const [snapshot, send] = useMachine(holdemMachine, { input: session.input });
  const startedRef = useRef(false);

  // ── Initial START_HAND ─────────────────────────────────────────────────────
  useEffect(() => {
    if (startedRef.current) return;
    if (!snapshot.matches('idle')) return;
    startedRef.current = true;
    send({ type: 'START_HAND' });
  }, [snapshot, send]);

  // ── Auto-next-hand after idle (post hand_complete) ────────────────────────
  useEffect(() => {
    if (!startedRef.current) return;
    if (!snapshot.matches('idle')) return;
    if (snapshot.context.handsPlayed === 0) return;

    const t = setTimeout(() => {
      for (const seat of snapshot.context.seats) {
        if (seat.seatId !== 0 && seat.status === 'busted') {
          const rng = rngRef.current;
          const archetype = pickArchetype(rng);
          const name = `${ARCHETYPE_NAMES[archetype]} ${seat.seatId}`;
          const stack = snapshot.context.stakes.bb * 80;
          send({ type: 'RESEAT_AI', seatId: seat.seatId, archetype, name, stack });
        }
      }
      send({ type: 'START_HAND' });
    }, 1_200);
    return () => clearTimeout(t);
  }, [snapshot, send]);

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

  // ── Betting actions ───────────────────────────────────────────────────────
  const handleFold = useCallback(() => send({ type: 'PLAYER_ACTION', action: 'fold' }), [send]);
  const handleCheck = useCallback(() => send({ type: 'PLAYER_ACTION', action: 'check' }), [send]);
  const handleCall = useCallback(() => send({ type: 'PLAYER_ACTION', action: 'call' }), [send]);
  const handleRaise = useCallback(
    (amount: number) => send({ type: 'PLAYER_RAISE', amount }),
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
        send({ type: 'REBUY', amount });
      })();
    },
    [placeBet, send],
  );

  // ── bust_prompt ───────────────────────────────────────────────────────────
  if (snapshot.matches('bust_prompt')) {
    const ctx = snapshot.context;
    const rebuyAmount = ctx.stakes.bb * 40;
    const canRebuy = (balance ?? 0) >= rebuyAmount;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-felt-deep text-white">
        <h2 className="font-display text-xl tracking-widest text-casino-red">OUT OF CHIPS</h2>
        <p className="text-white/60">You busted. Rebuy to continue.</p>
        {canRebuy && (
          <button
            className="rounded bg-gold px-6 py-3 font-display text-sm tracking-widest text-felt-deep hover:bg-gold-bright"
            onClick={() => handleRebuy(rebuyAmount)}
            data-rebuy
          >
            REBUY {rebuyAmount.toLocaleString()}
          </button>
        )}
        <button
          className="rounded border border-casino-red/50 px-6 py-3 font-display text-sm tracking-widest text-casino-red hover:bg-casino-red/10"
          onClick={handleLeave}
          data-leave-bust
        >
          LEAVE TABLE
        </button>
      </div>
    );
  }

  // ── session_over (rendered briefly while settle resolves) ─────────────────
  if (snapshot.matches('session_over')) {
    const ctx = snapshot.context;
    const finalStack = ctx.seats.find((s) => s.seatId === 0)?.stack ?? 0;
    const net = finalStack - ctx.totalBoughtIn;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-felt-deep text-white">
        <h2 className="font-display text-2xl tracking-widest text-gold-bright" data-session-over>
          SESSION OVER
        </h2>
        <div className="flex flex-col items-center gap-2">
          <span className="text-white/60">Hands played: {ctx.handsPlayed}</span>
          <span className="text-white/60">Bought in: {ctx.totalBoughtIn.toLocaleString()}</span>
          <span className="text-white/60">Final stack: {finalStack.toLocaleString()}</span>
          <span
            className={`font-mono text-xl font-bold ${net >= 0 ? 'text-chip-win' : 'text-casino-red'}`}
          >
            {net >= 0 ? '+' : ''}
            {net.toLocaleString()}
          </span>
        </div>
        <button
          className="rounded bg-gold px-6 py-3 font-display text-sm tracking-widest text-felt-deep hover:bg-gold-bright"
          onClick={onReset}
          data-play-again
        >
          PLAY AGAIN
        </button>
      </div>
    );
  }

  // ── Playing ───────────────────────────────────────────────────────────────
  const stateValue = typeof snapshot.value === 'string' ? snapshot.value : 'idle';
  return (
    <PokerTable
      ctx={snapshot.context}
      stateValue={stateValue}
      onFold={handleFold}
      onCheck={handleCheck}
      onCall={handleCall}
      onRaise={handleRaise}
      onLeave={handleLeave}
    />
  );
}

// ── Top-level page: manages session lifecycle ─────────────────────────────────

export default function HoldemPage(): JSX.Element {
  const user = useCurrentUser();
  const balance = useBalance();
  const { placeBet } = useGameRound('poker');

  const [session, setSession] = useState<SessionState | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

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

  if (!user) return <div />;

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-felt-deep text-white">
        <SetupPanel balance={balance} onSitDown={handleSitDown} />
      </div>
    );
  }

  return (
    <HoldemSession
      key={`${session.input.sessionId}-${sessionKey}`}
      session={session}
      onSessionOver={handleSessionOver}
      onReset={handleReset}
    />
  );
}
