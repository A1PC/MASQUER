import type { JSX } from 'react';
import type { DrawSeatState } from './machine';
import PlayingCard from '../_shared/PlayingCard';

interface Props {
  seat: DrawSeatState;
  isButton: boolean;
  isSb: boolean;
  isBb: boolean;
  isActing: boolean;
  /** Show all cards face-up (at showdown) */
  highlightCards?: boolean;
  /** Position label for layout orientation */
  position?: 'top' | 'bottom';
  /** Label shown after the draw phase (e.g. "drew 2" / "stood pat") */
  drewLabel?: string;
}

export default function DrawSeat({
  seat,
  isButton,
  isSb,
  isBb,
  isActing,
  highlightCards = false,
  position = 'top',
  drewLabel,
}: Props): JSX.Element {
  const isYou = seat.occupant === 'you';
  const name = seat.occupant === 'you' ? 'YOU' : seat.occupant.name;
  const archetype = seat.occupant === 'you' ? null : seat.occupant.archetype.toUpperCase();

  const isFolded = seat.status === 'folded';
  const isAllIn = seat.status === 'all-in';
  const isBusted = seat.status === 'busted';
  const isEmpty = seat.status === 'empty';

  const actingRing = isActing ? 'ring-2 ring-neon-cyan shadow-[0_0_12px_rgba(61,240,255,0.6)]' : '';
  const foldedDim = isFolded ? 'opacity-40' : '';
  const bustedDim = isBusted || isEmpty ? 'opacity-30' : '';

  // For AI seats (seatId >= 1), show face-down unless showdown revealed them
  const showFaceUp = isYou || highlightCards;

  // Five-card draw: render up to 5 cards (or 2 placeholders for empty seats)
  const cardCount = seat.holeCards.length;
  const displayCount = cardCount > 0 ? cardCount : 5;

  return (
    <div
      data-seat={seat.seatId}
      {...(isActing ? { 'data-acting': '' } : {})}
      className={`relative flex flex-col items-center gap-1 rounded-lg border border-gold/20 bg-felt-deep/80 px-3 py-2
        ${actingRing} ${foldedDim} ${bustedDim}`}
    >
      {/* Status badges */}
      <div className="flex items-center gap-1 text-[10px] font-display tracking-wider">
        {isButton && (
          <span className="rounded bg-gold px-1 text-felt-deep" data-button-badge>
            D
          </span>
        )}
        {isSb && (
          <span className="rounded bg-neon-cyan/70 px-1 text-felt-deep" data-sb-badge>
            SB
          </span>
        )}
        {isBb && (
          <span className="rounded bg-neon-magenta/70 px-1 text-felt-deep" data-bb-badge>
            BB
          </span>
        )}
      </div>

      {/* Name + archetype */}
      <div className="flex flex-col items-center leading-none">
        <span
          className={`font-display text-[11px] tracking-wider ${isYou ? 'text-gold-bright' : 'text-white'}`}
          data-seat-name
        >
          {name}
        </span>
        {archetype && <span className="text-[9px] text-white/50">{archetype}</span>}
      </div>

      {/* Stack */}
      <span className="font-mono text-[12px] tabular-nums text-gold" data-seat-stack>
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

      {/* Drew label — shows after draw phase */}
      {drewLabel && (
        <span className="text-[9px] font-display tracking-widest text-neon-cyan" data-drew-label>
          {drewLabel}
        </span>
      )}

      {/* State badges */}
      {isAllIn && (
        <span className="text-[9px] font-display tracking-widest text-neon-cyan" data-allin-badge>
          ALL-IN
        </span>
      )}
      {isFolded && (
        <span className="text-[9px] font-display tracking-widest text-white/50" data-folded-badge>
          FOLDED
        </span>
      )}
      {isBusted && (
        <span className="text-[9px] font-display tracking-widest text-casino-red" data-busted-badge>
          BUSTED
        </span>
      )}
    </div>
  );
}
