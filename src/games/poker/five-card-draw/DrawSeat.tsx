import type { JSX } from 'react';
import type { DrawSeatState } from './machine';
import type { HandRank, HandCategory } from '../_shared/types';
import PlayingCard from '../_shared/PlayingCard';
import MaskAvatar from '../_shared/MaskAvatar';

interface Props {
  seat: DrawSeatState;
  isButton: boolean;
  isSb: boolean;
  isBb: boolean;
  isActing: boolean;
  /** Cards to highlight as part of the winning best-5 */
  highlightCards?: boolean;
  /** Post-hand reveal — flips AI cards face-up without the winner ring. */
  revealHoleCards?: boolean;
  /** Hand category label shown beneath the cards. Only set during post-hand reveal. */
  handRank?: HandRank;
  /** Position label for layout orientation */
  position?: 'top' | 'bottom';
  /** Label shown after the draw phase (e.g. "drew 2" / "stood pat") */
  drewLabel?: string;
}

const HAND_CATEGORY_LABEL: Record<HandCategory, string> = {
  'high-card': 'High Card',
  pair: 'Pair',
  'two-pair': 'Two Pair',
  trips: 'Three of a Kind',
  straight: 'Straight',
  flush: 'Flush',
  'full-house': 'Full House',
  quads: 'Four of a Kind',
  'straight-flush': 'Straight Flush',
};

export default function DrawSeat({
  seat,
  isButton,
  isSb,
  isBb,
  isActing,
  highlightCards = false,
  revealHoleCards = false,
  handRank,
  position = 'top',
  drewLabel,
}: Props): JSX.Element {
  const isYou = seat.occupant === 'you';
  const name = seat.occupant === 'you' ? 'YOU' : seat.occupant.name;

  const isFolded = seat.status === 'folded';
  const isAllIn = seat.status === 'all-in';
  const isBusted = seat.status === 'busted';
  const isEmpty = seat.status === 'empty';

  const actingRing = isActing
    ? 'ring-2 ring-gold-bright shadow-[0_0_12px_rgba(232,189,109,0.6)]'
    : '';
  const foldedDim = isFolded ? 'opacity-40' : '';
  const bustedDim = isBusted || isEmpty ? 'opacity-30' : '';

  // For AI seats (seatId >= 1), show face-down unless the post-hand reveal is
  // active OR they were already shown as part of the showdown winner highlight.
  const showFaceUp = isYou || highlightCards || revealHoleCards;

  // Five-card draw: render up to 5 cards (or 5 placeholders for empty seats)
  const cardCount = seat.holeCards.length;
  const displayCount = cardCount > 0 ? cardCount : 5;

  return (
    <div
      data-seat={seat.seatId}
      {...(isActing ? { 'data-acting': '' } : {})}
      className={[
        'relative flex flex-col items-center gap-1 rounded-lg border border-brass/40 bg-velvet-deep/70 px-3 py-2',
        actingRing,
        foldedDim,
        bustedDim,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Status badges */}
      <div className="flex items-center gap-1 text-[10px] font-display tracking-[0.18em]">
        {isButton && (
          <span className="rounded bg-gold px-1 text-felt-deep" data-button-badge>
            D
          </span>
        )}
        {isSb && (
          <span className="rounded bg-brass/80 px-1 text-felt-deep" data-sb-badge>
            SB
          </span>
        )}
        {isBb && (
          <span className="rounded bg-gold-bright px-1 text-felt-deep" data-bb-badge>
            BB
          </span>
        )}
      </div>

      {/* Avatar + name (archetype hidden — mask name only) */}
      <div className="flex flex-col items-center gap-1 leading-none">
        {!isYou && <MaskAvatar name={name} active={isActing} size="sm" />}
        <span
          className={[
            'font-display text-[11px] tracking-[0.18em]',
            isYou ? 'text-gold-bright' : 'text-ivory/85',
          ].join(' ')}
          data-seat-name
        >
          {name}
        </span>
      </div>

      {/* Stack */}
      <span className="font-mono text-[12px] tabular-nums text-gold-bright" data-seat-stack>
        {seat.stack.toLocaleString()}
      </span>

      {/* Cards — 5 for five-card draw */}
      <div
        className={`flex gap-0.5 ${position === 'bottom' ? 'flex-row' : 'flex-row'}`}
        data-hole-cards
      >
        {cardCount >= 5
          ? seat.holeCards
              .slice(0, 5)
              .map((card, i) => (
                <PlayingCard
                  key={i}
                  card={card}
                  {...(showFaceUp ? {} : { faceDown: true })}
                  size="mini"
                  {...(highlightCards ? { highlight: true } : {})}
                />
              ))
          : // Empty hand — show 5 blank placeholders
            Array.from({ length: displayCount }, (_, i) => (
              <PlayingCard key={i} card={null} size="mini" />
            ))}
      </div>

      {/* Hand category — only rendered post-hand (parent passes handRank only
          during post-hand reveal). Never leaks during play. */}
      {handRank && (
        <span
          className="font-display text-[9px] tracking-[0.18em] text-gold-bright"
          data-seat-hand-category={handRank.category}
        >
          {HAND_CATEGORY_LABEL[handRank.category]}
        </span>
      )}

      {/* Drew label — shows after draw phase */}
      {drewLabel && (
        <span className="font-display text-[9px] tracking-[0.18em] text-ivory/85" data-drew-label>
          {drewLabel}
        </span>
      )}

      {/* State badges */}
      {isAllIn && (
        <span
          className="font-display text-[9px] tracking-[0.18em] text-gold-bright"
          data-allin-badge
        >
          ALL-IN
        </span>
      )}
      {isFolded && (
        <span className="font-display text-[9px] tracking-[0.18em] text-ivory/55" data-folded-badge>
          FOLDED
        </span>
      )}
      {isBusted && (
        <span
          className="font-display text-[9px] tracking-[0.18em] text-casino-red"
          data-busted-badge
        >
          BUSTED
        </span>
      )}
    </div>
  );
}
