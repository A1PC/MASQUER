import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { dateStringFor, MAIN_PICKS, nextDrawAt } from '@/systems/lottery';
import type { LotteryDraw } from '@/db';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import { useSound } from '@/systems/sound/useSound';
import { getLastSeenDraw, markDrawSeen } from '@/systems/lottery-unread';

const EMPTY: LotteryDraw | undefined = undefined;

/** Stagger between ball reveals, ms. ~250 ms × 7 ≈ 1.75 s for the full
 *  reveal — pleasant suspense without dragging. */
const BALL_STAGGER_MS = 250;

/**
 * HeroSection — the lottery page's top-of-fold focal point.
 *
 * Three render states:
 *  1. **Post-draw, unseen** (`RevealHero`) — today's draw exists in Dexie
 *     AND the user hasn't seen it before. Renders the 7-ball stagger reveal
 *     and persists the seen flag via `markDrawSeen` so subsequent mounts
 *     (tab returns) take state #2 instead of replaying the animation.
 *  2. **Post-draw, seen** or **pre-draw** (`CountdownHero`) — countdown to
 *     the next 20:00 boundary with the most-recent draw's numbers rendered
 *     as a compact static row below. This is what the user sees on revisit.
 *  3. **No prior draws at all** — `CountdownHero` without the "last draw"
 *     strip (first-ever launch state).
 *
 * The "seen" flag is per-user localStorage (`lottery-unread.ts`). Reading it
 * once via `useState` initializer guarantees stable render output for the
 * lifetime of this mount; the next remount re-reads and picks up the change.
 */
export default function HeroSection({ userId }: { userId: string }): JSX.Element {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const today = dateStringFor(now);
  const todayDraw = useLiveQuery(() => db.lotteryDraws.get(today), [today], EMPTY);
  const lastDraw = useLiveQuery(() => db.lotteryDraws.orderBy('id').reverse().first(), [], EMPTY);

  const next = nextDrawAt(now);
  const countdown = formatCountdown(next - now);

  // Captured once per mount. The animation path keys off this value, so we
  // intentionally do NOT update state when we later call markDrawSeen — the
  // reveal must finish playing on the mount that triggered it.
  const [seenAtMount] = useState<string | null>(() => getLastSeenDraw(userId));

  useEffect(() => {
    if (!todayDraw) return;
    if (seenAtMount === todayDraw.id) return;
    markDrawSeen(userId, todayDraw.id);
  }, [todayDraw, seenAtMount, userId]);

  if (todayDraw && seenAtMount !== todayDraw.id) {
    return <RevealHero draw={todayDraw} countdown={countdown} />;
  }

  return <CountdownHero countdown={countdown} lastDraw={lastDraw ?? undefined} />;
}

function RevealHero({ draw, countdown }: { draw: LotteryDraw; countdown: string }): JSX.Element {
  const reduce = useEffectiveReducedMotion();
  const { play } = useSound();

  useEffect(() => {
    if (reduce) {
      play('ball.drop');
      return;
    }
    const total = MAIN_PICKS + 1;
    for (let i = 0; i < total; i += 1) {
      window.setTimeout(() => play('ball.drop'), i * BALL_STAGGER_MS);
    }
  }, [draw.id, play, reduce]);

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
          <BigBall key={`m-${i}-${n}`} value={n} color="main" index={i} animate={!reduce} />
        ))}
        <BigBall
          value={draw.bonus}
          color="bonus"
          index={draw.mainNumbers.length}
          animate={!reduce}
        />
      </div>
      <p className="font-body text-xs text-ivory/70">
        Next draw in <span className="font-numeral tabular-nums text-gold-bright">{countdown}</span>
      </p>
    </section>
  );
}

function CountdownHero({
  countdown,
  lastDraw,
}: {
  countdown: string;
  lastDraw: LotteryDraw | undefined;
}): JSX.Element {
  return (
    <section
      className="rounded-lg border border-brass/60 bg-felt-table-deep p-6 text-center shadow-velvet-panel"
      data-hero-state={lastDraw ? 'post-draw-seen' : 'pre-draw'}
    >
      <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-ivory/50">Next draw in</p>
      <p className="font-numeral text-5xl tabular-nums tracking-wider text-gold-bright">
        {countdown}
      </p>
      {lastDraw && (
        <div
          className="mt-5 flex flex-col items-center gap-2 border-t border-brass/30 pt-4"
          data-last-draw
          data-draw-id={lastDraw.id}
        >
          <p className="text-[10px] uppercase tracking-[0.18em] text-ivory/50">
            Last draw &middot; <span className="tabular-nums">{lastDraw.id}</span>
          </p>
          <div
            className="flex flex-wrap items-center justify-center gap-1.5"
            role="list"
            aria-label="Most recent draw numbers"
            data-last-balls
          >
            {lastDraw.mainNumbers.map((n, i) => (
              <SmallBall key={`lm-${i}-${n}`} value={n} color="main" />
            ))}
            <SmallBall value={lastDraw.bonus} color="bonus" />
          </div>
        </div>
      )}
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

function SmallBall({ value, color }: { value: number; color: 'main' | 'bonus' }): JSX.Element {
  const isBonus = color === 'bonus';
  const chrome = isBonus
    ? 'bg-velvet-deep border-jewel-magenta text-gold-bright'
    : 'bg-velvet-deep border-brass text-ivory';
  const ariaLabel = isBonus ? `Last bonus ball ${value}` : `Last winning ball ${value}`;
  return (
    <span
      role="listitem"
      aria-label={ariaLabel}
      data-small-ball
      data-ball-color={color}
      className={[
        'inline-flex h-8 w-8 items-center justify-center rounded-full border font-display text-xs tabular-nums',
        chrome,
      ].join(' ')}
    >
      {value}
    </span>
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
