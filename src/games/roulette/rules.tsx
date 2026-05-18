import type { JSX } from 'react';

export default function RouletteRules(): JSX.Element {
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">HOW TO PLAY</h3>
        <ol className="ml-5 list-decimal space-y-1">
          <li>Pick a chip denomination, then click any bet position to place chips on it.</li>
          <li>Place up to 10 different bets per spin (5–1000 chips each).</li>
          <li>Press SPIN — the ball settles on a single pocket from 0 to 36.</li>
          <li>Every bet covering that pocket pays out; all others lose.</li>
        </ol>
        <p className="mt-2 text-xs text-white/60">
          European single-zero wheel — one zero (no double-zero), giving a 2.7% house edge.
        </p>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">
          BET TYPES &amp; PAYOUTS
        </h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gold/30 text-xs uppercase tracking-wider text-white/55">
              <th className="py-1.5 pr-4">Bet</th>
              <th className="py-1.5 pr-4">Covers</th>
              <th className="py-1.5">Payout</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Straight up</td>
              <td className="py-1.5 pr-4">A single number</td>
              <td className="py-1.5">35 : 1</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Split</td>
              <td className="py-1.5 pr-4">Two adjacent numbers</td>
              <td className="py-1.5">17 : 1</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Street</td>
              <td className="py-1.5 pr-4">A row of three numbers</td>
              <td className="py-1.5">11 : 1</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Corner</td>
              <td className="py-1.5 pr-4">Four numbers forming a square</td>
              <td className="py-1.5">8 : 1</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Line</td>
              <td className="py-1.5 pr-4">Two rows of three (six numbers)</td>
              <td className="py-1.5">5 : 1</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Column</td>
              <td className="py-1.5 pr-4">Twelve numbers in a column</td>
              <td className="py-1.5">2 : 1</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Dozen</td>
              <td className="py-1.5 pr-4">1–12, 13–24, or 25–36</td>
              <td className="py-1.5">2 : 1</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Red / Black</td>
              <td className="py-1.5 pr-4">All red or all black numbers</td>
              <td className="py-1.5">1 : 1</td>
            </tr>
            <tr className="border-b border-white/5">
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
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">NOTES</h3>
        <p className="text-white/70">
          Zero is green and only wins for a Straight-up on 0. All outside bets (red/black, even/odd,
          low/high) lose on zero &mdash; that&rsquo;s the source of the house edge.
        </p>
      </section>
    </div>
  );
}
