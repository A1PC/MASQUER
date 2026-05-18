import type { JSX } from 'react';

interface Props {
  onClick: () => void;
}

/**
 * Bottom-left fixed button that opens the rules modal. Lives outside the
 * game-area flow so it's always visible regardless of game layout.
 */
export default function RulesButton({ onClick }: Props): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Show game rules"
      data-rules-button
      className="fixed bottom-4 left-4 z-30 rounded-full border-2 border-gold bg-felt-deep px-4 py-2 font-display text-[11px] tracking-[0.18em] text-gold shadow-gold-glow hover:bg-gold hover:text-felt-deep"
    >
      ? RULES
    </button>
  );
}
