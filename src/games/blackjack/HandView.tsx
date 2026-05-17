import type { JSX } from 'react';
import Card from './Card';
import type { Card as CardType } from './types';

interface Props {
  cards: readonly CardType[];
  /** Index of a card to render face-down (typically dealer's hole card at index 1). */
  faceDownIdx?: number;
}

/** Renders a fanned stack of cards with -32px margin overlap (corners still visible). */
export default function HandView({ cards, faceDownIdx }: Props): JSX.Element {
  return (
    <div className="flex flex-row">
      {cards.map((c, i) => (
        <div key={i} className={i === 0 ? '' : '-ml-8'}>
          <Card card={c} faceDown={i === faceDownIdx} />
        </div>
      ))}
    </div>
  );
}
