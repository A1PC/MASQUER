import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCurrentUser } from '@/store/sessionStore';
import { db } from '@/db';
import { dateStringFor, nextDrawAt } from '@/systems/lottery';
import CabinetCarousel from './lobby/CabinetCarousel';
import RecentActivityStrip from './lobby/RecentActivityStrip';

function formatHHMM(ms: number): string {
  if (ms <= 0) return '00:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function LotteryTile({ userId }: { userId: string }): JSX.Element {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const today = dateStringFor(now);
  const draw = useLiveQuery(() => db.lotteryDraws.get(today), [today], undefined);
  const userLines = useLiveQuery(
    () => db.lotteryLines.where('[userId+drawId]').equals([userId, today]).toArray(),
    [userId, today],
    [],
  );
  const sub = draw
    ? `Drawn: ${draw.mainNumbers.join(' · ')} | ${draw.bonus}`
    : `Draw in ${formatHHMM(nextDrawAt(now) - now)}`;
  const winnings = userLines.reduce((s, l) => s + (l.payout ?? 0), 0);
  const hoverInfo =
    userLines.length > 0
      ? `${userLines.length} line${userLines.length === 1 ? '' : 's'} · ${winnings.toLocaleString()} chips`
      : '';
  return (
    <Link
      to="/lottery"
      className="rounded-lg border border-gold/30 bg-felt-deep p-4 hover:border-gold"
      title={hoverInfo}
      data-lottery-tile
    >
      <h3 className="font-display text-sm tracking-wider text-gold-bright">🎟️ DAILY LOTTERY</h3>
      <p className="mt-1 text-xs text-white/60">{sub}</p>
    </Link>
  );
}

export default function LobbyPage(): JSX.Element | null {
  const user = useCurrentUser();
  if (!user) return null;
  return (
    <div className="px-8 py-7">
      <h2 className="mb-1.5 font-display text-2xl tracking-wider text-gold-bright">
        PICK YOUR POISON
      </h2>
      <p className="mb-5 text-xs text-white/55">Click a cabinet to play.</p>
      <CabinetCarousel />
      <div className="mt-4">
        <LotteryTile userId={user.id} />
      </div>
      <RecentActivityStrip />
    </div>
  );
}
