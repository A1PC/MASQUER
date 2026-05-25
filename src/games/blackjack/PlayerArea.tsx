import type { JSX } from 'react';
import HandView from './HandView';
import { handTotal } from './hand';
import { Badge, Panel, cn } from '@/components/ui';
import type { Hand as HandType, Outcome } from './types';

interface HandSettlement {
  readonly outcome: Outcome;
  readonly payout: number;
  readonly fiveCardCharlie: boolean;
}

interface Props {
  hands: readonly HandType[];
  activeHandIdx: number;
  inSettlement: boolean;
  /** Per-hand settlement results — provided only when inSettlement is true.
   *  Indexed alongside `hands[]`. */
  settlements?: readonly HandSettlement[];
  /** Per-hand index of the first NEW card this render (everything before is
   *  already on the table and renders statically). Length matches `hands`. */
  firstAnimatedIdxPerHand?: readonly number[];
  /** Per-hand array of per-card stagger delays in ms. Outer length matches
   *  `hands`; inner length matches that hand's `cards`. Used for opening-deal
   *  P1/P2 stagger. */
  delaysMsPerHand?: readonly (readonly number[] | undefined)[];
  /** Per-hand array of per-card highlight flags. Indexed alongside cards.
   *  Used by the inline Ace panel to ring the card being valued. */
  highlightsPerHand?: readonly (readonly boolean[] | undefined)[];
  /** Card-landing callback — receives `(handIdx, cardIdx)`. Used by the page
   *  to play `card.deal` on LANDING. */
  onCardLanded?: (handIdx: number, cardIdx: number) => void;
}

const OUTCOME_LABEL: Record<Outcome, string> = {
  'player-blackjack': 'BLACKJACK',
  'player-win': 'WIN',
  push: 'PUSH',
  'player-loss': 'LOSS',
  'player-bust': 'BUST',
};

function toneFor(outcome: Outcome): 'win' | 'loss' | 'neutral' {
  if (outcome === 'player-blackjack' || outcome === 'player-win') return 'win';
  if (outcome === 'push') return 'neutral';
  return 'loss';
}

export default function PlayerArea({
  hands,
  activeHandIdx,
  inSettlement,
  settlements,
  firstAnimatedIdxPerHand,
  delaysMsPerHand,
  highlightsPerHand,
  onCardLanded,
}: Props): JSX.Element {
  const handCount = hands.length;
  const cardSize = handCount > 1 ? 'md' : 'lg';
  return (
    <div className="flex flex-wrap justify-center gap-3.5" role="group" aria-label="Your hands">
      {hands.map((h, i) => {
        const total = handTotal(h.cards).value;
        const isActive = !inSettlement && i === activeHandIdx;
        const isResolved = h.resolved;
        const settlement = settlements?.[i];
        const firstAnimated = firstAnimatedIdxPerHand?.[i];
        const delays = delaysMsPerHand?.[i];
        const highlights = highlightsPerHand?.[i];
        return (
          <Panel
            key={i}
            surface="felt"
            className={cn(
              'p-3 text-center transition-shadow duration-200',
              isActive
                ? 'shadow-[0_0_18px_rgba(230,192,104,0.35)] outline outline-2 outline-gold'
                : isResolved && !isActive
                  ? 'opacity-70'
                  : 'opacity-90',
            )}
            aria-current={isActive ? 'true' : undefined}
            aria-label={`Hand ${i + 1}, total ${total}${isActive ? ', active' : ''}`}
          >
            <div
              className={cn(
                'mb-1 flex items-center justify-center gap-1.5 font-display text-[10px] tracking-[0.18em]',
                isActive ? 'text-gold-bright' : 'text-gold',
              )}
            >
              {isActive && <span aria-hidden>▶</span>}
              <span>
                HAND {i + 1} · {total}
              </span>
            </div>
            <div className="flex justify-center">
              <HandView
                cards={h.cards}
                size={cardSize}
                {...(firstAnimated !== undefined ? { firstAnimatedIdx: firstAnimated } : {})}
                {...(delays ? { delaysMs: delays } : {})}
                {...(highlights ? { highlights } : {})}
                {...(onCardLanded ? { onCardLanded: (cardIdx) => onCardLanded(i, cardIdx) } : {})}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-center gap-2 font-mono text-[10px] text-ivory/80">
              <span>Bet: {h.betAmount}</span>
              {h.doubled && (
                <Badge tone="info" className="px-1.5 py-0">
                  Doubled
                </Badge>
              )}
            </div>
            {settlement && (
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                <Badge tone={toneFor(settlement.outcome)}>
                  {OUTCOME_LABEL[settlement.outcome]}
                </Badge>
                {settlement.fiveCardCharlie && (
                  <Badge tone="win" icon="Sparkles" aria-label="Five Card Charlie bonus">
                    5-Card Charlie
                  </Badge>
                )}
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}
