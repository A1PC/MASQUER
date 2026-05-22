import type { JSX } from 'react';
import type { ActiveBet } from './resolveRoll';

interface Props {
  betId: string;
  label: string;
  chips: ActiveBet[];
  canPlace: boolean;
  onPlace: () => void;
  onRemove?: (() => void) | undefined;
}

/** Chip stack total for all bets on this spot. */
function totalAmount(chips: ActiveBet[]): number {
  return chips.reduce((sum, b) => sum + b.amount, 0);
}

export default function BetSpot({
  betId,
  label,
  chips,
  canPlace,
  onPlace,
  onRemove,
}: Props): JSX.Element {
  const amount = totalAmount(chips);
  const hasChips = amount > 0;

  return (
    <div
      className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded border px-1 py-1 text-center text-[10px] leading-tight transition-opacity
        ${canPlace ? 'cursor-pointer border-gold/30 bg-white/5 hover:bg-white/10' : 'cursor-not-allowed border-white/10 bg-black/20 opacity-40'}`}
      data-bet-spot={betId}
      data-disabled={!canPlace ? 'true' : 'false'}
      onClick={canPlace ? onPlace : undefined}
      role="button"
      tabIndex={canPlace ? 0 : -1}
      onKeyDown={(e) => {
        if (canPlace && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onPlace();
        }
      }}
      aria-label={`${label}${hasChips ? ` — ${amount.toLocaleString()} chips` : ''}`}
      aria-disabled={!canPlace}
    >
      <span className="font-display text-[9px] uppercase tracking-wider text-white/70">
        {label}
      </span>
      {hasChips && (
        <span className="font-mono text-[10px] font-bold tabular-nums text-gold" data-chip-total>
          {amount.toLocaleString()}
        </span>
      )}
      {hasChips && onRemove && (
        <button
          type="button"
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-casino-red text-[8px] text-white hover:bg-red-400"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${label} bet`}
          data-remove-bet={betId}
        >
          ✕
        </button>
      )}
    </div>
  );
}
