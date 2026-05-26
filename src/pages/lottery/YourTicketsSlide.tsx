import type { JSX } from 'react';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { LotteryTicket, LotteryLine } from '@/db';

interface Props {
  userId: string;
  limit?: number;
}

const EMPTY_TICKETS: readonly LotteryTicket[] = [];
const EMPTY_LINES: readonly LotteryLine[] = [];

/**
 * YourTicketsSlide — the user's recent ticket purchases. Reskinned for
 * MASQUER tokens (Phase 15 #9) with a scrollable list body and the new
 * 6-number line shape rendered when expanded.
 */
export default function YourTicketsSlide({ userId, limit = 20 }: Props): JSX.Element {
  const [pageLimit, setPageLimit] = useState(limit);

  const tickets = useLiveQuery(
    () =>
      db.lotteryTickets
        .where('userId')
        .equals(userId)
        .sortBy('purchasedAt')
        .then((all) => all.reverse().slice(0, pageLimit)),
    [userId, pageLimit],
    EMPTY_TICKETS,
  );

  const lines = useLiveQuery(
    () => db.lotteryLines.where('userId').equals(userId).toArray(),
    [userId],
    EMPTY_LINES,
  );

  const linesByTicket = new Map<string, LotteryLine[]>();
  for (const line of lines) {
    const existing = linesByTicket.get(line.ticketId) ?? [];
    existing.push(line);
    linesByTicket.set(line.ticketId, existing);
  }

  return (
    <section
      className="rounded-lg border border-brass/60 bg-felt-table-deep p-3 shadow-velvet-panel"
      data-your-tickets-slide
    >
      <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">YOUR TICKETS</h3>
      {tickets.length === 0 ? (
        <p className="py-4 text-center text-xs text-ivory/50">
          No tickets yet — pick numbers above to buy one.
        </p>
      ) : (
        <ul data-your-tickets-list className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
          {tickets.map((t) => {
            const ticketLines = linesByTicket.get(t.id) ?? [];
            return <TicketRow key={t.id} ticket={t} lines={ticketLines} />;
          })}
        </ul>
      )}
      {tickets.length === pageLimit && (
        <button
          type="button"
          onClick={() => setPageLimit((l) => l + limit)}
          className="mt-2 w-full rounded border border-brass/40 py-1.5 text-xs text-ivory/70 hover:bg-velvet-deep hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Load older tickets
        </button>
      )}
    </section>
  );
}

function TicketRow({
  ticket,
  lines,
}: {
  ticket: LotteryTicket;
  lines: LotteryLine[];
}): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const purchaseDate = new Date(ticket.purchasedAt).toLocaleString();
  return (
    <li
      className="rounded border border-brass/40 bg-velvet-deep"
      data-ticket-row
      data-ticket-id={ticket.id}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        aria-expanded={expanded}
        aria-controls={`ticket-${ticket.id}`}
      >
        <span className="text-ivory/60 tabular-nums">{ticket.drawId}</span>
        <span className="flex-1 text-center text-ivory/60">
          {ticket.lineCount} {ticket.lineCount === 1 ? 'line' : 'lines'}
          {ticket.totalCost === 0 && (
            <span className="ml-1 text-[10px] text-gold-bright">FREE ENTRY</span>
          )}
        </span>
        <span className="text-right text-ivory/50 tabular-nums">{purchaseDate}</span>
      </button>
      {expanded && lines.length > 0 && (
        <div id={`ticket-${ticket.id}`} className="border-t border-brass/30 p-2">
          <ul className="space-y-1 text-[11px]">
            {lines.map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-2">
                <span className="tabular-nums text-ivory/85">
                  {line.mainNumbers.join(' · ')} <span className="text-ivory/40">|</span>{' '}
                  {line.bonusNumber}
                  {line.isLuckyDip && (
                    <span className="ml-2 text-[10px] text-gold-bright">LUCKY DIP</span>
                  )}
                  {line.isFreeReentry && (
                    <span className="ml-2 text-[10px] text-gold-bright">FREE RE-ENTRY</span>
                  )}
                </span>
                <span className="text-right text-ivory/60">
                  {line.settled ? (line.matchTier ?? '—') : 'pending'}
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
