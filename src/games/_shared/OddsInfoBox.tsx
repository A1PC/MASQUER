import type { JSX, ReactNode } from 'react';
import { cn } from '@/components/ui';

interface Props {
  /** Optional uppercase eyebrow title above the body. Defaults to "ODDS & PAYOUTS". */
  title?: string | null;
  /** Payout / odds summary body (string or arbitrary ReactNode). */
  children: ReactNode;
  /** Extra tailwind classes appended to the wrapper. */
  className?: string;
}

/**
 * `OddsInfoBox` — self-contained card summarising payouts/odds for the active
 * game. Sits beside the Rules button on each game page so players see the
 * cash math at a glance without opening the full Rules modal.
 *
 * Visual: felt-table-deep background, brass hairline border, ivory body text,
 * gold display-typography eyebrow. Standalone — does NOT nest inside a Panel
 * (the spec calls for a "self-contained card, not a panel-within-panel").
 *
 * Tokens (`src/theme/tokens.ts`):
 *   bg-felt-table-deep — the deep felt green
 *   text-ivory — body
 *   text-gold — eyebrow title
 *   border-brass/60 — hairline frame
 */
export default function OddsInfoBox({
  title = 'ODDS & PAYOUTS',
  children,
  className,
}: Props): JSX.Element {
  return (
    <div
      className={cn(
        'inline-flex flex-col gap-1 rounded-md border border-brass/60 bg-felt-table-deep px-4 py-2.5',
        'shadow-[0_1px_0_rgba(0,0,0,0.35)]',
        className,
      )}
      role="group"
      aria-label={title ?? 'Odds and payouts'}
    >
      {title !== null && title !== '' && (
        <h3 className="font-display text-[10px] uppercase tracking-[0.18em] text-gold">{title}</h3>
      )}
      <div className="font-body text-xs leading-relaxed text-ivory">{children}</div>
    </div>
  );
}
