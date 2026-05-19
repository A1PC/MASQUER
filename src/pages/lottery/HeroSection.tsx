import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { dateStringFor, nextDrawAt } from '@/systems/lottery';
import type { LotteryDraw } from '@/db';

const EMPTY: LotteryDraw | undefined = undefined;

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
    return (
      <section
        className="rounded border border-gold/30 bg-felt-deep p-6 text-center"
        data-hero-state="post-draw"
      >
        <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">
          Today&rsquo;s winning numbers
        </p>
        <div className="mb-3 flex justify-center gap-3">
          {todayDraw.mainNumbers.map((n) => (
            <BigBall key={n} value={n} color="gold" />
          ))}
          <BigBall value={todayDraw.bonus} color="magenta" />
        </div>
        <p className="text-xs text-white/60">
          Next draw in{' '}
          <span className="font-display tabular-nums text-gold-bright">{countdown}</span>
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded border border-gold/30 bg-felt-deep p-6 text-center"
      data-hero-state="pre-draw"
    >
      <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">Next draw in</p>
      <p className="font-display text-5xl tracking-wider text-gold-bright tabular-nums">
        {countdown}
      </p>
    </section>
  );
}

function BigBall({ value, color }: { value: number; color: 'gold' | 'magenta' }): JSX.Element {
  const bg = color === 'gold' ? 'bg-gold' : 'bg-neon-magenta';
  return (
    <span
      data-big-ball
      className={`flex h-24 w-24 items-center justify-center rounded-full ${bg} font-display text-3xl tabular-nums text-felt-deep shadow-[0_0_28px_rgba(212,175,55,0.6)]`}
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
