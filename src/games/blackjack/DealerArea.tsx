import type { JSX } from 'react';
import HandView from './HandView';
import { handTotal } from './hand';
import type { Card } from './types';

interface Props {
  cards: readonly Card[];
  holeRevealed: boolean;
}

export default function DealerArea({ cards, holeRevealed }: Props): JSX.Element {
  const visibleForTotal = holeRevealed ? cards : cards.slice(0, 1);
  const total = visibleForTotal.length > 0 ? handTotal(visibleForTotal).value : 0;
  const totalLabel = holeRevealed ? `total ${total}` : `showing ${total}`;
  return (
    <div className="text-center">
      <div className="mx-auto mb-2 flex max-w-[300px] items-baseline justify-between">
        <span className="font-display text-[10px] tracking-[1.5px] text-gold">DEALER</span>
        <span className="font-mono text-[11px] text-white/65">{totalLabel}</span>
      </div>
      <div className="flex justify-center">
        <HandView cards={cards} {...(!holeRevealed ? { faceDownIdx: 1 } : {})} />
      </div>
    </div>
  );
}
