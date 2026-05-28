import type { JSX } from 'react';
import { Link } from 'react-router';

interface Props {
  /** Optional game name; if provided, message + CTA target that game. */
  gameName?: string;
  /** URL the CTA navigates to. Defaults to '/lobby'. */
  ctaTo?: string;
}

export default function EmptyState({ gameName, ctaTo }: Props): JSX.Element {
  const message = gameName
    ? `No ${gameName} rounds yet — try it!`
    : 'No rounds yet — pick a game from the lobby and your stats will appear here.';
  const buttonText = gameName ? `Play ${gameName}` : 'Visit lobby';
  const target = ctaTo ?? '/lobby';
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-md border border-brass/60 bg-velvet-deep px-6 py-12 text-center"
      data-empty-state
    >
      <p className="text-sm text-ivory/70">{message}</p>
      <Link
        to={target}
        className="rounded-sm border-2 border-brass bg-velvet px-4 py-2 font-display text-xs tracking-[0.18em] text-gold-bright hover:bg-velvet-deep"
      >
        {buttonText} →
      </Link>
    </div>
  );
}
