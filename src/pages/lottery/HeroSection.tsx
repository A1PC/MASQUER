import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { dateStringFor, MAIN_PICKS, nextDrawAt } from '@/systems/lottery';
import type { LotteryDraw } from '@/db';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import { useSound } from '@/systems/sound/useSound';

const EMPTY: LotteryDraw | undefined = undefined;

/** Stagger between ball reveals, ms. ~250 ms × 7 ≈ 1.75 s for the full
 *  reveal — pleasant suspense without dragging. */
const BALL_STAGGER_MS = 250;

/**
 * HeroSection — the lottery page's top-of-fold focal point.
 *
 * Pre-draw: ivory eyebrow + giant gold countdown to the next 20:00 boundary.
 * Post-draw: 7 ball slots (6 main + 1 bonus) revealed one at a time with a
 * scale-bounce + gold-glow flash per ball (~250 ms stagger, ~1.75 s total).
 * Reduced-motion: all balls appear simultaneously with no animation; a
 * single batched `ball.drop` plays once rather than per-ball.
 *
 * Reveal animation only fires on the FIRST render per `drawId` — subsequent
 * re-renders (countdown tick, store updates) show static balls. Tracked via
 * a `useRef` so re-mounts within the same draw don't re-trigger.
 */
export default function HeroSection(): JSX.Element {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const today = dateStringFor(now);
  const todayDraw = useLiveQuery(() => db.lotteryDraws.get(today), [today], EMPTY);

  const next = nextDrawAt(now);
  const countdown = formatCountdown(next - now);

  if (todayDraw) {
    return <PostDraw draw={todayDraw} countdown={countdown} />;
  }

  return (
    <section
      className="rounded-lg border border-brass/60 bg-felt-table-deep p-6 text-center shadow-velvet-panel"
      data-hero-state="pre-draw"
    >
      <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-ivory/50">Next draw in</p>
      <p className="font-display text-5xl tabular-nums tracking-wider text-gold-bright">
        {countdown}
      </p>
    </section>
  );
}

function PostDraw({ draw, countdown }: { draw: LotteryDraw; countdown: string }): JSX.Element {
  const reduce = useEffectiveReducedMotion();
  const { play } = useSound();

  // Persist the last animated drawId so re-renders inside the same day don't
  // re-trigger the reveal. useState (not useRef) is used to satisfy the
  // `react-hooks/refs` ESLint rule which forbids reading a ref during render.
  const [revealedDrawId, setRevealedDrawId] = useState<string | null>(null);
  const isFirstReveal = revealedDrawId !== draw.id;

  // Cross-system sync: the lottery draw event (which lives in Dexie / the
  // backfill effect) drives both audio + a "remember I animated this draw"
  // flag. setState inside this effect is intentional — the alternative is a
  // useReducer indirection that obscures the simple intent.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (revealedDrawId === draw.id) return;
    // Mark animated immediately so subsequent renders (countdown ticks)
    // see `isFirstReveal === false` and skip the animation path.
    setRevealedDrawId(draw.id);
    if (reduce) {
      // One batched sound rather than 7 quick taps.
      play('ball.drop');
      return;
    }
    // Per-ball sound, paced to match the stagger. setTimeout cadence
    // matches the visible Framer stagger even under heavy load. We
    // intentionally do NOT clean up the timers — the 1.75 s reveal window
    // is short enough that a stray play after an unmount is acceptable.
    const total = MAIN_PICKS + 1;
    for (let i = 0; i < total; i += 1) {
      window.setTimeout(() => play('ball.drop'), i * BALL_STAGGER_MS);
    }
    return undefined;
  }, [draw.id, play, reduce, revealedDrawId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <section
      className="rounded-lg border border-brass/60 bg-felt-table-deep p-6 text-center shadow-velvet-panel"
      data-hero-state="post-draw"
      data-draw-id={draw.id}
    >
      <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-ivory/50">
        Today&rsquo;s winning numbers
      </p>
      <div
        className="mb-4 flex flex-wrap justify-center gap-3"
        role="list"
        aria-label="Winning numbers"
        data-balls
      >
        {draw.mainNumbers.map((n, i) => (
          <BigBall
            key={`m-${i}-${n}`}
            value={n}
            color="main"
            index={i}
            animate={isFirstReveal && !reduce}
          />
        ))}
        <BigBall
          value={draw.bonus}
          color="bonus"
          index={draw.mainNumbers.length}
          animate={isFirstReveal && !reduce}
        />
      </div>
      <p className="font-body text-xs text-ivory/70">
        Next draw in <span className="font-display tabular-nums text-gold-bright">{countdown}</span>
      </p>
    </section>
  );
}

function BigBall({
  value,
  color,
  index,
  animate,
}: {
  value: number;
  color: 'main' | 'bonus';
  index: number;
  animate: boolean;
}): JSX.Element {
  const isBonus = color === 'bonus';
  const chrome = isBonus
    ? 'bg-velvet-deep border-jewel-magenta text-gold-bright shadow-[0_0_18px_rgba(232,74,140,0.55)]'
    : 'bg-velvet-deep border-brass text-ivory shadow-[0_0_18px_rgba(212,175,55,0.45)]';

  // Per-ball variants: scale bounce + glow flash. Reduced motion → static.
  const variants = {
    hidden: { scale: 0.6, opacity: 0 },
    visible: {
      scale: [0.6, 1.05, 1],
      opacity: 1,
    },
  };

  const ariaLabel = isBonus ? `Bonus ball ${value}` : `Winning ball ${value}`;

  return (
    <motion.span
      data-big-ball
      data-ball-color={color}
      role="listitem"
      aria-label={ariaLabel}
      initial={animate ? 'hidden' : false}
      animate={animate ? 'visible' : { scale: 1, opacity: 1 }}
      variants={variants}
      transition={{
        duration: 0.4,
        delay: animate ? index * (BALL_STAGGER_MS / 1000) : 0,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={[
        'inline-flex h-20 w-20 items-center justify-center rounded-full border-2 font-display text-2xl tabular-nums',
        chrome,
      ].join(' ')}
    >
      {value}
    </motion.span>
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
