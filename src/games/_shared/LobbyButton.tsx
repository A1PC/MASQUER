import type { JSX } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/components/ui';

interface Props {
  /** Optional tailwind classes appended to the button (positioning, layout). */
  className?: string;
  /** Optional override label. Defaults to "BACK TO LOBBY". */
  label?: string;
  /** Route to navigate to. Defaults to "/" (which redirects to /lobby via the
   *  router index route). */
  to?: string;
}

/**
 * `LobbyButton` — shared per-game "back to lobby" CTA.
 *
 * Renders a `<Link>` styled as a velvet (oxblood-red) button with an ivory
 * label and ArrowLeft glyph. Used at the top of every game page that has been
 * upgraded for Phase 15. ≥44px tall to meet HIG/Material touch-target rules,
 * `focus-visible:ring` for keyboard users, and explicit `aria-label` so the
 * link reads clearly to assistive tech even when wrapped in icon-decoration.
 *
 * Tokens (from `src/theme/tokens.ts` / `tailwind.config.ts`):
 *   bg-velvet / hover:bg-velvet-deep — the MASQUER oxblood pair
 *   text-ivory — the brand off-white
 *   border-brass — the warm gold frame
 *   focus-visible:ring-gold — keyboard focus ring
 */
export default function LobbyButton({
  className,
  label = 'BACK TO LOBBY',
  to = '/',
}: Props): JSX.Element {
  return (
    <Link
      to={to}
      aria-label={label}
      className={cn(
        // layout / touch target
        'inline-flex min-h-[44px] items-center gap-2 rounded-md px-4 py-2',
        // surface — oxblood (velvet) on velvet-deep hover, brass frame for contrast
        'bg-velvet text-ivory border border-brass/70',
        'hover:bg-velvet-deep hover:border-brass',
        // typography — display face, tracked uppercase
        'font-display text-xs uppercase tracking-[0.18em]',
        // focus / motion
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-felt-deep',
        className,
      )}
    >
      <ArrowLeft size={16} aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
