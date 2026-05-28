import type { JSX } from 'react';
import CardReveal from './CardReveal';
import { handTotal } from './logic';
import type { Card } from '@/games/blackjack/types';
import { REVEAL_TIMING } from './config';

interface Props {
  /** "PLAYER" or "BANKER". */
  label: 'PLAYER' | 'BANKER';
  /** Cards dealt to this hand, in dealing order. */
  cards: readonly Card[];
  /** How many of the dealt cards have been revealed so far (UI-driven). */
  revealedCount: number;
  /** When true, the hand glows gold (winning side after settle). */
  highlight?: boolean;
  /** Optional callback when a card finishes its reveal — used by the page to step revealedCount forward. */
  onCardRevealed?: (index: number) => void;
}

/**
 * Player / Banker hand panel. Three card slots stay reserved so the
 * layout never shifts when a third card arrives. Tokenised brass + felt
 * with a gold glow on the winning side.
 */
export default function HandView({
  label,
  cards,
  revealedCount,
  highlight = false,
  onCardRevealed,
}: Props): JSX.Element {
  // Always render 3 slots so the layout doesn't shift when a third card arrives.
  const slots = [0, 1, 2];
  const visibleCards = cards.slice(0, revealedCount);
  const total = handTotal(visibleCards);

  return (
    <div
      className={[
        'flex flex-col items-center gap-2 rounded-md border px-3 py-3 transition-shadow duration-200',
        highlight
          ? 'border-brass bg-gold/5 shadow-gold-glow'
          : 'border-brass/40 bg-felt-table-deep',
      ].join(' ')}
      data-baccarat-hand={label.toLowerCase()}
    >
      <div className="flex items-center gap-3 font-display text-xs uppercase tracking-[0.2em] text-gold-bright">
        <span>{label}</span>
        <span className="text-ivory/80">·</span>
        <span className="tabular-nums text-ivory">{total}</span>
      </div>
      <div className="flex gap-2">
        {slots.map((i) => {
          const c = cards[i] ?? null;
          const baseDelay =
            i === 0
              ? 0
              : i === 1
                ? REVEAL_TIMING.pauseBetweenCards + REVEAL_TIMING.cardSlideIn
                : REVEAL_TIMING.pauseBeforeThirdCard;
          return (
            <CardReveal
              key={i}
              card={c}
              revealed={i < revealedCount}
              delayMs={baseDelay}
              onRevealDone={() => onCardRevealed?.(i)}
            />
          );
        })}
      </div>
      {revealedCount < cards.length && (
        <div className="text-xs uppercase tracking-wider text-gold-bright/70">DRAW</div>
      )}
    </div>
  );
}
