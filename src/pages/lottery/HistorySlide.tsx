import type { JSX } from 'react';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { LotteryDraw, LotteryLine } from '@/db';

interface Props {
  userId: string;
  pageSize?: number;
}

const EMPTY_DRAWS: readonly LotteryDraw[] = [];
const EMPTY_LINES: readonly LotteryLine[] = [];

/**
 * HistorySlide — recent draws + the user's per-draw participation. Reskinned
 * for MASQUER tokens (Phase 15 #9) with a scrollable list body so a long
 * draw history doesn't push the buy CTA below the fold. Renders the new
 * 6+1 ball shape per draw row.
 */
export default function HistorySlide({ userId, pageSize = 30 }: Props): JSX.Element {
  const [limit, setLimit] = useState(pageSize);

  const draws = useLiveQuery(
    () => db.lotteryDraws.orderBy('id').reverse().limit(limit).toArray(),
    [limit],
    EMPTY_DRAWS,
  );
  const userLines = useLiveQuery(
    () => db.lotteryLines.where('userId').equals(userId).toArray(),
    [userId],
    EMPTY_LINES,
  );

  const linesByDraw = new Map<string, LotteryLine[]>();
  for (const line of userLines) {
    const existing = linesByDraw.get(line.drawId) ?? [];
    existing.push(line);
    linesByDraw.set(line.drawId, existing);
  }

  return (
    <section
      className="rounded-lg border border-brass/60 bg-felt-table-deep p-3 shadow-velvet-panel"
      data-history-slide
    >
      <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">RECENT DRAWS</h3>
      {draws.length === 0 ? (
        <p className="py-4 text-center text-xs text-ivory/50">
          No draws yet — the first one runs at 20:00.
        </p>
      ) : (
        <ul data-history-list className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
          {draws.map((d) => {
            const lines = linesByDraw.get(d.id) ?? [];
            return <HistoryRow key={d.id} draw={d} userLines={lines} />;
          })}
        </ul>
      )}
      {draws.length === limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + pageSize)}
          className="mt-2 w-full rounded border border-brass/40 py-1.5 text-xs text-ivory/70 hover:bg-velvet-deep hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Load older draws
        </button>
      )}
    </section>
  );
}

function HistoryRow({
  draw,
  userLines,
}: {
  draw: LotteryDraw;
  userLines: LotteryLine[];
}): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const winnings = userLines.reduce((s, l) => s + (l.payout ?? 0), 0);
  const drawSet = new Set(draw.mainNumbers);
  return (
    <li
      className="rounded border border-brass/40 bg-velvet-deep"
      data-history-row
      data-draw-id={draw.id}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        aria-expanded={expanded}
        aria-controls={`history-${draw.id}`}
      >
        <span className="text-ivory/60 tabular-nums">{draw.id}</span>
        <span className="flex-1 truncate text-center tabular-nums text-ivory/85">
          {draw.mainNumbers.join(' · ')} <span className="text-ivory/40">|</span> {draw.bonus}
        </span>
        <span className="text-right text-ivory/60">
          Lines: <span className="text-ivory">{userLines.length}</span>{' '}
          {winnings > 0 && <span className="text-state-win">+{winnings.toLocaleString()}</span>}
        </span>
      </button>
      {expanded && userLines.length > 0 && (
        <div id={`history-${draw.id}`} className="border-t border-brass/30 p-2">
          <ul className="space-y-1 text-[11px]">
            {userLines.map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-2">
                <span className="tabular-nums">
                  {line.mainNumbers.map((n, i) => (
                    <span
                      key={`${line.id}-${i}`}
                      className={
                        drawSet.has(n)
                          ? 'rounded bg-gold/30 px-1 text-gold-bright'
                          : 'px-1 text-ivory/70'
                      }
                    >
                      {n}
                    </span>
                  ))}
                  <span className="ml-1 text-ivory/40">|</span>{' '}
                  <span
                    className={
                      line.bonusNumber === draw.bonus
                        ? 'rounded bg-jewel-magenta/30 px-1 text-jewel-magenta'
                        : 'px-1 text-ivory/70'
                    }
                  >
                    {line.bonusNumber}
                  </span>
                </span>
                <span className="text-right text-ivory/60">
                  {line.matchTier ?? '—'}
                  {line.payout > 0 && (
                    <span className="ml-2 text-state-win">+{line.payout.toLocaleString()}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
