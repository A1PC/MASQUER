import type { JSX } from 'react';
import type { ActiveBet } from './resolveRoll';

interface Props {
  betId: string;
  label: string;
  chips: ActiveBet[];
  canPlace: boolean;
  onPlace: () => void;
  onRemove?: (() => void) | undefined;
  /** Transient flash applied after a roll resolution. */
  flashTone?: 'win' | 'loss' | null | undefined;
  /** Net chip change credited to this spot for the last roll (display only). */
  payoutChips?: number | undefined;
}

/** Chip stack total for all bets on this spot. */
function totalAmount(chips: ActiveBet[]): number {
  return chips.reduce((sum, b) => sum + b.amount, 0);
}

/**
 * `BetSpot` — one wagerable region on the craps table.
 *
 * Brand-tokened velvet-deep surface with a brass hairline frame. Adds two
 * optional per-roll feedback hooks:
 *   - `flashTone='win'` → 2s gold-bright ring with a small payout badge.
 *   - `flashTone='loss'` → 1.5s casino-red ring + dimmed surface.
 *   - `flashTone={null|undefined}` → neutral idle state (silent push/standing).
 *
 * The parent (CrapsSession) drives flashes by inspecting `lastResolution`
 * after every roll and clearing the map after the flash window expires.
 */
export default function BetSpot({
  betId,
  label,
  chips,
  canPlace,
  onPlace,
  onRemove,
  flashTone,
  payoutChips,
}: Props): JSX.Element {
  const amount = totalAmount(chips);
  const hasChips = amount > 0;

  const baseSurface = canPlace
    ? 'cursor-pointer border-brass/60 bg-velvet-deep/40 hover:bg-velvet-deep/60'
    : 'cursor-not-allowed border-brass/30 bg-velvet-deep/30 opacity-40';

  const flashClass =
    flashTone === 'win'
      ? 'ring-2 ring-gold-bright shadow-[0_0_8px_rgba(232,189,109,0.7)]'
      : flashTone === 'loss'
        ? 'ring-1 ring-casino-red opacity-60'
        : '';

  return (
    <div
      className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded border px-1 py-1 text-center text-[10px] leading-tight transition-opacity ${baseSurface} ${flashClass}`}
      data-bet-spot={betId}
      data-disabled={!canPlace ? 'true' : 'false'}
      {...(flashTone ? { 'data-flash-tone': flashTone } : {})}
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
      <span className="font-display text-[9px] uppercase tracking-[0.18em] text-ivory/85">
        {label}
      </span>
      {hasChips && (
        <span
          className="font-mono text-[10px] font-bold tabular-nums text-gold-bright"
          data-chip-total
        >
          {amount.toLocaleString()}
        </span>
      )}
      {hasChips && onRemove && (
        <button
          type="button"
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-casino-red text-[8px] text-ivory hover:bg-red-400"
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
      {flashTone === 'win' && typeof payoutChips === 'number' && payoutChips > 0 && (
        <span
          className="absolute -right-2 -top-2 rounded-full bg-gold-bright px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-felt-deep shadow-md"
          data-payout-badge
        >
          +{payoutChips.toLocaleString()}
        </span>
      )}
    </div>
  );
}
