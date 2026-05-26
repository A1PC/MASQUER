import type { JSX } from 'react';

/**
 * MASQUER · Lottery rules — Pick-6+1 UK National Lottery shape with the
 * Phase 15 #9 payout table (jackpot 20M, ticket 5 chips, ~84% RTP).
 *
 * Mirrors the blackjack/slots rules pattern: short eyebrow + scannable
 * sections so the content fits comfortably in the shared `RulesModal`
 * scrollable body.
 */
export default function LotteryRules(): JSX.Element {
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">OBJECT</h3>
        <p className="text-ivory/85">
          Pick <strong>6 main numbers</strong> from 1&ndash;50 plus <strong>1 bonus number</strong>{' '}
          from 1&ndash;10. The daily draw runs at <strong>20:00 local</strong>; if you miss it, the
          next app open settles all missed draws in chronological order.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">TICKETS</h3>
        <ul className="ml-5 list-disc space-y-1 text-ivory/85">
          <li>
            <strong>5 chips per line.</strong> A ticket can hold many lines (manual or lucky dip).
          </li>
          <li>
            <strong>Lucky dip</strong> generates a random valid 6+1 line for you. Each lucky dip is
            unique within the ticket.
          </li>
          <li>
            <strong>Favorites</strong>: save number sets you reuse — one click loads them back into
            the picker.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">PAYOUTS</h3>
        <p className="mb-2 text-ivory/85">
          Per the UK National Lottery shape. The bonus number matters only for the{' '}
          <em>5&nbsp;+&nbsp;bonus</em> tier; the 4 / 3 / 2 tiers ignore the bonus.
        </p>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-brass/40 text-ivory/60">
              <th className="py-1.5 pr-3 font-display tracking-[0.18em]">MATCHED</th>
              <th className="py-1.5 pr-3 font-display tracking-[0.18em]">TIER</th>
              <th className="py-1.5 text-right font-display tracking-[0.18em]">PAYOUT</th>
            </tr>
          </thead>
          <tbody className="text-ivory/85">
            <tr className="border-b border-brass/20">
              <td className="py-1 pr-3">6 main</td>
              <td className="py-1 pr-3 font-display text-gold-bright">6 (jackpot)</td>
              <td className="py-1 text-right tabular-nums">20,000,000</td>
            </tr>
            <tr className="border-b border-brass/20">
              <td className="py-1 pr-3">5 main + bonus</td>
              <td className="py-1 pr-3">5+bonus</td>
              <td className="py-1 text-right tabular-nums">1,000,000</td>
            </tr>
            <tr className="border-b border-brass/20">
              <td className="py-1 pr-3">5 main</td>
              <td className="py-1 pr-3">5</td>
              <td className="py-1 text-right tabular-nums">1,750</td>
            </tr>
            <tr className="border-b border-brass/20">
              <td className="py-1 pr-3">4 main</td>
              <td className="py-1 pr-3">4</td>
              <td className="py-1 text-right tabular-nums">150</td>
            </tr>
            <tr className="border-b border-brass/20">
              <td className="py-1 pr-3">3 main</td>
              <td className="py-1 pr-3">3</td>
              <td className="py-1 text-right tabular-nums">30</td>
            </tr>
            <tr>
              <td className="py-1 pr-3">2 main</td>
              <td className="py-1 pr-3">2</td>
              <td className="py-1 text-right text-gold-bright">free re-entry</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">
          MATCH-2 FREE RE-ENTRY
        </h3>
        <p className="text-ivory/85">
          Match exactly 2 of the 6 main numbers and you get a <strong>free ticket</strong> on the
          next draw — automatically generated as a lucky dip and worth one current ticket line (5
          chips).
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">BACKFILL</h3>
        <p className="text-ivory/85">
          If the app is closed when a draw fires, missed draws settle chronologically on the next
          open. Your tickets are evaluated in date order against the seeded daily draw numbers;
          payouts land in your wallet automatically.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">RTP</h3>
        <p className="text-ivory/85">
          Approximately <strong>84%</strong> across all tiers — the lottery acts as a mild chip sink
          long-term while letting the 6-tier jackpot (20M, ~1-in-15.9M odds) and the 5+bonus tier
          (1M, ~1-in-602K odds) feel like real wins.
        </p>
      </section>
    </div>
  );
}
