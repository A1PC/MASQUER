import type { JSX } from 'react';
import { useState } from 'react';
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
        {holeCards.map((card, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            disabled={disabled}
            aria-pressed={marked.includes(i)}
            className={`transition ${marked.includes(i) ? 'translate-y-2 opacity-50 grayscale' : 'hover:-translate-y-1'}`}
            data-card-index={i}
            data-marked={marked.includes(i)}
          >
            <PlayingCard card={card} size="hole" />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onDraw(marked)}
        disabled={disabled}
        className="rounded-md border-2 border-gold bg-casino-red px-5 py-2 font-display text-sm tracking-wider text-white disabled:opacity-40"
        data-draw-button
      >
        {marked.length === 0 ? 'STAND PAT' : `DRAW ${marked.length}`}
      </button>
    </div>
  );
}
