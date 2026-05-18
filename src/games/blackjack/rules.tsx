import type { JSX } from 'react';

export default function BlackjackRules(): JSX.Element {
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">HOW TO PLAY</h3>
        <ol className="ml-5 list-decimal space-y-1">
          <li>Place a bet between 5 and 1000 chips, then DEAL.</li>
          <li>You and the dealer each get 2 cards. The dealer&rsquo;s second card is face-down.</li>
          <li>Beat the dealer to 21 without going over. Aces count as 1 or 11; face cards = 10.</li>
          <li>
            Choose HIT (draw a card), STAND (end your turn), DOUBLE (double bet + one card), or
            SPLIT (if your two cards match rank).
          </li>
          <li>If your total exceeds 21 you BUST and lose immediately.</li>
          <li>
            After you stand, the dealer flips and draws to 17 (hits on soft 17 — see &ldquo;House
            rules&rdquo; below).
          </li>
        </ol>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">PAYOUTS</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gold/30 text-xs uppercase tracking-wider text-white/55">
              <th className="py-1.5 pr-4">Outcome</th>
              <th className="py-1.5">Payout</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Natural Blackjack (A + 10-value, first 2 cards)</td>
              <td className="py-1.5">3 : 2</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Standard win</td>
              <td className="py-1.5">1 : 1</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Push (tie)</td>
              <td className="py-1.5">Stake returned</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Insurance (when dealer shows Ace)</td>
              <td className="py-1.5">2 : 1 on the insurance bet</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4">Loss / Bust</td>
              <td className="py-1.5">Lose stake</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">HOUSE RULES</h3>
        <ul className="ml-5 list-disc space-y-1 text-white/85">
          <li>
            <strong>H17</strong> — dealer hits on soft 17.
          </li>
          <li>
            <strong>DAS</strong> — Double After Split is allowed.
          </li>
          <li>
            <strong>Split to 4</strong> — you can split up to 4 times per round.
          </li>
          <li>
            <strong>Split Aces</strong> — receive one card each and stand; no further actions.
          </li>
          <li>
            <strong>Insurance</strong> offered when the dealer shows an Ace; pays 2:1 if the dealer
            has Blackjack.
          </li>
        </ul>
      </section>
    </div>
  );
}
