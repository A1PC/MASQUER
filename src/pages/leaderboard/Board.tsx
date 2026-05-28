import type { JSX } from 'react';
import { useState } from 'react';
import MeAllToggle, { type MeAllMode } from './MeAllToggle';
import type { LeaderboardRow } from '@/systems/stats';

interface Props {
  title: string;
  rows: readonly LeaderboardRow[];
  currentUserId: string | null;
  formatValue?: (v: number) => string;
}

const DEFAULT_FORMAT = (v: number): string => v.toLocaleString();

export default function Board({
  title,
  rows,
  currentUserId,
  formatValue = DEFAULT_FORMAT,
}: Props): JSX.Element {
  const [mode, setMode] = useState<MeAllMode>('all');
  const visible = mode === 'all' ? rows.slice(0, 10) : computeMeWindow(rows, currentUserId);
  return (
    <div className="rounded-md border border-brass/60 bg-velvet-deep p-3" data-board={title}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-[11px] tracking-[0.18em] text-gold-bright">{title}</h3>
        <MeAllToggle value={mode} onChange={setMode} />
      </div>
      {visible.length === 0 ? (
        <p className="text-xs text-ivory/40">No rankings yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <tbody>
            {visible.map((r) => {
              const isCurrent = r.userId === currentUserId;
              return (
                <tr
                  key={r.userId}
                  className={
                    isCurrent
                      ? 'rounded border border-brass bg-velvet text-ivory'
                      : 'border-b border-brass/10 text-ivory'
                  }
                  data-current-user={isCurrent || undefined}
                >
                  <td className="w-8 py-1 pr-2 text-xs text-ivory/50">#{r.rank}</td>
                  <td className="py-1">
                    {r.username}
                    {isCurrent && <span className="ml-1 text-xs text-gold-bright">(you)</span>}
                  </td>
                  <td className="py-1 text-right tabular-nums">
                    {formatValue(r.value)}
                    {r.sub && <span className="ml-2 text-xs text-ivory/40">{r.sub}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function computeMeWindow(
  rows: readonly LeaderboardRow[],
  currentUserId: string | null,
): readonly LeaderboardRow[] {
  if (!currentUserId) return rows.slice(0, 7);
  const idx = rows.findIndex((r) => r.userId === currentUserId);
  if (idx === -1) return rows.slice(0, 7);
  const start = Math.max(0, idx - 3);
  const end = Math.min(rows.length, idx + 4);
  return rows.slice(start, end);
}
