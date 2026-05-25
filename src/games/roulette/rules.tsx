import type { JSX } from 'react';

/**
 * Phase 15 #6 rules — covers object, bet types & payouts, the zero,
 * auto-spin timer (ADR-0046), bet maximums (ADR-0030 amendment),
 * result determination, and the "repeat last bets" deferred note.
 *
 * Uses the same `<h3 class="font-display ... text-gold">` heading style as
 * the Blackjack / Coin-flip rules.
 */
export default function RouletteRules(): JSX.Element {
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">OBJECT</h3>
        <p className="text-ivory/80">
          Predict the pocket the ball lands in. You can place many bets per spin — the wheel pays
          every bet that covers the winning number.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">
          BET TYPES &amp; PAYOUTS
        </h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-brass/30 text-xs uppercase tracking-wider text-ivory/55">
              <th className="py-1.5 pr-4">Bet</th>
              <th className="py-1.5 pr-4">Covers</th>
              <th className="py-1.5">Payout</th>
            </tr>
          </thead>
          <tbody className="text-ivory/85">
            <tr className="border-b border-ivory/5">
              <td className="py-1.5 pr-4">Straight up</td>
              <td className="py-1.5 pr-4">A single number</td>
              <td className="py-1.5">35 : 1</td>
            </tr>
            <tr className="border-b border-ivory/5">
              <td className="py-1.5 pr-4">Split</td>
              <td className="py-1.5 pr-4">Two adjacent numbers</td>
              <td className="py-1.5">17 : 1</td>
            </tr>
            <tr className="border-b border-ivory/5">
              <td className="py-1.5 pr-4">Street</td>
              <td className="py-1.5 pr-4">A row of three numbers</td>
              <td className="py-1.5">11 : 1</td>
            </tr>
            <tr className="border-b border-ivory/5">
              <td className="py-1.5 pr-4">Corner</td>
              <td className="py-1.5 pr-4">Four numbers forming a square</td>
              <td className="py-1.5">8 : 1</td>
            </tr>
            <tr className="border-b border-ivory/5">
              <td className="py-1.5 pr-4">Six-line</td>
              <td className="py-1.5 pr-4">Two rows of three (six numbers)</td>
              <td className="py-1.5">5 : 1</td>
            </tr>
            <tr className="border-b border-ivory/5">
              <td className="py-1.5 pr-4">Column</td>
              <td className="py-1.5 pr-4">Twelve numbers in a column</td>
              <td className="py-1.5">2 : 1</td>
            </tr>
            <tr className="border-b border-ivory/5">
              <td className="py-1.5 pr-4">Dozen</td>
              <td className="py-1.5 pr-4">1–12, 13–24, or 25–36</td>
              <td className="py-1.5">2 : 1</td>
            </tr>
            <tr className="border-b border-ivory/5">
              <td className="py-1.5 pr-4">Red / Black</td>
              <td className="py-1.5 pr-4">All red or all black numbers</td>
              <td className="py-1.5">1 : 1</td>
            </tr>
            <tr className="border-b border-ivory/5">
              <td className="py-1.5 pr-4">Even / Odd</td>
              <td className="py-1.5 pr-4">Even or odd numbers (zero loses)</td>
              <td className="py-1.5">1 : 1</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4">Low / High</td>
              <td className="py-1.5 pr-4">1–18 or 19–36 (zero loses)</td>
              <td className="py-1.5">1 : 1</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">THE ZERO</h3>
        <p className="text-ivory/80">
          European single-zero wheel — one zero, no double-zero (2.7% house edge). All even-money
          and outside bets <strong>lose</strong> on 0. Inside bets that include the zero (Straight
          0, Split 0–1 / 0–2 / 0–3) pay normally.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">AUTO-SPIN</h3>
        <p className="text-ivory/80">
          You get <strong>30 seconds</strong> to place your first bets after entering the table,
          then <strong>10 seconds</strong> between rounds. The <strong>SPIN&nbsp;NOW</strong> button
          skips the current window. The wheel spins whether or not you&rsquo;ve placed a bet — empty
          spins are cosmetic only and don&rsquo;t touch your balance.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">BET MAXIMUMS</h3>
        <p className="text-ivory/80">
          Up to <strong>1000 chips per position</strong> · <strong>unlimited positions</strong> per
          spin. Your total stake is bounded only by your chip balance.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">
          RESULT DETERMINATION
        </h3>
        <p className="text-ivory/80">
          The winning number is decided by the RNG before the wheel starts moving — the spin is
          cosmetic only. The ball settles on the <strong>centre</strong> of the winning pocket so
          the result is always unambiguous.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">REPEAT LAST BETS</h3>
        <p className="text-ivory/70">Not yet supported; coming in a future polish.</p>
      </section>
    </div>
  );
}
