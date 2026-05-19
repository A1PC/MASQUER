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
  onPlayAgain: () => void;
  onChangeVariant: () => void;
}

export default function EndScreen({
  variant,
  winner,
  cpuTier3Winner,
  pot,
  bonusesEarned,
  claimLog,
  onPlayAgain,
  onChangeVariant,
}: Props): JSX.Element {
  const won = winner === 'user';
  const totalPayout = bonusesEarned + (won ? pot : 0);
  const netChange = totalPayout - BUY_IN;

  return (
    <div
      className="flex flex-col items-center gap-4 rounded border border-gold/30 bg-felt-deep p-6"
      data-end-screen
    >
      <h2
        className={`font-display text-xl tracking-wider ${won ? 'text-gold-bright' : 'text-casino-red'}`}
      >
        {won
          ? `YOU WON THE ${VARIANTS[variant].tier3Label.replace('!', '')}!`
          : winner === 'cpu'
            ? `Computer ${(cpuTier3Winner ?? 0) + 1} took the pot.`
            : 'Game ended.'}
      </h2>

      <ul className="text-xs text-white/80 space-y-1 min-w-[260px]" data-claim-log>
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

      <div className="w-full max-w-xs border-t border-white/10 pt-3 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-white/60">Buy-in</span>
          <span className="tabular-nums text-white">-{BUY_IN}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">Payout</span>
          <span className="tabular-nums text-gold-bright">+{totalPayout}</span>
        </div>
        <div className="flex justify-between font-display">
          <span>Net</span>
          <span
            className={`tabular-nums ${netChange >= 0 ? 'text-gold-bright' : 'text-casino-red'}`}
          >
            {netChange >= 0 ? '+' : ''}
            {netChange}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button
          type="button"
          onClick={onPlayAgain}
          className="w-full rounded-md border-2 border-gold bg-casino-red py-2 font-display text-sm tracking-wider text-white"
        >
          PLAY AGAIN
        </button>
        <button
          type="button"
          onClick={onChangeVariant}
          className="w-full rounded-md border border-white/30 bg-felt-deep py-2 text-xs text-white/80 hover:border-gold"
        >
          CHANGE VARIANT
        </button>
        <Link
          to="/lobby"
          className="w-full text-center rounded-md border border-white/20 bg-felt-deep py-2 text-xs text-white/60 hover:border-white/60"
        >
          BACK TO LOBBY
        </Link>
      </div>
    </div>
  );
}
