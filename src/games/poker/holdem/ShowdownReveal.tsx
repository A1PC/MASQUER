import type { JSX } from 'react';
import type { HandResult, SeatState } from './machine';
import type { Card } from '../_shared/types';
import type { HandCategory } from '../_shared/types';
import PlayingCard from '../_shared/PlayingCard';

interface Props {
  handResult: HandResult;
  seats: SeatState[];
}

const CATEGORY_LABELS: Record<HandCategory, string> = {
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

function isWinnerSeat(seatId: number, winners: HandResult['winners']): boolean {
  return winners.some((w) => w.seatId === seatId);
}

function cardKey(card: Card, idx: number): string {
  return `${card.rank}${card.suit}${idx}`;
}

export default function ShowdownReveal({ handResult, seats }: Props): JSX.Element {
  const { winners, revealedHands } = handResult;

  return (
    <div className="flex flex-col gap-4" data-showdown-reveal>
      {/* Winner banner */}
      <div className="text-center font-display text-base tracking-widest text-gold-bright">
        {winners.length === 1 ? seatName(winners[0]!.seatId, seats) + ' WINS!' : 'SPLIT POT!'}
      </div>

      {/* Revealed hands */}
      <div className="flex flex-wrap justify-center gap-4">
        {revealedHands.map((revealed) => {
          const winner = isWinnerSeat(revealed.seatId, winners);
          const winnerEntry = winners.find((w) => w.seatId === revealed.seatId);
          const best5Set = new Set(
            (revealed.handRank?.best5 ?? []).map((c) => `${c.rank}${c.suit}`),
          );

          return (
            <div
              key={revealed.seatId}
              data-revealed-seat={revealed.seatId}
              className={`flex flex-col items-center gap-1 rounded-lg border p-2
                ${winner ? 'border-gold/60 bg-gold/5' : 'border-white/10 bg-felt-deep/50'}`}
            >
              <span
                className={`font-display text-[10px] tracking-wider ${winner ? 'text-gold' : 'text-white/60'}`}
              >
                {seatName(revealed.seatId, seats)}
                {winner && winnerEntry ? ` +${winnerEntry.awarded.toLocaleString()}` : ''}
              </span>

              <div className="flex gap-1">
                {revealed.holeCards.map((card, i) => {
                  const isInBest5 = best5Set.has(`${card.rank}${card.suit}`);
                  return (
                    <PlayingCard
                      key={cardKey(card, i)}
                      card={card}
                      size="hole"
                      {...(winner && isInBest5 ? { highlight: true } : {})}
                    />
                  );
                })}
              </div>

              {revealed.handRank && (
                <span
                  className="text-[10px] text-white/70"
                  data-hand-category={revealed.handRank.category}
                >
                  {CATEGORY_LABELS[revealed.handRank.category]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Side-pot breakdown */}
      {handResult.sidePots.length > 1 && (
        <div className="flex flex-col items-center gap-1">
          <span className="font-display text-[10px] tracking-wider text-white/50">SIDE POTS</span>
          {handResult.sidePots.map((sp, i) => (
            <span key={i} className="text-[10px] text-white/50">
              Pot {i + 1}: {sp.amount.toLocaleString()} (seats: {sp.eligibleSeatIds.join(', ')})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function seatName(seatId: number, seats: SeatState[]): string {
  const seat = seats.find((s) => s.seatId === seatId);
  if (!seat) return `Seat ${seatId}`;
  if (seat.occupant === 'you') return 'YOU';
  return seat.occupant.name;
}
