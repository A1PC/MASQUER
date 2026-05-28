import type { JSX } from 'react';
import { Link } from 'react-router';
import type { ClaimLogEntry } from './machine';
import type { Variant } from './logic';
import { BUY_IN, VARIANTS } from './logic';

interface Props {
  variant: Variant;
  winner: 'user' | 'cpu' | null;
  cpuTier3Winner: number | null;
  pot: number;
  bonusesEarned: number;
  claimLog: ClaimLogEntry[];
  /** Total calls when the game ended; drives the FAST BINGO badge (≤ 40). */
  finalCallCount?: number;
  onPlayAgain: () => void;
  onChangeVariant: () => void;
}

/** Spec §4.7 — keep the British-friendly copy understated. The American
 *  variant inherits the same component for now (American-only banner copy
 *  refinements land in #10.v2). */
function fastBingoCopy(variant: Variant): string {
  return variant === 'british' ? 'FAST BINGO BONUS' : 'FAST BINGO!';
}

export default function EndScreen({
  variant,
  winner,
  cpuTier3Winner,
  pot,
  bonusesEarned,
  claimLog,
  finalCallCount,
  onPlayAgain,
  onChangeVariant,
}: Props): JSX.Element {
  const won = winner === 'user';
  const totalPayout = bonusesEarned + (won ? pot : 0);
  const netChange = totalPayout - BUY_IN;
  // FAST BINGO: only when the PLAYER won the tier-3 inside the first 40 calls.
  // CPUs winning fast doesn't trigger the kicker — that's player-only celebration.
  const fastBingo = won && typeof finalCallCount === 'number' && finalCallCount <= 40;

  return (
    <div
      className={[
        'flex flex-col items-center gap-4 rounded-md border bg-velvet-deep p-6 text-ivory',
        'max-h-[60vh] overflow-y-auto',
        won ? 'border-jewel-magenta shadow-[0_0_24px_rgba(232,74,140,0.35)]' : 'border-brass/60',
      ].join(' ')}
      data-end-screen
      data-fast-bingo={fastBingo}
    >
      <h2
        className={`font-display text-xl tracking-[0.18em] ${
          won ? 'text-gold-bright' : 'text-state-loss'
        }`}
      >
        {won
          ? `YOU WON THE ${VARIANTS[variant].tier3Label.replace('!', '')}!`
          : winner === 'cpu'
            ? `Computer ${(cpuTier3Winner ?? 0) + 1} took the pot.`
            : 'Game ended.'}
      </h2>

      {fastBingo && (
        <div
          data-fast-bingo-badge
          className="rounded-full border-2 border-jewel-magenta bg-velvet px-4 py-1 font-display text-xs tracking-[0.18em] text-gold-bright"
        >
          {fastBingoCopy(variant)} &middot; {finalCallCount} CALLS
        </div>
      )}

      <ul className="min-w-[260px] space-y-1 text-xs text-ivory/85" data-claim-log>
        {claimLog.map((entry, i) => (
          <li key={i} className="flex justify-between">
            <span>
              {entry.tier === 'tier1'
                ? VARIANTS[variant].tier1Label.replace('!', '')
                : entry.tier === 'tier2'
                  ? VARIANTS[variant].tier2Label.replace('!', '')
                  : VARIANTS[variant].tier3Label.replace('!', '')}
              {' — '}
              {entry.source === 'user' ? 'You' : `CPU ${(entry.cpuIdx ?? 0) + 1}`}
            </span>
            {entry.chipDelta > 0 && (
              <span className="font-display tabular-nums text-gold-bright">+{entry.chipDelta}</span>
            )}
          </li>
        ))}
      </ul>

      <div className="w-full max-w-xs space-y-1 border-t border-brass/40 pt-3 text-xs">
        <div className="flex justify-between">
          <span className="text-ivory/60">Buy-in</span>
          <span className="tabular-nums text-ivory">-{BUY_IN}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ivory/60">Payout</span>
          <span className="tabular-nums text-gold-bright">+{totalPayout}</span>
        </div>
        <div className="flex justify-between font-display">
          <span>Net</span>
          <span
            className={`tabular-nums ${netChange >= 0 ? 'text-gold-bright' : 'text-state-loss'}`}
          >
            {netChange >= 0 ? '+' : ''}
            {netChange}
          </span>
        </div>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          onClick={onPlayAgain}
          className="min-h-[44px] w-full rounded-md border-2 border-brass bg-velvet py-2 font-display text-sm tracking-[0.18em] text-gold-bright hover:bg-velvet-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
        >
          PLAY AGAIN
        </button>
        <button
          type="button"
          onClick={onChangeVariant}
          className="min-h-[44px] w-full rounded-md border border-brass/60 bg-felt-table-deep py-2 text-xs text-ivory/80 hover:border-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
        >
          CHANGE VARIANT
        </button>
        <Link
          to="/lobby"
          className="min-h-[44px] w-full rounded-md border border-brass/40 bg-felt-table-deep py-2 text-center text-xs text-ivory/60 hover:border-brass/70"
        >
          BACK TO LOBBY
        </Link>
      </div>
    </div>
  );
}
