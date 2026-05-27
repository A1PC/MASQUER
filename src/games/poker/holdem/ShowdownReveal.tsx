import type { JSX } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import { useSound } from '@/systems/sound/useSound';
import type { HandResult, SeatState } from './machine';
import type { Card, HandCategory } from '../_shared/types';
import PlayingCard from '../_shared/PlayingCard';

/** ms between each seat's hole-card flip during the left-to-right stagger. */
export const STAGGER_MS = 250;
/** ms the winning seat's gold-glow ring lingers after the reveal completes. */
export const WINNER_GLOW_MS = 600;

export type WinTier = 'small' | 'medium' | 'jackpot' | 'loss';

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

interface Props {
  handResult: HandResult;
  seats: SeatState[];
  /** Tier of the player's net result this hand. Drives the stinger sound. */
  winTier?: WinTier;
  /** Fired once the full reveal animation has finished. Used by `HoldemPage`
   *  to gate the auto-next-hand timer so we never schedule the next deal
   *  while the table is still revealing cards. */
  onRevealComplete?: () => void;
}

function seatName(seatId: number, seats: SeatState[]): string {
  const seat = seats.find((s) => s.seatId === seatId);
  if (!seat) return `Seat ${seatId}`;
  if (seat.occupant === 'you') return 'YOU';
  return seat.occupant.name;
}

function cardKey(card: Card, idx: number): string {
  return `${card.rank}${card.suit}${idx}`;
}

/**
 * Dramatic showdown reveal — per spec §4.5.
 *
 * Behaviour:
 *  1. At t=0 all seats render face-down.
 *  2. Reveals seats left-to-right (sorted by seatId), one every `STAGGER_MS`
 *     ms. Each flip fires `card.deal`.
 *  3. After the final flip, the winning seat(s) get a gold-glow ring for
 *     `WINNER_GLOW_MS` ms and the appropriate `win.{tier}` / `loss` stinger
 *     fires.
 *  4. `onRevealComplete` is invoked once the full sequence has settled (after
 *     the winner glow timer) so the parent page can gate auto-next-hand.
 *
 * Reduced motion: all seats revealed instantly + glow on immediately + single
 * batched sound; `onRevealComplete` fires synchronously.
 */
export default function ShowdownReveal({
  handResult,
  seats,
  winTier = 'loss',
  onRevealComplete,
}: Props): JSX.Element {
  const reduce = useEffectiveReducedMotion();
  const { play } = useSound();
  const { winners, revealedHands } = handResult;
  const winnerSeatIds = winners.map((w) => w.seatId);

  const [revealedSeatIds, setRevealedSeatIds] = useState<Set<number>>(new Set());
  const [winnerGlow, setWinnerGlow] = useState(false);
  const completedRef = useRef(false);

  // Sort revealed hands left-to-right (by seatId) for the stagger order.
  const orderedReveals = [...revealedHands].sort((a, b) => a.seatId - b.seatId);

  useEffect(() => {
    if (completedRef.current) return;
    completedRef.current = true;

    if (reduce) {
      // Reveal all instantly; static glow + single batched sound. Wrapped in
      // a microtask so the state updates land outside the effect body (per
      // react-hooks/set-state-in-effect).
      const t = setTimeout(() => {
        const allIds = new Set(orderedReveals.map((r) => r.seatId));
        setRevealedSeatIds(allIds);
        setWinnerGlow(true);
        play(winTier === 'loss' ? 'loss' : `win.${winTier}`);
        onRevealComplete?.();
      }, 0);
      return () => clearTimeout(t);
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    orderedReveals.forEach((rev, i) => {
      timers.push(
        setTimeout(() => {
          setRevealedSeatIds((prev) => {
            const next = new Set(prev);
            next.add(rev.seatId);
            return next;
          });
          play('card.deal');
        }, i * STAGGER_MS),
      );
    });
    const totalStagger = Math.max(1, orderedReveals.length) * STAGGER_MS;
    timers.push(
      setTimeout(() => {
        setWinnerGlow(true);
        play(winTier === 'loss' ? 'loss' : `win.${winTier}`);
      }, totalStagger),
    );
    timers.push(
      setTimeout(() => {
        onRevealComplete?.();
      }, totalStagger + WINNER_GLOW_MS),
    );
    return () => timers.forEach(clearTimeout);
    // Intentionally empty deps — this orchestrates a single mount/showdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4" data-showdown-reveal>
      {/* Winner banner */}
      <div className="text-center font-display text-base tracking-[0.18em] text-gold-bright">
        {winners.length === 1 ? `${seatName(winners[0]!.seatId, seats)} WINS!` : 'SPLIT POT!'}
      </div>

      {/* Revealed hands */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {orderedReveals.map((revealed) => {
          const isWinner = winnerSeatIds.includes(revealed.seatId);
          const isRevealed = revealedSeatIds.has(revealed.seatId);
          const glow = isWinner && winnerGlow;
          const winnerEntry = winners.find((w) => w.seatId === revealed.seatId);
          const best5Set = new Set(
            (revealed.handRank?.best5 ?? []).map((c) => `${c.rank}${c.suit}`),
          );

          return (
            <div
              key={revealed.seatId}
              data-revealed-seat={revealed.seatId}
              data-showdown-seat-id={revealed.seatId}
              data-showdown-winner={isWinner ? 'true' : 'false'}
              className={[
                'flex flex-col items-center gap-1 rounded-md border p-2',
                glow
                  ? 'border-gold-bright ring-2 ring-gold-bright shadow-[0_0_12px_rgba(232,189,109,0.85)]'
                  : isWinner
                    ? 'border-brass/60 bg-velvet-deep/40'
                    : 'border-brass/30 bg-velvet-deep/30',
              ].join(' ')}
            >
              <span
                className={[
                  'font-display text-[10px] tracking-[0.18em]',
                  isWinner ? 'text-gold-bright' : 'text-ivory/70',
                ].join(' ')}
              >
                {seatName(revealed.seatId, seats)}
                {isWinner && winnerEntry ? ` +${winnerEntry.awarded.toLocaleString()}` : ''}
              </span>

              <div className="flex gap-1">
                {revealed.holeCards.map((card, i) => {
                  const isInBest5 = best5Set.has(`${card.rank}${card.suit}`);
                  return (
                    <PlayingCard
                      key={cardKey(card, i)}
                      card={card}
                      size="hole"
                      faceDown={!isRevealed}
                      {...(isRevealed && isWinner && isInBest5 ? { highlight: true } : {})}
                    />
                  );
                })}
              </div>

              {revealed.handRank && isRevealed && (
                <span
                  className="text-[10px] text-ivory/70"
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
          <span className="font-display text-[10px] tracking-[0.18em] text-ivory/55">
            SIDE POTS
          </span>
          {handResult.sidePots.map((sp, i) => (
            <span key={i} className="text-[10px] text-ivory/55">
              Pot {i + 1}: {sp.amount.toLocaleString()} (seats: {sp.eligibleSeatIds.join(', ')})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
