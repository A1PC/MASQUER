import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DIFFICULTY, BUY_IN, type Difficulty, type DifficultyConfig } from '@/games/bingo/logic';
import { useBingoConfigStore } from '@/store/bingoConfigStore';
import { resolveDifficulty } from '@/systems/bingoConfig';
import StatCard from '@/pages/admin/StatCard';
import BingoVariantDifficultyBar from '@/components/charts/BingoVariantDifficultyBar';
import DateRangeFilter, {
  rangeToSinceMs,
  type RangePreset,
} from '@/components/admin/DateRangeFilter';
import TopPlayersPanel from '@/components/admin/TopPlayersPanel';
import BingoCallCountHistogram from '@/components/charts/BingoCallCountHistogram';
import {
  getBingoAllTimeStats,
  getBingoBallsToBingo,
  getBingoCallCountHistogram,
  getBingoVariantDifficultyDistribution,
  type BingoAllTimeStats,
  type BingoBallsToBingo,
  type BingoCallCountBin,
  type BingoDifficulty,
  type BingoVariant,
  type BingoVariantDifficultyCount,
} from '@/systems/stats';
import { db } from '@/db';
import type { Round } from '@/db';

/** Per-difficulty form state (all stored as strings so number inputs work naturally). */
interface DifficultyFormState {
  cpuCount: string;
  potMultiplier: string;
  cpuLatencyMin: string;
  cpuLatencyMax: string;
  forceManual: boolean;
  error: string | null;
  saved: boolean;
}

function configToForm(cfg: DifficultyConfig): DifficultyFormState {
  return {
    cpuCount: String(cfg.cpuCount),
    potMultiplier: String(cfg.potMultiplier),
    cpuLatencyMin: String(cfg.cpuLatencyMs[0]),
    cpuLatencyMax: String(cfg.cpuLatencyMs[1]),
    forceManual: cfg.forceManual,
    error: null,
    saved: false,
  };
}

function validateForm(
  form: DifficultyFormState,
): { ok: true; cfg: DifficultyConfig } | { ok: false; error: string } {
  const cpuCount = Number(form.cpuCount);
  const potMultiplier = Number(form.potMultiplier);
  const cpuLatencyMin = Number(form.cpuLatencyMin);
  const cpuLatencyMax = Number(form.cpuLatencyMax);

  if (!Number.isInteger(cpuCount) || cpuCount < 0)
    return { ok: false, error: 'CPU count must be a whole number ≥ 0' };
  if (!Number.isFinite(potMultiplier) || potMultiplier < 0)
    return { ok: false, error: 'Pot multiplier must be ≥ 0' };
  if (!Number.isInteger(cpuLatencyMin) || cpuLatencyMin < 0)
    return { ok: false, error: 'Min latency must be a whole number ≥ 0' };
  if (!Number.isInteger(cpuLatencyMax) || cpuLatencyMax < 0)
    return { ok: false, error: 'Max latency must be a whole number ≥ 0' };
  if (cpuLatencyMin > cpuLatencyMax)
    return { ok: false, error: 'Min latency must be ≤ Max latency' };

  return {
    ok: true,
    cfg: {
      cpuCount,
      potMultiplier,
      cpuLatencyMs: [cpuLatencyMin, cpuLatencyMax],
      forceManual: form.forceManual,
    },
  };
}

const DIFFICULTY_TITLES: Record<Difficulty, string> = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
};

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

interface DifficultyCardProps {
  difficulty: Difficulty;
  form: DifficultyFormState;
  onChange: (patch: Partial<DifficultyFormState>) => void;
  onSave: () => void;
  onReset: () => void;
}

function DifficultyCard({
  difficulty,
  form,
  onChange,
  onSave,
  onReset,
}: DifficultyCardProps): JSX.Element {
  const def = DIFFICULTY[difficulty];

  return (
    <div
      className="flex flex-col gap-4 rounded border border-gold/30 bg-felt-deep p-5"
      data-difficulty-card={difficulty}
    >
      <h2 className="font-display text-sm tracking-wider text-gold-bright">
        {DIFFICULTY_TITLES[difficulty]}
      </h2>

      <div className="flex flex-col gap-3">
        {/* CPU Count */}
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/60">
            CPU Count
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={form.cpuCount}
            onChange={(e) => onChange({ cpuCount: e.target.value, error: null, saved: false })}
            className="w-full rounded border border-white/20 bg-black/30 px-3 py-1.5 text-xs text-white focus:border-gold focus:outline-none"
            aria-label={`${difficulty} CPU count`}
          />
          <p className="mt-0.5 text-[9px] text-white/30">Default: {def.cpuCount}</p>
        </div>

        {/* Pot Multiplier */}
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/60">
            Pot Multiplier
          </label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={form.potMultiplier}
            onChange={(e) => onChange({ potMultiplier: e.target.value, error: null, saved: false })}
            className="w-full rounded border border-white/20 bg-black/30 px-3 py-1.5 text-xs text-white focus:border-gold focus:outline-none"
            aria-label={`${difficulty} pot multiplier`}
          />
          <p className="mt-0.5 text-[9px] text-white/30">
            Default: {def.potMultiplier} (pot = {BUY_IN} × multiplier)
          </p>
        </div>

        {/* CPU Latency */}
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/60">
            CPU Latency (ms)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={1}
              value={form.cpuLatencyMin}
              onChange={(e) =>
                onChange({ cpuLatencyMin: e.target.value, error: null, saved: false })
              }
              className="w-full rounded border border-white/20 bg-black/30 px-3 py-1.5 text-xs text-white focus:border-gold focus:outline-none"
              aria-label={`${difficulty} CPU latency min`}
            />
            <span className="shrink-0 text-xs text-white/40">to</span>
            <input
              type="number"
              min={0}
              step={1}
              value={form.cpuLatencyMax}
              onChange={(e) =>
                onChange({ cpuLatencyMax: e.target.value, error: null, saved: false })
              }
              className="w-full rounded border border-white/20 bg-black/30 px-3 py-1.5 text-xs text-white focus:border-gold focus:outline-none"
              aria-label={`${difficulty} CPU latency max`}
            />
          </div>
          <p className="mt-0.5 text-[9px] text-white/30">
            Default: {def.cpuLatencyMs[0]}–{def.cpuLatencyMs[1]} ms
          </p>
        </div>

        {/* Force Manual */}
        <div>
          <label className="flex cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              checked={form.forceManual}
              onChange={(e) =>
                onChange({ forceManual: e.target.checked, error: null, saved: false })
              }
              className="rounded"
              aria-label={`${difficulty} force manual daub`}
            />
            <span className="text-xs text-white/70">Force manual daub</span>
          </label>
          <p className="ml-6 mt-0.5 text-[9px] text-white/30">
            Default: {def.forceManual ? 'yes' : 'no'}
          </p>
        </div>
      </div>

      {form.error !== null && (
        <p className="text-[10px] text-casino-red" role="alert">
          {form.error}
        </p>
      )}

      {form.saved && (
        <p className="text-[10px] text-chip-win" aria-live="polite">
          Saved — applies to the next game.
        </p>
      )}

      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={onSave}
          className="flex-1 rounded border border-gold bg-gold/20 px-3 py-2 font-display text-[11px] tracking-wider text-gold-bright transition hover:bg-gold/30"
        >
          SAVE
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex-1 rounded border border-white/20 px-3 py-2 font-display text-[11px] tracking-wider text-white/60 transition hover:border-white/50 hover:text-white"
        >
          RESET TO DEFAULT
        </button>
      </div>
    </div>
  );
}

/** Inner component that owns local form state; keyed on hydration to reset when overrides load. */
function AdminBingoForm(): JSX.Element {
  const overrides = useBingoConfigStore((s) => s.overrides);
  const saveDifficulty = useBingoConfigStore((s) => s.saveDifficulty);
  const resetDifficulty = useBingoConfigStore((s) => s.resetDifficulty);

  // Initialize form from resolved configs (store already hydrated at this point
  // because AppBootstrap runs hydrateBingoConfig on mount before routing resolves).
  const [forms, setForms] = useState<Record<Difficulty, DifficultyFormState>>(() => ({
    easy: configToForm(resolveDifficulty('easy', overrides.easy)),
    medium: configToForm(resolveDifficulty('medium', overrides.medium)),
    hard: configToForm(resolveDifficulty('hard', overrides.hard)),
  }));

  function patchForm(d: Difficulty, patch: Partial<DifficultyFormState>): void {
    setForms((prev) => ({
      ...prev,
      [d]: { ...prev[d], ...patch },
    }));
  }

  async function handleSave(d: Difficulty): Promise<void> {
    const result = validateForm(forms[d]);
    if (!result.ok) {
      patchForm(d, { error: result.error, saved: false });
      return;
    }
    await saveDifficulty(d, result.cfg);
    patchForm(d, { error: null, saved: true });
  }

  async function handleReset(d: Difficulty): Promise<void> {
    await resetDifficulty(d);
    setForms((prev) => ({
      ...prev,
      [d]: configToForm(DIFFICULTY[d]),
    }));
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {DIFFICULTIES.map((d) => (
        <DifficultyCard
          key={d}
          difficulty={d}
          form={forms[d]}
          onChange={(patch) => patchForm(d, patch)}
          onSave={() => void handleSave(d)}
          onReset={() => void handleReset(d)}
        />
      ))}
    </div>
  );
}

/** Persisted shape mirrored from `src/systems/stats.ts` — the admin page only
 *  reads the scalar fields it needs for the recent-rounds table. */
interface PersistedBingoDetails {
  readonly variant: BingoVariant;
  readonly difficulty: BingoDifficulty;
  readonly finalCallCount: number;
  readonly userTier1: boolean;
  readonly userTier2: boolean;
  readonly userTier3: boolean;
  readonly cpuTier3Winner: number | null;
  readonly cpuCount?: number;
  readonly bonusesEarned: number;
  readonly pot: number;
}

const EMPTY_STATS: BingoAllTimeStats = {
  gamesPlayed: 0,
  totalWagered: 0,
  totalPaid: 0,
  netHouseChips: 0,
  netPlayerChips: 0,
  actualRtp: null,
  playerTier3Wins: 0,
  cpuTier3Wins: 0,
  playerBingoCapturePct: 0,
  fastBingoPlayerWins: 0,
  fastBingoHitRate: 0,
  lineWins: 0,
  doubleLineWins: 0,
  totalBonusesPaid: 0,
  totalPotsWonByPlayer: 0,
  // Phase 15 #14.5 PR B — additive KPI defaults.
  avgCallCount: null,
  biggestSingleWin: 0,
};
const EMPTY_DIST: readonly BingoVariantDifficultyCount[] = [];
const EMPTY_BALLS: readonly BingoBallsToBingo[] = [];
const EMPTY_ROUNDS: readonly Round[] = [];
const EMPTY_CALL_HIST: readonly BingoCallCountBin[] = [];

interface MiniBarProps {
  label: string;
  count: number;
  total: number;
  /** Tailwind background class for the bar fill. */
  fillClass: string;
  /** Optional chip-payout footnote (right-side). */
  paidChips?: number;
}

function MiniBar({ label, count, total, fillClass, paidChips }: MiniBarProps): JSX.Element {
  const pct = total === 0 ? 0 : (count / total) * 100;
  return (
    <div className="flex flex-col gap-1" data-mini-bar={label}>
      <div className="flex items-baseline justify-between text-[10px] tracking-wider text-white/60">
        <span className="font-display uppercase">{label}</span>
        <span className="tabular-nums text-white/80">
          {count.toLocaleString()} <span className="text-white/40">({pct.toFixed(1)}%)</span>
          {paidChips !== undefined && (
            <span className="ml-2 text-gold-bright">+{paidChips.toLocaleString()}</span>
          )}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-sm bg-black/40"
        role="img"
        aria-label={`${label}: ${count} of ${total} (${pct.toFixed(1)}%)`}
      >
        <div
          className={`h-full ${fillClass}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}

const DIFFICULTY_TITLE_SHORT: Record<BingoDifficulty, string> = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
};

const VARIANT_TITLE: Record<BingoVariant, string> = {
  british: 'British',
  american: 'American',
};

function OutcomeBadge({ outcome }: { outcome: 'bingo' | 'bonus' | 'lost' }): JSX.Element {
  const cls =
    outcome === 'bingo'
      ? 'border-state-win/60 bg-state-win/15 text-state-win'
      : outcome === 'bonus'
        ? 'border-gold/60 bg-gold/15 text-gold-bright'
        : 'border-casino-red/60 bg-casino-red/15 text-casino-red';
  const label = outcome === 'bingo' ? 'BINGO' : outcome === 'bonus' ? 'BONUS' : 'LOST';
  return (
    <span
      data-outcome={outcome}
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 font-display text-[10px] uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  );
}

function AdminBingoStats(): JSX.Element {
  // Phase 15 #14 PR B — shared date-range filter persisted across mounts.
  const [range, setRange] = useState<RangePreset>('all');
  const sinceMs = useMemo(() => rangeToSinceMs(range), [range]);

  // Inferred-Promise pattern per #250 — no explicit generic.
  const stats = useLiveQuery(() => getBingoAllTimeStats(sinceMs), [sinceMs], EMPTY_STATS);
  const distribution = useLiveQuery(() => getBingoVariantDifficultyDistribution(), [], EMPTY_DIST);
  const ballsToBingo = useLiveQuery(() => getBingoBallsToBingo(), [], EMPTY_BALLS);
  // Phase 15 #14.5 PR B — additive call-count histogram for the new chart.
  const callHist = useLiveQuery(
    () => getBingoCallCountHistogram(sinceMs),
    [sinceMs],
    EMPTY_CALL_HIST,
  );
  // Load-all + sort by playedAt desc + slice(20) — #250 pattern; do NOT use
  // `.where(...).reverse().limit(...)` (ties-break by primary key, not
  // chronologically).
  const recentRounds = useLiveQuery(
    async () => {
      const all = await db.rounds.where('game').equals('bingo').toArray();
      return all.sort((a, b) => b.playedAt - a.playedAt).slice(0, 20);
    },
    [],
    EMPTY_ROUNDS,
  );
  const filteredRecent = useMemo(
    () => (sinceMs !== undefined ? recentRounds.filter((r) => r.playedAt > sinceMs) : recentRounds),
    [recentRounds, sinceMs],
  );

  const gamesPlayed = stats.gamesPlayed;
  const capturePctDisplay =
    gamesPlayed === 0 ? '—' : `${(stats.playerBingoCapturePct * 100).toFixed(1)}%`;
  const fastHitRateDisplay =
    stats.playerTier3Wins === 0 ? '—' : `${(stats.fastBingoHitRate * 100).toFixed(1)}%`;

  return (
    <div className="flex flex-col gap-6" data-bingo-stats>
      <h2 className="font-display text-base tracking-[0.18em] text-gold-bright">STATISTICS</h2>

      <DateRangeFilter value={range} onChange={setRange} storageKey="admin.bingo.range" />

      {/* 4 StatCards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard label="Games played (all-time)" value={gamesPlayed.toLocaleString()} />
        <StatCard
          label="House net chips"
          value={
            stats.netHouseChips >= 0
              ? `+${stats.netHouseChips.toLocaleString()}`
              : stats.netHouseChips.toLocaleString()
          }
          tone={
            stats.netHouseChips > 0 ? 'positive' : stats.netHouseChips < 0 ? 'negative' : 'neutral'
          }
          sub={
            stats.netHouseChips > 0
              ? 'House ahead'
              : stats.netHouseChips < 0
                ? 'House behind'
                : 'Break-even'
          }
        />
        <StatCard
          label="Player BINGO capture %"
          value={capturePctDisplay}
          sub={`${stats.playerTier3Wins.toLocaleString()} of ${gamesPlayed.toLocaleString()}`}
        />
        <StatCard
          label="FAST BINGO hit rate"
          value={fastHitRateDisplay}
          sub={`${stats.fastBingoPlayerWins.toLocaleString()} of ${stats.playerTier3Wins.toLocaleString()} player wins`}
        />
      </div>

      {/* Hero chart */}
      <section aria-label="Bingo variant × difficulty distribution">
        <h3 className="mb-2 font-display text-xs tracking-[0.18em] text-white/60">
          VARIANT × DIFFICULTY DISTRIBUTION
        </h3>
        <div className="rounded-md border border-gold/30 bg-felt-deep p-4">
          {gamesPlayed === 0 ? (
            <p className="py-8 text-center text-xs text-white/40">No bingo rounds recorded yet.</p>
          ) : (
            <BingoVariantDifficultyBar data={distribution} />
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bonus economics panel */}
        <section aria-label="Bingo bonus economics">
          <h3 className="mb-2 font-display text-xs tracking-[0.18em] text-white/60">
            BONUS ECONOMICS
          </h3>
          <div className="flex flex-col gap-3 rounded-md border border-gold/30 bg-felt-deep p-4">
            <MiniBar
              label="LINE wins"
              count={stats.lineWins}
              total={gamesPlayed}
              fillClass="bg-gold/70"
            />
            <MiniBar
              label="DOUBLE LINE / 4 CORNERS"
              count={stats.doubleLineWins}
              total={gamesPlayed}
              fillClass="bg-gold/55"
            />
            <MiniBar
              label="BINGO (player wins)"
              count={stats.playerTier3Wins}
              total={gamesPlayed}
              fillClass="bg-jewel-magenta"
              paidChips={stats.totalPotsWonByPlayer}
            />
            <MiniBar
              label="FAST BINGO kicker"
              count={stats.fastBingoPlayerWins}
              total={Math.max(stats.playerTier3Wins, 1)}
              fillClass="bg-jewel-magenta/70"
              paidChips={stats.fastBingoPlayerWins * 500}
            />
            <div className="flex items-baseline justify-between border-t border-gold/20 pt-3 text-[10px] tracking-wider text-white/50">
              <span className="font-display uppercase">Total bonuses paid</span>
              <span className="font-display tabular-nums text-gold-bright">
                +{stats.totalBonusesPaid.toLocaleString()}
              </span>
            </div>
          </div>
        </section>

        {/* Average balls to BINGO per difficulty */}
        <section aria-label="Average balls to BINGO per difficulty">
          <h3 className="mb-2 font-display text-xs tracking-[0.18em] text-white/60">
            AVERAGE BALLS TO BINGO
          </h3>
          <div className="rounded-md border border-gold/30 bg-felt-deep p-4">
            <div className="grid grid-cols-3 gap-3">
              {ballsToBingo.map((row) => (
                <div
                  key={row.difficulty}
                  className="flex flex-col items-center gap-1 rounded-md border border-brass/40 bg-felt-table-deep p-3 text-center"
                  data-balls-to-bingo={row.difficulty}
                >
                  <div className="font-display text-[10px] tracking-[0.18em] text-white/50">
                    {DIFFICULTY_TITLE_SHORT[row.difficulty]}
                  </div>
                  <div className="font-display text-2xl tabular-nums text-gold-bright">
                    {row.averageCalls === null ? '—' : row.averageCalls.toFixed(1)}
                  </div>
                  <div className="text-[9px] text-white/40">avg calls</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] tracking-wider text-white/40">
              Mean final call count across player tier-3 wins per difficulty. Lower = faster.
            </p>
          </div>
        </section>
      </div>

      {/* Recent games table (last 20) */}
      <section aria-label="Recent bingo games">
        <h3 className="mb-2 font-display text-xs tracking-[0.18em] text-white/60">
          RECENT GAMES (LAST 20)
        </h3>
        {filteredRecent.length === 0 ? (
          <p className="text-xs text-white/40">No games yet.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gold/30 uppercase tracking-wider text-white/40">
                <th className="py-2 pr-3">Played at</th>
                <th className="py-2 pr-3">Variant</th>
                <th className="py-2 pr-3">Difficulty</th>
                <th className="py-2 pr-3">Outcome</th>
                <th className="py-2 pr-3 text-right">Cards*</th>
                <th className="py-2 pr-3 text-right">Bet</th>
                <th className="py-2 pr-3 text-right">Payout</th>
                <th className="py-2 text-right">House P/L</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecent.map((r) => {
                const d = r.details as PersistedBingoDetails | undefined;
                const variant = d?.variant ?? null;
                const difficulty = d?.difficulty ?? null;
                // Outcome rules: green BINGO when userTier3, gold BONUS when
                // only a tier-1/2 fired, red LOST when a CPU took tier-3.
                const outcome: 'bingo' | 'bonus' | 'lost' = d?.userTier3
                  ? 'bingo'
                  : d?.cpuTier3Winner !== null && d?.cpuTier3Winner !== undefined
                    ? 'lost'
                    : 'bonus';
                // Per-game cardCount isn't persisted — fall back to "player +
                // N CPUs" so the column reads sensibly. Documented in the PR.
                const cards = (d?.cpuCount ?? 0) + 1;
                const housePl = r.betAmount - r.payout;
                return (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-1.5 pr-3 tabular-nums text-white/70">
                      {new Date(r.playedAt).toISOString().slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="py-1.5 pr-3 text-ivory">
                      {variant ? VARIANT_TITLE[variant] : '—'}
                    </td>
                    <td className="py-1.5 pr-3 text-ivory/80">
                      {difficulty ? DIFFICULTY_TITLE_SHORT[difficulty] : '—'}
                    </td>
                    <td className="py-1.5 pr-3">
                      <OutcomeBadge outcome={outcome} />
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums text-ivory/80">{cards}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {r.betAmount.toLocaleString()}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {r.payout.toLocaleString()}
                    </td>
                    <td
                      className={`py-1.5 text-right tabular-nums ${
                        housePl > 0
                          ? 'text-chip-win'
                          : housePl < 0
                            ? 'text-casino-red'
                            : 'text-white/60'
                      }`}
                    >
                      {housePl > 0 ? '+' : ''}
                      {housePl.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="mt-2 text-[10px] tracking-wider text-white/40">
          *Cards column shows <span className="text-white/60">player + CPU count</span> &mdash;
          per-game card-count isn&apos;t persisted in this version, so the column reads as the table
          size, not the player&apos;s 1&ndash;4-card pick.
        </p>
      </section>

      {/* Phase 15 #14.5 PR B — NEW additive sections (KPI grid + call-count
          histogram + per-user drill-down). None of the existing top StatCards
          / hero chart / bonus economics / recent table is modified or moved. */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5" data-admin-kpi-grid>
        <StatCard
          label="Avg call count"
          value={stats.avgCallCount === null ? '—' : stats.avgCallCount.toLocaleString()}
        />
        <StatCard
          label="Fast-bingo rate"
          value={
            stats.playerTier3Wins === 0 ? '—' : `${(stats.fastBingoHitRate * 100).toFixed(1)}%`
          }
        />
        <StatCard
          label="Per-difficulty house edge"
          value={stats.actualRtp === null ? '—' : `${(100 - stats.actualRtp * 100).toFixed(1)}%`}
          sub="aggregate house edge"
        />
        <StatCard
          label="Avg session length"
          value={stats.avgCallCount === null ? '—' : `${stats.avgCallCount} calls`}
        />
        <StatCard
          label="Biggest single win"
          value={stats.biggestSingleWin === 0 ? '—' : `+${stats.biggestSingleWin.toLocaleString()}`}
        />
      </div>

      <section aria-label="Bingo call-count histogram">
        <h3 className="mb-2 font-display text-xs tracking-[0.18em] text-ivory/60">
          CALL-COUNT DISTRIBUTION
        </h3>
        <div className="rounded-md border border-brass/60 bg-velvet-deep p-4">
          {gamesPlayed === 0 ? (
            <p className="py-4 text-center text-xs text-ivory/40">No call-count data yet.</p>
          ) : (
            <BingoCallCountHistogram data={callHist} />
          )}
        </div>
      </section>

      <TopPlayersPanel game="bingo" {...(sinceMs !== undefined ? { sinceMs } : {})} />
    </div>
  );
}

export default function AdminBingoPage(): JSX.Element {
  const hydrated = useBingoConfigStore((s) => s.hydrated);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-base tracking-wider text-gold-bright">BINGO CONFIG</h1>
      <p className="text-[11px] text-white/50">
        Override per-difficulty parameters. Changes apply to the next game started — in-progress
        games are unaffected. Leave at defaults if unsure.
      </p>

      {/* Key on hydrated so the form remounts with correct initial values
          if the store hydrates after this page first renders. */}
      <AdminBingoForm key={hydrated ? 'hydrated' : 'pending'} />

      <hr className="border-gold/20" />

      <AdminBingoStats />
    </div>
  );
}
