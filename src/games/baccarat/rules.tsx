import type { JSX } from 'react';

export default function BaccaratRules(): JSX.Element {
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">HOW TO PLAY</h3>
        <ol className="ml-5 list-decimal space-y-1">
          <li>Pick a chip denomination, then click any of the 9 zones to place chips.</li>
          <li>Press DEAL. Two cards are dealt to PLAYER and BANKER.</li>
          <li>
            A fixed tableau decides whether either side draws a third card &mdash; no choices.
          </li>
          <li>Whichever side ends with a higher total (ones digit of the sum) wins.</li>
          <li>
            Card values: Ace = 1, 2–9 face, 10/J/Q/K = 0. Total = ones digit (7 + 8 = 15 → 5).
          </li>
        </ol>
        <p className="mt-2 text-xs text-white/60">
          8-deck shoe with a cut card. The shoe reshuffles automatically between rounds once the cut
          card is dealt.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">MAIN BETS</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gold/30 text-xs uppercase tracking-wider text-white/55">
              <th className="py-1.5 pr-4">Bet</th>
              <th className="py-1.5 pr-4">Pays</th>
              <th className="py-1.5">Limits</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">PLAYER wins</td>
              <td className="py-1.5 pr-4">1 : 1</td>
              <td className="py-1.5">5 – 2000</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">BANKER wins</td>
              <td className="py-1.5 pr-4">1 : 1 minus 5% commission</td>
              <td className="py-1.5">5 – 2000</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4">TIE</td>
              <td className="py-1.5 pr-4">8 : 1 (PLAYER &amp; BANKER push on tie)</td>
              <td className="py-1.5">5 – 2000</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs text-white/60">
          Banker commission = <code>floor(winnings × 0.05)</code> — small wins keep the whole prize.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">SIDE BETS</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gold/30 text-xs uppercase tracking-wider text-white/55">
              <th className="py-1.5 pr-4">Bet</th>
              <th className="py-1.5 pr-4">Wins When</th>
              <th className="py-1.5">Pays</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Player Pair / Banker Pair</td>
              <td className="py-1.5 pr-4">That side&rsquo;s first two cards are the same rank</td>
              <td className="py-1.5">11 : 1</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Small</td>
              <td className="py-1.5 pr-4">Exactly 4 cards drawn (no third for either side)</td>
              <td className="py-1.5">1.5 : 1 (floor)</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4">Big</td>
              <td className="py-1.5 pr-4">5 or 6 cards drawn (either side drew a third)</td>
              <td className="py-1.5">0.54 : 1 (floor)</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs text-white/60">
          10 and J do <strong>not</strong> pair — pairs are rank-based, not value-based.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">
          DRAGON BONUS (Player Dragon / Banker Dragon)
        </h3>
        <p className="mb-2 text-white/85">
          Pays on the winning side based on margin of victory. A natural (8 or 9 on first two cards)
          wins regardless of margin. A non-natural margin of 1, 2, or 3 loses even if your side
          wins.
        </p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gold/30 text-xs uppercase tracking-wider text-white/55">
              <th className="py-1.5 pr-4">Win condition</th>
              <th className="py-1.5">Pays</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Natural win (2-card 8 or 9)</td>
              <td className="py-1.5">1 : 1</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Non-natural win by 4</td>
              <td className="py-1.5">1 : 1</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Win by 5</td>
              <td className="py-1.5">2 : 1</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Win by 6</td>
              <td className="py-1.5">4 : 1</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Win by 7</td>
              <td className="py-1.5">6 : 1</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Win by 8</td>
              <td className="py-1.5">10 : 1</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Win by 9</td>
              <td className="py-1.5 text-neon-magenta">30 : 1</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4">Tie with both sides natural</td>
              <td className="py-1.5">Push (stake returned)</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">THIRD-CARD RULES</h3>
        <p className="text-white/85">
          Implemented to the canonical Punto Banco tableau. If either side is dealt a natural (8 or
          9 on the first two cards), the round ends immediately. Otherwise: PLAYER draws on 0–5,
          stands on 6–7. BANKER&rsquo;s action then depends on its own total and (if PLAYER drew)
          the value of PLAYER&rsquo;s third card.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">SCOREBOARD</h3>
        <ul className="ml-5 list-disc space-y-1 text-white/85">
          <li>
            <strong>Bead plate</strong> — one dot per round, oldest first, column-by-column. Red =
            Player, blue = Banker, green = Tie.
          </li>
          <li>
            <strong>Big road</strong> — the canonical walked-pen layout: same-side wins drop down
            the column; a different winner starts a new column; ties overlay a count on the most
            recent cell.
          </li>
        </ul>
      </section>
    </div>
  );
}
