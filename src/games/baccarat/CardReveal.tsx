import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import PlayingCard, {
  type Rank as PCRank,
  type Suit as PCSuit,
} from '@/components/brand/PlayingCard';
import type { Card as CardType, Rank, Suit } from '@/games/blackjack/types';
import { REVEAL_TIMING } from './config';

/** Adapter: blackjack rank ('A'|'2'..|'K') → MasquerCard rank (1..13). */
function rankToNumber(rank: Rank): PCRank {
  if (rank === 'A') return 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return Number.parseInt(rank, 10) as PCRank;
}

/** Adapter: blackjack suit ('♠'|'♥'|'♦'|'♣') → MasquerCard suit ('s'|'h'|'d'|'c'). */
function suitToLetter(suit: Suit): PCSuit {
  if (suit === '♠') return 's';
  if (suit === '♥') return 'h';
  if (suit === '♦') return 'd';
  return 'c';
}

/** Render a blackjack `Card` via the shared MasquerCard, optionally face-down. */
function Card({ card, faceDown }: { card: CardType; faceDown: boolean }): JSX.Element {
  return (
    <PlayingCard
      rank={rankToNumber(card.rank)}
      suit={suitToLetter(card.suit)}
      faceDown={faceDown}
      size="md"
    />
  );
}

interface Props {
  /** The card to reveal. When null, renders an empty card-sized slot. */
  card: CardType | null;
  /** True once the card should be face-up. Until true, shows the back of the card. */
  revealed: boolean;
  /** Delay before the slide-in starts. ms. */
  delayMs?: number;
  /** Called when the reveal animation finishes (after slide-in + peek + flip). */
  onRevealDone?: () => void;
}

/**
 * Theatrical card reveal: slide-in face-down → brief peek (small Y-rotation) →
 * swap to face-up → settle. ~600ms per card with sub-timings from
 * REVEAL_TIMING.
 *
 * The flip is implemented as a swap (face-down → face-up) bracketed by a
 * small rotateY animation — simpler than true 3D backface-visibility and
 * visually equivalent at this scale.
 *
 * Reduced-motion fallback: the card appears already face-up at its final
 * position; onRevealDone fires on the next microtask.
 */
export default function CardReveal({
  card,
  revealed,
  delayMs = 0,
  onRevealDone,
}: Props): JSX.Element {
  const reducedMotion = useReducedMotion() ?? false;
  // Tracks when the face should swap from back to front. Under reduced
  // motion this equals `revealed` immediately; otherwise it flips on a
  // delayed timer matching REVEAL_TIMING.
  const [animatedShowFace, setAnimatedShowFace] = useState(false);
  const showFace = reducedMotion ? revealed : animatedShowFace;

  useEffect(() => {
    if (reducedMotion) {
      // No setState here — `showFace` is derived from `revealed` directly above.
      if (revealed && onRevealDone) {
        queueMicrotask(onRevealDone);
      }
      return;
    }
    if (!revealed) return;
    // Reveal scheduling: after slide-in completes, wait cornerPeek, then flip
    // (swap face), then fire onRevealDone after pauseBetweenCards.
    const swapAtMs = delayMs + REVEAL_TIMING.cardSlideIn + REVEAL_TIMING.cornerPeek;
    const doneAtMs = swapAtMs + REVEAL_TIMING.flip + REVEAL_TIMING.pauseBetweenCards;
    const t1 = window.setTimeout(() => setAnimatedShowFace(true), swapAtMs);
    const t2 = window.setTimeout(() => onRevealDone?.(), doneAtMs);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [revealed, reducedMotion, delayMs, onRevealDone]);

  if (card === null) {
    return <div className="inline-block h-[124px] w-[88px]" aria-hidden />;
  }

  if (reducedMotion) {
    return (
      <div className="inline-block">
        <Card card={card} faceDown={!showFace} />
      </div>
    );
  }

  return (
    <motion.div
      className="inline-block"
      initial={{ x: -40, opacity: 0, rotate: -6 }}
      animate={{
        x: 0,
        opacity: 1,
        rotate: 0,
        rotateY: showFace ? [12, 0] : 0,
      }}
      transition={{
        x: { delay: delayMs / 1000, duration: REVEAL_TIMING.cardSlideIn / 1000, ease: 'easeOut' },
        opacity: { delay: delayMs / 1000, duration: REVEAL_TIMING.cardSlideIn / 1000 },
        rotate: { delay: delayMs / 1000, duration: REVEAL_TIMING.cardSlideIn / 1000 },
        rotateY: {
          duration: REVEAL_TIMING.flip / 1000,
          ease: 'easeOut',
        },
      }}
    >
      <Card card={card} faceDown={!showFace} />
    </motion.div>
  );
}
