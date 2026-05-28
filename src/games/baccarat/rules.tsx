import type { JSX } from 'react';

/**
 * MASQUER · Baccarat rules. Mirrors the Slots / Blackjack / Roulette
 * section structure: sectioned `<h3>` display-face headings on the
 * gold token, body copy at `text-ivory/85`, brass-hairline table rules.
 * Content covers object, card values, naturals, the canonical
 * Punto Banco third-card tableau (summary form — full tableau lives
 * in ADR-0036), all 9 zone payouts, banker commission floor-rounding,
 * shoe + cut card behaviour, bet limits, and the bead-plate / big-road
 * scoreboard.
 */
export default function BaccaratRules(): JSX.Element {
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-1 font-display text-xs uppercase tracking-[0.18em] text-gold-bright">
          Object
        </h3>
        <p className="text-sm text-ivory/85">
          Bet on which side wins — PLAYER or BANKER — or that they TIE. Each side is dealt at least
          two cards. The hand total is the <em>ones digit</em> of the card-value sum (7 + 8 = 15 →
          5). Whichever total is closer to 9 wins.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs uppercase tracking-[0.18em] text-gold-bright">
          Card values
        </h3>
        <p className="text-sm text-ivory/85">
          Ace = 1 · 2–9 face value · 10 / J / Q / K = 0. Suits and colours are irrelevant. Pairs are{' '}
          <em>rank</em>-based, not value-based — two 10s pair, a 10 and a J do not.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs uppercase tracking-[0.18em] text-gold-bright">
          Naturals
        </h3>
        <p className="text-sm text-ivory/85">
          A 2-card total of 8 or 9 is a <strong className="text-gold-bright">natural</strong> and
          ends the hand immediately — no third cards are drawn. Two naturals at the same total push
          (or tie, depending on the bet).
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs uppercase tracking-[0.18em] text-gold-bright">
          Third-card rules
        </h3>
        <p className="text-sm text-ivory/85">
          Drawing is automatic — no player choices. The dealer follows the canonical Punto Banco
          tableau:
        </p>
        <ul className="ml-5 mt-1.5 list-disc space-y-1 text-sm text-ivory/85">
          <li>
            <strong>Player</strong> draws on totals 0–5, stands on 6–7.
          </li>
          <li>
            <strong>Banker</strong>&rsquo;s action depends on its total <em>and</em> (if Player
            drew) the value of Player&rsquo;s third card. Lower Banker totals draw more
            aggressively; higher totals stand more often.
          </li>
          <li>Either side&rsquo;s natural skips everything above.</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs uppercase tracking-[0.18em] text-gold-bright">
          Main bets
        </h3>
        <table className="w-full text-left text-sm text-ivory/85">
          <thead>
            <tr className="border-b border-brass/40 text-[10px] uppercase tracking-[0.18em] text-ivory/55">
              <th className="py-1.5 pr-4">Bet</th>
              <th className="py-1.5 pr-4">Pays</th>
              <th className="py-1.5">Limits</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-brass/15">
              <td className="py-1.5 pr-4">
                <span className="font-display text-scoreboard-player">PLAYER</span> wins
              </td>
              <td className="py-1.5 pr-4 font-numeral tabular-nums text-gold-bright">1 : 1</td>
              <td className="py-1.5 font-numeral tabular-nums">5 – 2000</td>
            </tr>
            <tr className="border-b border-brass/15">
              <td className="py-1.5 pr-4">
                <span className="font-display text-scoreboard-banker">BANKER</span> wins
              </td>
              <td className="py-1.5 pr-4 font-numeral tabular-nums text-gold-bright">1 : 1 − 5%</td>
              <td className="py-1.5 font-numeral tabular-nums">5 – 2000</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4">
                <span className="font-display text-scoreboard-tie">TIE</span>
              </td>
              <td className="py-1.5 pr-4 font-numeral tabular-nums text-gold-bright">8 : 1</td>
              <td className="py-1.5 font-numeral tabular-nums">5 – 2000</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ivory/65">
          On a TIE, Player / Banker stakes <em>push</em> (returned, no win). Banker commission is
          floor-rounded — <code className="text-gold-bright">floor(winnings × 0.05)</code> — so
          banker wins under 20 chips effectively pay the whole prize.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs uppercase tracking-[0.18em] text-gold-bright">
          Side bets
        </h3>
        <table className="w-full text-left text-sm text-ivory/85">
          <thead>
            <tr className="border-b border-brass/40 text-[10px] uppercase tracking-[0.18em] text-ivory/55">
              <th className="py-1.5 pr-4">Bet</th>
              <th className="py-1.5 pr-4">Wins when</th>
              <th className="py-1.5">Pays</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-brass/15">
              <td className="py-1.5 pr-4">Player Pair · Banker Pair</td>
              <td className="py-1.5 pr-4">That side&rsquo;s first two cards are the same rank</td>
              <td className="py-1.5 font-numeral tabular-nums text-gold-bright">11 : 1</td>
            </tr>
            <tr className="border-b border-brass/15">
              <td className="py-1.5 pr-4">Small</td>
              <td className="py-1.5 pr-4">Exactly 4 cards dealt (no third for either side)</td>
              <td className="py-1.5 font-numeral tabular-nums text-gold-bright">1.5 : 1 (floor)</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4">Big</td>
              <td className="py-1.5 pr-4">5 or 6 cards dealt (either side drew a third)</td>
              <td className="py-1.5 font-numeral tabular-nums text-gold-bright">
                0.54 : 1 (floor)
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ivory/65">
          Small + Big are mutually exclusive — every round resolves exactly one.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs uppercase tracking-[0.18em] text-gold-bright">
          Dragon Bonus
        </h3>
        <p className="mb-2 text-sm text-ivory/85">
          Player Dragon / Banker Dragon pay on the chosen side based on the margin of victory. A
          natural always wins (any margin). A non-natural win by 1 / 2 / 3 loses — even if your side
          wins.
        </p>
        <table className="w-full text-left text-sm text-ivory/85">
          <thead>
            <tr className="border-b border-brass/40 text-[10px] uppercase tracking-[0.18em] text-ivory/55">
              <th className="py-1.5 pr-4">Win condition</th>
              <th className="py-1.5">Pays</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-brass/15">
              <td className="py-1.5 pr-4">Natural win (2-card 8 or 9)</td>
              <td className="py-1.5 font-numeral tabular-nums text-gold-bright">1 : 1</td>
            </tr>
            <tr className="border-b border-brass/15">
              <td className="py-1.5 pr-4">Non-natural win by 4</td>
              <td className="py-1.5 font-numeral tabular-nums text-gold-bright">1 : 1</td>
            </tr>
            <tr className="border-b border-brass/15">
              <td className="py-1.5 pr-4">Win by 5</td>
              <td className="py-1.5 font-numeral tabular-nums text-gold-bright">2 : 1</td>
            </tr>
            <tr className="border-b border-brass/15">
              <td className="py-1.5 pr-4">Win by 6</td>
              <td className="py-1.5 font-numeral tabular-nums text-gold-bright">4 : 1</td>
            </tr>
            <tr className="border-b border-brass/15">
              <td className="py-1.5 pr-4">Win by 7</td>
              <td className="py-1.5 font-numeral tabular-nums text-gold-bright">6 : 1</td>
            </tr>
            <tr className="border-b border-brass/15">
              <td className="py-1.5 pr-4">Win by 8</td>
              <td className="py-1.5 font-numeral tabular-nums text-gold-bright">10 : 1</td>
            </tr>
            <tr className="border-b border-brass/15">
              <td className="py-1.5 pr-4">Win by 9</td>
              <td className="py-1.5 font-numeral tabular-nums text-jewel-magenta">30 : 1</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4">Tie with both sides natural</td>
              <td className="py-1.5">Push (stake returned)</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs uppercase tracking-[0.18em] text-gold-bright">
          Shoe + cut card
        </h3>
        <p className="text-sm text-ivory/85">
          Cards come from an 8-deck persistent shoe (~416 cards) — every dealt card stays out of
          play until the shoe reshuffles. A cut card is placed uniformly somewhere between 14 and 28
          cards from the back. When the dealer crosses it, the <em>current</em> round finishes
          normally and the <em>next</em> round opens with a fresh shoe.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs uppercase tracking-[0.18em] text-gold-bright">
          Bet limits
        </h3>
        <ul className="ml-5 list-disc space-y-1 text-sm text-ivory/85">
          <li>
            <strong>Player / Banker / Tie</strong> — 5 to 2000 chips per zone.
          </li>
          <li>
            <strong>Pairs / Big / Small / Dragons</strong> — 5 to 1000 chips per zone.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs uppercase tracking-[0.18em] text-gold-bright">
          Scoreboard
        </h3>
        <ul className="ml-5 list-disc space-y-1 text-sm text-ivory/85">
          <li>
            <strong>Bead plate</strong> — one dot per round, oldest first, top-to-bottom and then
            left-to-right. <span className="text-scoreboard-player">Blue = Player</span> ·{' '}
            <span className="text-scoreboard-banker">Red = Banker</span> ·{' '}
            <span className="text-scoreboard-tie">Green = Tie</span>. A small dot in the corner
            marks a pair on that side.
          </li>
          <li>
            <strong>Big road</strong> — the canonical walked-pen layout: same-side wins drop down
            the column; a different winner starts a new column; ties overlay a count on the most
            recent non-tie cell. Use it however helps your superstition.
          </li>
        </ul>
      </section>
    </div>
  );
}
