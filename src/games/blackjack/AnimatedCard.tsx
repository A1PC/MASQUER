import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import PlayingCard, {
  type Rank as PCRank,
  type Suit as PCSuit,
  type CardSize,
} from '@/components/brand/PlayingCard';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import { cn } from '@/components/ui';

interface Props {
  rank: PCRank;
  suit: PCSuit;
  /** Whether the card should END face-up (false → stays face-down post-flight,
   *  used for the dealer's hole card until reveal). */
  faceUp: boolean;
  size?: CardSize;
  /** Stagger delay (ms) — used during the opening deal sequence so the four
   *  cards arrive in P1 / D1 / P2 / D2 order. Defaults to 0 (in-game draws). */
  delayMs?: number;
  /** Fixed pixel offset from the slot to the table's deck anchor. Cards
   *  visually "fly in" from this offset (translateX/Y back to 0,0) so motion
   *  conveys "drawn from the deck" rather than a generic fade. */
  fromOffsetX?: number;
  fromOffsetY?: number;
  /** Fires when the slide-in segment completes (card has landed). Used by the
   *  page to play `card.deal` on LANDING, not on start. Skipped in reduced-
   *  motion mode — the page handles a single batched sound in that path. */
  onLanded?: () => void;
  /** Extra ring/highlight applied OUTSIDE the flipped surface. Used by the
   *  Ace UI to mark the card the player is choosing a value for. */
  highlight?: boolean;
  className?: string;
}

/** Default deck-anchor offset — the deck sits to the upper-right of the
 *  player's hand area on the felt. Tuned by eye to fly cards diagonally from
 *  there. */
const DEFAULT_FROM_OFFSET_X = 220;
const DEFAULT_FROM_OFFSET_Y = -140;

/** Slide-in segment duration (s) — keeps below the 400ms spec ceiling. */
const FLIGHT_S = 0.36;
/** Flip segment duration (s) — under the 300ms spec ceiling for the flip. */
const FLIP_S = 0.28;

/**
 * `AnimatedCard` — wraps `PlayingCard` (MasquerCard) with a two-phase Framer
 * Motion entry: (1) translate from a fixed deck-anchor offset back to the
 * slot's rest position while held face-DOWN (rotateY = 180); (2) flip face-up
 * via `rotateY 180 → 0`. Cards destined to stay face-down (dealer hole
 * pre-reveal) skip phase 2 — `rotateY` stays at 180 and the back face stays
 * visible.
 *
 * The entry animation runs ONCE — on mount — because Framer Motion's `initial`
 * prop is consumed only at mount. Cards already on the table (mounted in a
 * prior render) are skipped automatically by React reconciliation: same key →
 * same mounted instance → no replay. Cards added at the end of a hand (e.g.
 * a HIT) mount fresh and animate. Round transitions clear hands to `[]` in
 * the machine, which unmounts every card; the next deal mounts them fresh.
 *
 * Reduced-motion path: both segments collapse to instant — the card simply
 * renders at its slot in its final face-up/face-down state. The page consumes
 * the reduced-motion signal too and fires a single `card.deal` per dealt
 * batch instead of one per landing.
 */
export default function AnimatedCard({
  rank,
  suit,
  faceUp,
  size = 'lg',
  delayMs = 0,
  fromOffsetX = DEFAULT_FROM_OFFSET_X,
  fromOffsetY = DEFAULT_FROM_OFFSET_Y,
  onLanded,
  highlight = false,
  className,
}: Props): JSX.Element {
  const reduced = useEffectiveReducedMotion();
  // `flightDone` tracks whether the flight segment has finished. While false,
  // the card is mid-flight (rotateY held at 180, back showing). On true, the
  // rotateY tween fires to the final orientation; the child swaps `faceDown`
  // synchronously so the destination surface matches the orientation.
  // Reduced-motion mounts skip straight to "done" so the static path renders
  // the final face on first paint.
  const [flightDone, setFlightDone] = useState<boolean>(reduced);

  const handleFlightComplete = useCallback((): void => {
    setFlightDone(true);
    // Fire the LANDING sound here (not on start) per spec. In reduced motion
    // the page-level effect handles a single batched sound — skip per-card.
    if (!reduced) onLanded?.();
  }, [onLanded, reduced]);

  const finalRotateY = faceUp ? 0 : 180;
  // Surface the user should see right now:
  //  · pre-/mid-flight: always face-down (the back is travelling)
  //  · post-flight: matches `faceUp`
  const showAsFaceDown = !flightDone || !faceUp;

  const ringCls = highlight ? 'rounded-[10px] ring-2 ring-gold/80 animate-pulse' : '';

  // Reduced-motion: render statically at slot, no transforms, no callbacks.
  if (reduced) {
    return (
      <div className={cn('relative inline-block', className, ringCls)}>
        <PlayingCard rank={rank} suit={suit} faceDown={!faceUp} size={size} />
      </div>
    );
  }

  return (
    <motion.div
      className={cn('relative inline-block', className, ringCls)}
      style={{ transformStyle: 'preserve-3d', perspective: 800 }}
      initial={{ x: fromOffsetX, y: fromOffsetY, rotateY: 180, opacity: 0 }}
      animate={
        flightDone
          ? { x: 0, y: 0, rotateY: finalRotateY, opacity: 1 }
          : { x: 0, y: 0, rotateY: 180, opacity: 1 }
      }
      transition={
        flightDone
          ? { duration: FLIP_S, ease: [0.16, 1, 0.3, 1] }
          : {
              x: { duration: FLIGHT_S, ease: [0.16, 1, 0.3, 1], delay: delayMs / 1000 },
              y: { duration: FLIGHT_S, ease: [0.16, 1, 0.3, 1], delay: delayMs / 1000 },
              opacity: { duration: 0.12, delay: delayMs / 1000 },
              rotateY: { duration: 0, delay: delayMs / 1000 },
            }
      }
      onAnimationComplete={() => {
        if (!flightDone) handleFlightComplete();
      }}
    >
      <PlayingCard rank={rank} suit={suit} faceDown={showAsFaceDown} size={size} />
    </motion.div>
  );
}
