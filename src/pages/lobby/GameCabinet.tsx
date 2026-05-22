import type { JSX } from 'react';
import { Link } from 'react-router';
import { Icon, cn } from '@/components/ui';
import type { IconName } from '@/components/ui';

interface BaseProps {
  /** Lucide icon for the game (from `NAV_ICON`). */
  iconName: IconName;
  /** Game name, rendered in Cinzel. */
  label: string;
  /** Optional sub-line under the label (e.g. "2 tickets" or "Play now"). */
  status?: string;
}

type GameCabinetProps =
  | (BaseProps & { to: string; onClick?: never })
  | (BaseProps & { onClick: () => void; to?: never });

/** The deco-frame cabinet surface — mirrors the #1 `Card` `variant="deco"
 *  surface="velvet"` look (outer brass border + inset gold hairline) but applied
 *  directly to the interactive element so the whole tile is one accessible
 *  link/button (hit target well over 44px). Hover/press lift is transform-only
 *  (no layout shift) and motion-safe, so reduced-motion users get a static card. */
const CABINET_CLASS = cn(
  'group relative flex h-full min-h-[116px] flex-col items-center justify-center gap-2 rounded-xl p-5 text-center',
  'border border-brass bg-gradient-to-b from-velvet/40 to-velvet-deep/60',
  "before:pointer-events-none before:absolute before:inset-1.5 before:rounded-lg before:border before:border-brass/40 before:content-['']",
  'transition-transform duration-150 motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.98]',
  'hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-felt-deep',
);

function CabinetInner({ iconName, label, status }: BaseProps): JSX.Element {
  return (
    <>
      <Icon
        name={iconName}
        size={30}
        className="text-gold transition-colors group-hover:text-gold-bright"
      />
      <span className="font-display text-[13px] uppercase tracking-[0.08em] text-gold">
        {label}
      </span>
      {status ? <span className="text-[10px] font-light text-ivory/55">{status}</span> : null}
    </>
  );
}

/** A single game tile: a deco-framed card with the game icon, name, and optional
 *  status. Provide `to` for a route, or `onClick` for games that open a variant
 *  modal (poker/bingo) — preserving the lobby's existing per-game launch flow. */
export default function GameCabinet(props: GameCabinetProps): JSX.Element {
  const { iconName, label, status } = props;
  const base: BaseProps = status === undefined ? { iconName, label } : { iconName, label, status };
  const accessibleName = `${label}${status ? ` — ${status}` : ''}`;

  if (props.onClick) {
    return (
      <button
        type="button"
        onClick={props.onClick}
        aria-label={accessibleName}
        className={CABINET_CLASS}
      >
        <CabinetInner {...base} />
      </button>
    );
  }

  return (
    <Link to={props.to} aria-label={accessibleName} className={CABINET_CLASS}>
      <CabinetInner {...base} />
    </Link>
  );
}
