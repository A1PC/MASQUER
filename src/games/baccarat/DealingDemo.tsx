import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import HandView from './HandView';
import type { Card } from '@/games/blackjack/types';

const SAMPLE_PLAYER: Card[] = [
  { rank: '9', suit: '♣', faceUp: true },
  { rank: '7', suit: '♦', faceUp: true },
  { rank: '4', suit: '♥', faceUp: true },
];

const SAMPLE_BANKER: Card[] = [
  { rank: 'K', suit: '♠', faceUp: true },
  { rank: '5', suit: '♥', faceUp: true },
];

/**
 * Dev-only static page to eyeball the dealing animation. NOT routed.
 * To use temporarily, add `{ path: 'dev/baccarat-dealing', element: <DealingDemo /> }`
 * to the router in a local branch.
 */
export default function DealingDemo(): JSX.Element {
  const [playerRevealed, setPlayerRevealed] = useState(0);
  const [bankerRevealed, setBankerRevealed] = useState(0);

  useEffect(() => {
    const steps: Array<() => void> = [
      () => setPlayerRevealed(1),
      () => setBankerRevealed(1),
      () => setPlayerRevealed(2),
      () => setBankerRevealed(2),
      () => setPlayerRevealed(3),
    ];
    const ids = steps.map((s, i) => window.setTimeout(s, 600 * (i + 1)));
    return () => {
      ids.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center gap-12 bg-felt-deep p-12">
      <HandView label="PLAYER" cards={SAMPLE_PLAYER} revealedCount={playerRevealed} />
      <HandView label="BANKER" cards={SAMPLE_BANKER} revealedCount={bankerRevealed} />
    </div>
  );
}
