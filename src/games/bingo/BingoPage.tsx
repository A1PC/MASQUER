import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useMachine } from '@xstate/react';
import { AnimatePresence } from 'framer-motion';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import { useBingoConfigStore } from '@/store/bingoConfigStore';
import { resolveDifficulty } from '@/systems/bingoConfig';
import { useGameRound } from '@/games/_shared/useGameRound';
import LobbyButton from '@/games/_shared/LobbyButton';
import OddsInfoBox from '@/games/_shared/OddsInfoBox';
import RulesButton from '@/games/_shared/RulesButton';
import RulesModal from '@/games/_shared/RulesModal';
import { useSound } from '@/systems/sound/useSound';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import { bingoMachine, type ClaimLogEntry } from './machine';
import {
  BUY_IN,
  CALL_SPEEDS,
  type BingoSpeed,
  type Difficulty,
  type DifficultyConfig,
  type Variant,
} from './logic';
import SetupPanel from './SetupPanel';
import BingoCard from './BingoCard';
import CallBoard from './CallBoard';
import CpuCardMini from './CpuCardMini';
import { useBingoBallCaller } from './useBingoBallCaller';
import DaubToggle from './DaubToggle';
import WinBanner from './WinBanner';
import EndScreen from './EndScreen';
import BingoRules from './BingoRules';
import BingoVariantModal from './BingoVariantModal';

// ============================================================================
// VARIANT-PATH GUIDE (audit §2.8 P2 — comment-block delineation)
// ----------------------------------------------------------------------------
// `BingoPage` is shared between the British 90-ball and American 75-ball
// variants. When an audit finding is filed, use this map to attribute it
// correctly between §2.7 (British) and §2.8 (American):
//
//   SHARED (variant-agnostic):
//     - Header / subtitle scaffold
//     - Setup / awaiting_bet_handle / done state branches
//     - Sound bridges (ball.drop + tier→stinger map)
//     - Bet placement, settle, machine wiring
//     - DaubToggle, OddsInfoBox, RulesButton, RulesModal, LobbyButton
//
//   BRITISH-ONLY (90-ball, 3×9 strip, line→double line→full house):
//     - `variant === 'british'` branches in the `subtitle` ternary below
//     - VARIANTS.british tier labels (LINE!/DOUBLE LINE!/BINGO!) rendered
//       indirectly via WinBanner + EndScreen + SetupPanel
//
//   AMERICAN-ONLY (75-ball, 5×5 grid w/ free centre, line→four corners→blackout):
//     - `variant === 'american'` branches in the `subtitle` ternary below
//     - Free-centre cell render (auto-marked, MaskMark) lives in BingoCard.tsx
//     - B-I-N-G-O column headers + ball-call letter prefix live in
//       BingoCard.tsx + CallBoard.tsx
//     - VARIANTS.american tier labels (LINE!/FOUR CORNERS!/BLACKOUT!) ditto
//
// TODO(#15-followup): if/when American gains enough divergence to justify it,
// split into `BingoBritishPage`/`BingoAmericanPage` wrappers sharing internals
// (mirrors poker `holdem/draw/omaha`). Tracked as a PR-B-scope refactor —
// out of scope for the per-game cold-look pass.
// ============================================================================
function isVariant(v: string | null): v is Variant {
  return v === 'british' || v === 'american';
}

/** Hard-difficulty ball-call cadence is fast enough that 75–90 `ball.drop`
 *  stingers in quick succession would feel exhausting. Coalesce to at most
 *  one drop sound per `BALL_DROP_DEBOUNCE_MS` (spec §7 risk + plan §A.5
 *  step 2). The threshold is applied uniformly — at slower speeds calls
 *  arrive far apart so the debounce is a no-op in practice. */
const BALL_DROP_DEBOUNCE_MS = 200;

export default function BingoPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const variantParam = searchParams.get('variant');
  const variant: Variant = isVariant(variantParam) ? variantParam : 'british';
  const invalidVariant = !isVariant(variantParam);

  const bingoOverrides = useBingoConfigStore((s) => s.overrides);
  const resolvedConfigs: Record<Difficulty, DifficultyConfig> = useMemo(
    () => ({
      easy: resolveDifficulty('easy', bingoOverrides.easy),
      medium: resolveDifficulty('medium', bingoOverrides.medium),
      hard: resolveDifficulty('hard', bingoOverrides.hard),
    }),
    [bingoOverrides],
  );

  const { placeBet, settle } = useGameRound('bingo');
  const [snapshot, send] = useMachine(bingoMachine);
  const { play } = useSound();
  const reduceMotion = useEffectiveReducedMotion();

  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty>('easy');
  const [pendingSpeed, setPendingSpeed] = useState<BingoSpeed>('normal');
  const [pendingDaubMode, setPendingDaubMode] = useState<'auto' | 'manual'>('auto');
  const [rulesOpen, setRulesOpen] = useState(false);
  const settledRef = useRef<string | null>(null);
  const [activeBanners, setActiveBanners] = useState<Array<{ key: string; entry: ClaimLogEntry }>>(
    [],
  );
  const shownClaimsRef = useRef<number>(0);
  const lastBallSoundAtRef = useRef<number>(0);
  const lastCallIndexRef = useRef<number>(0);
  const settledOutcomeRef = useRef<string | null>(null);

  // Banner sync from claimLog. Also fires the tier win/loss stingers via a
  // single bridge: each new entry pushes a banner AND plays its associated
  // sound (gated on the prefs-aware `useSound`). Reduced motion does NOT
  // gate audio — players who reduce motion may still want chip cues.
  //
  // TODO(#15-followup): the user-tier → sound id mapping below is identical
  // to the one inlined in Slots/Roulette/Baccarat/Craps. Phase-15 #15.g7
  // intentionally leaves the inline form here (extracting a shared
  // `@/systems/sound/winTierSounds.ts` util is PR B scope, not a per-game
  // cold-look). Audit ref: §2.7 P2.
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
        const entry = log[i]!;
        newBanners.push({ key: `${i}-${entry.tier}`, entry });
        // Stinger per claim. User-side gets a win.*; CPU-side tier3 is the
        // player loss path. CPU tier-1/2 claims are silent (player has
        // already paid; firing a stinger would feel like negative
        // reinforcement on every CPU sub-claim).
        if (entry.source === 'user') {
          if (entry.tier === 'tier1') play('win.small');
          else if (entry.tier === 'tier2') play('win.medium');
          else play('win.jackpot');
        } else if (entry.tier === 'tier3') {
          play('loss');
        }
      }
      shownClaimsRef.current = log.length;
      setActiveBanners((cur) => [...cur, ...newBanners]);
    }
  }, [snapshot.context.claimLog, play]);

  // Per-ball `ball.drop` sound bridge. Watches the `callIndex` for change
  // and fires once per new ball, debounced at `BALL_DROP_DEBOUNCE_MS` so
  // the Hard difficulty's tight cadence doesn't drown the player in
  // overlapping drops.
  useEffect(() => {
    const idx = snapshot.context.callIndex;
    if (idx <= lastCallIndexRef.current) return;
    lastCallIndexRef.current = idx;
    const now = performance.now();
    if (now - lastBallSoundAtRef.current >= BALL_DROP_DEBOUNCE_MS) {
      lastBallSoundAtRef.current = now;
      play('ball.drop');
    }
  }, [snapshot.context.callIndex, play]);

  // Reset bridges when a fresh game starts (callIndex drops back to 0).
  useEffect(() => {
    if (snapshot.context.callIndex === 0) {
      lastCallIndexRef.current = 0;
      lastBallSoundAtRef.current = 0;
    }
  }, [snapshot.context.callIndex]);

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
    settledOutcomeRef.current = outcome;
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

  // Guards that fire after all hooks.
  // When no `?variant=` param is present (e.g. user clicked Bingo in the
  // sidebar), render the variant chooser modal in-page instead of bouncing
  // to the lobby. The modal navigates to `/play/bingo?variant=X` on pick,
  // which re-enters this component with `invalidVariant === false`. The
  // close action (Esc / backdrop) takes the user back to the lobby — that
  // preserves the "back out" option without changing the modal's own API.
  if (invalidVariant) {
    return (
      <BingoVariantModal
        open
        onClose={() => {
          void navigate('/lobby');
        }}
      />
    );
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
        difficultyConfig: resolvedConfigs[pendingDifficulty],
      });
      send({ type: 'BET_PLACED', betHandleId: result.handle.betId });
    })();
  }

  function handleManualDaub(row: number, col: number): void {
    play('chip.place');
    send({ type: 'MANUAL_DAUB', row, col });
  }

  const inGame =
    snapshot.matches('playing') || snapshot.matches('settling') || snapshot.matches('done');
  // VARIANT-BRANCH (shared subtitle, prefix differs): British/American copy is
  // chosen here from the URL `?variant=` param resolved at the top of the
  // component. Any future variant-only subtitle copy belongs in the dedicated
  // branch — keep the ternary readable rather than forking the whole header.
  const subtitle = inGame
    ? `${variant === 'british' ? 'British' : 'American'} · ${snapshot.context.difficulty}`
    : `${variant === 'british' ? 'British' : 'American'} · setup`;
  // Hard-cadence note via the ball-caller CALL_SPEEDS lookup so we don't
  // hard-code the speed knob's tick rate here.
  void CALL_SPEEDS;
  void reduceMotion;

  return (
    <div className="flex h-full flex-col bg-felt-table text-ivory">
      <main className="flex-1 overflow-auto p-6">
        <header className="mb-4 flex w-full items-start justify-between gap-4">
          <div className="flex-shrink-0">
            <LobbyButton />
          </div>
          <div className="min-w-0 flex-1 text-center">
            <h1
              className="truncate font-display text-2xl tracking-[0.18em] text-gold-bright"
              title="MASQUER · Bingo"
            >
              MASQUER &middot; Bingo
            </h1>
            <p
              className="mt-1 font-display text-[10px] uppercase tracking-[0.18em] text-ivory/55"
              data-bingo-subtitle
            >
              {subtitle}
            </p>
          </div>
          <div className="flex-shrink-0">
            <OddsInfoBox>
              <span className="tabular-nums">
                Line 25 &middot; Double Line 75 &middot; BINGO 250 &middot; Fast BINGO 500 (&le;40
                calls)
              </span>
            </OddsInfoBox>
          </div>
        </header>

        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {inGame && (
              <DaubToggle
                mode={snapshot.context.daubMode}
                onToggle={() => send({ type: 'TOGGLE_DAUB' })}
                disabled={snapshot.context.forceManual}
                {...(snapshot.context.forceManual
                  ? { disabledReason: 'This difficulty requires manual daub' }
                  : {})}
              />
            )}
          </div>
          <span className="font-display text-xs text-ivory/60">
            Balance:{' '}
            <span className="tabular-nums text-gold-bright">{balance.toLocaleString()}</span>
          </span>
        </div>

        {snapshot.matches('setup') && (
          <SetupPanel
            variant={variant}
            difficulty={pendingDifficulty}
            speed={pendingSpeed}
            daubMode={pendingDaubMode}
            balance={balance}
            resolvedConfigs={resolvedConfigs}
            onDifficultyChange={(d) => {
              setPendingDifficulty(d);
              if (resolvedConfigs[d].forceManual) setPendingDaubMode('manual');
            }}
            onSpeedChange={setPendingSpeed}
            onDaubModeChange={setPendingDaubMode}
            onBuyAndStart={handleBuyAndStart}
          />
        )}

        {snapshot.matches('awaiting_bet_handle') && (
          <p className="text-center text-xs text-ivory/60">Placing bet&hellip;</p>
        )}

        {inGame && (
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
                  ? { onCellClick: handleManualDaub }
                  : {})}
              />
            </div>
            <div className="mt-2 font-display text-[10px] tracking-[0.18em] text-ivory/50">
              COMPUTERS
            </div>
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
              finalCallCount={snapshot.context.callIndex}
              onPlayAgain={() => send({ type: 'PLAY_AGAIN' })}
              onChangeVariant={() => {
                void navigate('/lobby');
              }}
            />
          </div>
        )}

        <RulesButton onClick={() => setRulesOpen(true)} />
        <RulesModal open={rulesOpen} title="MASQUER · Bingo" onClose={() => setRulesOpen(false)}>
          <BingoRules />
        </RulesModal>
      </main>
    </div>
  );
}
