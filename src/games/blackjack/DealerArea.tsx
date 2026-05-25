import type { JSX } from 'react';
import HandView from './HandView';
import { Panel } from '@/components/ui';
import type { Card } from './types';

interface Props {
  cards: readonly Card[];
  holeRevealed: boolean;
  /** Indexes of cards in `cards` that are new this render and should fly in
   *  from the deck anchor. Cards before this index render statically. */
  firstAnimatedIdx?: number;
  /** Per-card stagger delays (ms) — only consulted for animated indexes.
   *  Used during the opening deal to sequence P1/D1/P2/D2. */
  delaysMs?: readonly number[];
  /** Card-landing callback used by the page to play `card.deal` on LANDING. */
  onCardLanded?: (idx: number) => void;
}

/**
 * Dealer table strip — renders the dealer's hand and (per Phase-15 #5 fix)
 * intentionally OMITS the dealer total text. The face-up cards' rank/suit are
 * enough; showing a running total telegraphs the math and dampens the duel
 * feel. The hole card stays face-down until `holeRevealed` flips (the
 * machine's `revealHoleCard` action runs on dealer_check or natural-BJ peek).
 */
export default function DealerArea({
  cards,
  holeRevealed,
  firstAnimatedIdx,
  delaysMs,
  onCardLanded,
}: Props): JSX.Element {
  return (
    <Panel surface="felt" className="w-full max-w-[520px] px-5 py-4 text-center">
      <div className="mx-auto mb-2 flex max-w-[320px] items-baseline justify-center">
        <span className="font-display text-[11px] tracking-[0.18em] text-gold">DEALER</span>
      </div>
      <div className="flex justify-center">
        <HandView
          cards={cards}
          size="lg"
          {...(!holeRevealed ? { faceDownIdx: 1 } : {})}
          {...(firstAnimatedIdx !== undefined ? { firstAnimatedIdx } : {})}
          {...(delaysMs ? { delaysMs } : {})}
          {...(onCardLanded ? { onCardLanded } : {})}
        />
      </div>
    </Panel>
  );
}
