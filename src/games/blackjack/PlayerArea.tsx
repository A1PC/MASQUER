import type { JSX } from 'react';
import HandView from './HandView';
import { handTotal } from './hand';
import type { Hand as HandType } from './types';

interface Props {
  hands: readonly HandType[];
  activeHandIdx: number;
  inSettlement: boolean;
}

export default function PlayerArea({ hands, activeHandIdx, inSettlement }: Props): JSX.Element {
  return (
    <div className="flex justify-center gap-4">
      {hands.map((h, i) => {
        const total = handTotal(h.cards).value;
        const isActive = !inSettlement && i === activeHandIdx;
        const isResolved = h.resolved;
        return (
          <div
            key={i}
            className={`rounded-lg p-2 text-center ${
              isActive
                ? 'border-2 border-neon-cyan bg-neon-cyan/5 shadow-[0_0_14px_rgba(61,240,255,0.25)]'
                : 'border-2 border-gold/25 opacity-65'
            } ${isResolved && !isActive ? 'opacity-55' : ''}`}
          >
            <div
              className={`mb-1 font-display text-[9px] tracking-[1.5px] ${isActive ? 'text-neon-cyan' : 'text-gold'}`}
            >
              {isActive ? '▶ ' : ''}
              HAND {i + 1} · {total}
            </div>
            <HandView cards={h.cards} />
            <div className="mt-1.5 font-mono text-[10px] text-gold-bright">Bet: {h.betAmount}</div>
          </div>
        );
      })}
    </div>
  );
}
