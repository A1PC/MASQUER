import type { JSX } from 'react';
import type { SeatState } from './machine';
import PlayingCard from '../_shared/PlayingCard';
import MaskAvatar from '../_shared/MaskAvatar';

interface Props {
  seat: SeatState;
  isButton: boolean;
  isSb: boolean;
  isBb: boolean;
  isActing: boolean;
  /** Cards to highlight as part of the winning best-5 */
  highlightCards?: boolean;
  /** Position label for layout orientation */
  position?: 'top' | 'bottom';
}

export default function Seat({
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

  const isFolded = seat.status === 'folded';
  const isAllIn = seat.status === 'all-in';
  const isBusted = seat.status === 'busted';
  const isEmpty = seat.status === 'empty';

  const actingRing = isActing
    ? 'ring-2 ring-gold-bright shadow-[0_0_12px_rgba(232,189,109,0.6)]'
    : '';
  const foldedDim = isFolded ? 'opacity-40' : '';
  const bustedDim = isBusted || isEmpty ? 'opacity-30' : '';

  // For AI seats (seatId >= 1), show face-down unless showdown revealed them.
  const showFaceUp = isYou || highlightCards;

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

      {/* Cards */}
      <div className={`flex gap-1 ${position === 'bottom' ? 'flex-row' : 'flex-row'}`}>
        {seat.holeCards.length >= 2 ? (
          <>
            <PlayingCard
              card={seat.holeCards[0]!}
              {...(showFaceUp ? {} : { faceDown: true })}
              size="mini"
              {...(highlightCards ? { highlight: true } : {})}
            />
            <PlayingCard
              card={seat.holeCards[1]!}
              {...(showFaceUp ? {} : { faceDown: true })}
              size="mini"
              {...(highlightCards ? { highlight: true } : {})}
            />
          </>
        ) : (
          <>
            <PlayingCard card={null} size="mini" />
            <PlayingCard card={null} size="mini" />
          </>
        )}
      </div>

      {/* State badges */}
      {isAllIn && (
        <span
          className="text-[9px] font-display tracking-[0.18em] text-gold-bright"
          data-allin-badge
        >
          ALL-IN
        </span>
      )}
      {isFolded && (
        <span className="text-[9px] font-display tracking-[0.18em] text-ivory/55" data-folded-badge>
          FOLDED
        </span>
      )}
      {isBusted && (
        <span
          className="text-[9px] font-display tracking-[0.18em] text-casino-red"
          data-busted-badge
        >
          BUSTED
        </span>
      )}
    </div>
  );
}
