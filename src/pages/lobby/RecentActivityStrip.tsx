import type { JSX } from 'react';
import { useRecentRounds } from '@/systems/hooks/useRecentRounds';
import { useCurrentUser } from '@/store/sessionStore';

export default function RecentActivityStrip(): JSX.Element {
  const user = useCurrentUser();
  const rounds = useRecentRounds(user?.id, undefined, 5);
  if (rounds.length === 0) {
    return (
      <div className="mt-5 rounded-md border border-dashed border-gold/30 bg-gold/[0.05] px-4 py-3.5">
        <div className="font-display text-[13px] tracking-wider text-gold">📊 RECENT ACTIVITY</div>
        <div className="mt-1 text-xs text-white/60">No rounds played yet. Try the Coin Flip!</div>
      </div>
    );
  }
  return (
    <div className="mt-5 rounded-md border border-dashed border-gold/30 bg-gold/[0.05] px-4 py-3.5">
      <div className="font-display text-[13px] tracking-wider text-gold">📊 RECENT ACTIVITY</div>
      <ul className="mt-2 space-y-1 text-xs text-white/80">
        {rounds.map((r) => (
          <li key={r.id} className="flex justify-between font-mono">
            <span>
              {r.game} · bet {r.betAmount}
            </span>
            <span
              className={
                r.outcome === 'win'
                  ? 'text-chip-win'
                  : r.outcome === 'loss'
                    ? 'text-chip-loss'
                    : 'text-chip-push'
              }
            >
              {r.netChange > 0 ? '+' : ''}
              {r.netChange}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
