import type { JSX } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui';
import PlayingCard from '../_shared/PlayingCard';
import type { Card } from '../_shared/types';

interface Props {
  holeCards: Card[]; // exactly 5
  onDraw: (indices: number[]) => void;
  disabled?: boolean;
}

export default function DiscardControls({
  holeCards,
  onDraw,
  disabled = false,
}: Props): JSX.Element {
  const [marked, setMarked] = useState<number[]>([]);

  function toggle(i: number): void {
    if (disabled) return;
    setMarked((cur) => {
      if (cur.includes(i)) return cur.filter((x) => x !== i);
      if (cur.length >= 3) return cur; // cap 3 — block the 4th
      return [...cur, i];
    });
  }

  return (
    <div className="flex flex-col items-center gap-3" data-discard-controls>
      <div className="flex gap-2">
        {holeCards.map((card, i) => {
          const isMarked = marked.includes(i);
          return (
            // Toggle-card buttons stay as raw <button>: aria-pressed semantics
            // (cf. lottery NumberGrid) + the shared <Button> would force the
            // gradient/uppercase chrome and a ui.click on every mark/unmark
            // (5 cards × repeated taps = audio spam). We do adopt the gold
            // focus-ring + disabled treatment for consistency with the
            // brand-tokened surfaces around it.
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              disabled={disabled}
              aria-pressed={isMarked}
              aria-label={`${isMarked ? 'Unmark' : 'Mark'} card ${i + 1} for discard`}
              className={[
                'rounded-md transition motion-safe:transition-transform',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-felt-table-deep',
                'disabled:cursor-not-allowed disabled:opacity-40',
                isMarked
                  ? 'translate-y-2 opacity-50 grayscale ring-2 ring-gold-bright'
                  : 'hover:-translate-y-1',
              ].join(' ')}
              data-card-index={i}
              data-marked={isMarked}
            >
              <PlayingCard card={card} size="hole" />
            </button>
          );
        })}
      </div>
      <span className="text-[11px] text-ivory/85" data-discard-caption>
        Select up to 3 cards to replace
      </span>
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={() => onDraw(marked)}
        disabled={disabled}
        className="rounded-md border-2 border-brass bg-velvet text-ivory font-display tracking-[0.18em] hover:bg-velvet-deep"
        data-draw-button
      >
        {marked.length === 0 ? 'STAND PAT' : `DRAW ${marked.length}`}
      </Button>
    </div>
  );
}
