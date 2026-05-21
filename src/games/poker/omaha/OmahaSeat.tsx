import type { JSX } from 'react';
import type { OmahaSeatState } from './machine';
import PlayingCard from '../_shared/PlayingCard';

interface Props {
  seat: OmahaSeatState;
  isButton: boolean;
  isSb: boolean;
  isBb: boolean;
  isActing: boolean;
  /** Cards to highlight as part of the winning best-5 */
  highlightCards?: boolean;
  /** Position label for layout orientation */
  position?: 'top' | 'bottom';
}

export default function OmahaSeat({
  seat,
  isButton,
  isSb,
  isBb,
  isActing,
  highlightCards = false,
  position = 'top',
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
  // (caller passes cards directly — if they're populated from handResult, they show face-up)
  const showFaceUp = isYou || highlightCards;

  // Omaha deals 4 hole cards. AI seats use a smaller card size to keep layout compact.
  const cardSize = position === 'top' ? ('mini' as const) : ('hole' as const);

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

      {/* 4 hole cards */}
      <div className="flex gap-1">
        {seat.holeCards.length >= 4 ? (
          <>
            {seat.holeCards.map((card, i) => (
              <PlayingCard
                key={i}
                card={card}
                {...(showFaceUp ? {} : { faceDown: true })}
                size={cardSize}
                {...(highlightCards ? { highlight: true } : {})}
              />
            ))}
          </>
        ) : (
          <>
            <PlayingCard card={null} size={cardSize} />
            <PlayingCard card={null} size={cardSize} />
            <PlayingCard card={null} size={cardSize} />
            <PlayingCard card={null} size={cardSize} />
          </>
        )}
      </div>

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
