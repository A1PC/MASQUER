import type { JSX } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import { useGameRound } from '@/games/_shared/useGameRound';
import type { BetHandle } from '@/systems/wallet';
import { crapsMachine, type CrapsContext, type MachineInput } from './machine';
import { CRAPS_STAKES, type StakesTier } from './stakes';
import { rollDice, rngFromSeed } from './dice';
import SetupPanel from './SetupPanel';
import CrapsTable from './CrapsTable';
import ChipTray from './ChipTray';
import SessionBar from './SessionBar';

// ── Session ID generator ────────────────────────────────────────────────────

function makeSessionId(): string {
  return `craps-${Date.now()}-${Math.floor(rngFromSeed(String(Date.now()))() * 1_000_000)}`;
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

  const [snapshot, send] = useMachine(crapsMachine, { input: session.input });
  const ctx = snapshot.context;

  // chip denomination state
  const [selectedChip, setSelectedChip] = useState<number>(ctx.stakes.chips[0] ?? 10);

  // ── Settle helper ──────────────────────────────────────────────────────────
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
          biggestWin: context.biggestWin,
          sessionId: context.sessionId,
        },
      });
    },
    [settle],
  );

  // ── Handle session_over from machine ────────────────────────────────────────
  useEffect(() => {
    if (!snapshot.matches('session_over')) return;
    void doSettle(snapshot.context).then(() => {
      onSessionOver();
    });
  }, [snapshot, doSettle, onSessionOver]);

  // ── beforeunload best-effort settle ────────────────────────────────────────
  useEffect(() => {
    function handleUnload() {
      if (settledRef.current) return;
      void doSettle(snapshot.context);
    }
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [snapshot, doSettle]);

  // ── ROLL driver ─────────────────────────────────────────────────────────────
  const handleRoll = useCallback(() => {
    const seed = `${ctx.sessionId}.${ctx.rollNumber}`;
    const rng = rngFromSeed(seed);
    const roll = rollDice(rng);
    send({ type: 'ROLL', roll });
  }, [ctx.sessionId, ctx.rollNumber, send]);

  // ── Place bet ────────────────────────────────────────────────────────────────
  const handlePlace = useCallback(
    (betId: string, betPoint?: number) => {
      const event =
        betPoint !== undefined
          ? { type: 'PLACE_BET' as const, betId, amount: selectedChip, betPoint }
          : { type: 'PLACE_BET' as const, betId, amount: selectedChip };
      send(event);
    },
    [selectedChip, send],
  );

  // ── Remove bet ───────────────────────────────────────────────────────────────
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

  // ── Leave table ──────────────────────────────────────────────────────────────
  const handleLeave = useCallback(() => {
    void doSettle(snapshot.context).then(() => {
      send({ type: 'LEAVE_TABLE' });
    });
  }, [doSettle, snapshot.context, send]);

  // ── session_over render ──────────────────────────────────────────────────────
  if (snapshot.matches('session_over')) {
    const net = ctx.bankroll - ctx.totalBoughtIn;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-felt-deep text-white">
        <h2 className="font-display text-2xl tracking-widest text-gold-bright" data-session-over>
          SESSION OVER
        </h2>
        <div className="flex flex-col items-center gap-2 text-[13px]">
          <span className="text-white/60">Rolls played: {ctx.rollsPlayed}</span>
          <span className="text-white/60">Bought in: {ctx.totalBoughtIn.toLocaleString()}</span>
          <span className="text-white/60">Final bankroll: {ctx.bankroll.toLocaleString()}</span>
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

  const isAtTable = snapshot.matches('table');
  if (!isAtTable) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-felt-deep text-white">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col gap-3 bg-felt-deep p-3 text-white">
      <SessionBar
        bankroll={ctx.bankroll}
        totalBoughtIn={ctx.totalBoughtIn}
        rollsPlayed={ctx.rollsPlayed}
        canLeave={true}
        onLeave={handleLeave}
      />
      <div className="mx-auto w-full max-w-3xl">
        <CrapsTable
          ctx={ctx}
          onPlace={handlePlace}
          onRemove={handleRemove}
          onRoll={handleRoll}
          canRoll={true}
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
    </div>
  );
}

// ── Top-level page: manages session lifecycle ──────────────────────────────────

export default function CrapsPage(): JSX.Element {
  const user = useCurrentUser();
  const balance = useBalance();
  const { placeBet } = useGameRound('craps');

  const [session, setSession] = useState<SessionState | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

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
    // session_over state is handled inside CrapsSession
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
    <CrapsSession
      key={`${session.input.sessionId}-${sessionKey}`}
      session={session}
      onSessionOver={handleSessionOver}
      onReset={handleReset}
    />
  );
}
