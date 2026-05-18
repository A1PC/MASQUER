import type { JSX } from 'react';

export default function CoinFlipRules(): JSX.Element {
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">HOW TO PLAY</h3>
        <ol className="ml-5 list-decimal space-y-1">
          <li>Choose a bet amount between 1 and 500 chips.</li>
          <li>Pick HEADS or TAILS.</li>
          <li>The coin flips. If your side comes up, you win.</li>
        </ol>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">PAYOUTS</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gold/30 text-xs uppercase tracking-wider text-white/55">
              <th className="py-1.5 pr-4">Outcome</th>
              <th className="py-1.5 pr-4">Payout</th>
              <th className="py-1.5">Probability</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Your side wins</td>
              <td className="py-1.5 pr-4">1 : 1</td>
              <td className="py-1.5">50%</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4">Other side wins</td>
              <td className="py-1.5 pr-4">Lose stake</td>
              <td className="py-1.5">50%</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">HOUSE EDGE</h3>
        <p className="text-white/70">
          0%. This is a fair coin — no house take. Your long-run expected value is exactly your bet.
        </p>
      </section>
    </div>
  );
}
