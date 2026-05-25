import type { JSX } from 'react';

/**
 * Blackjack — MASQUER Velvet Duel rules.
 *
 * Tight, sectioned and scannable. Designed to fit comfortably in the
 * scrollable RulesModal body. Every section starts with a display-tracked
 * eyebrow heading; bullets are short — no walls of prose.
 */
export default function BlackjackRules(): JSX.Element {
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">OBJECT</h3>
        <p className="text-white/85">
          Beat the dealer&rsquo;s hand without going over 21 (a &ldquo;bust&rdquo;).
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">CARD VALUES</h3>
        <ul className="ml-5 list-disc space-y-1 text-white/85">
          <li>2&ndash;10 count at face value.</li>
          <li>J / Q / K count as 10.</li>
          <li>
            <strong>Ace counts as 1 or 11 — you choose.</strong> If choosing 11 would bust you, the
            Ace auto-locks at 1.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">NATURAL BLACKJACK</h3>
        <p className="text-white/85">
          Ace + any 10-value (10/J/Q/K) on your opening two cards pays <strong>3:2</strong>.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">
          VELVET DUEL ALTERNATION
        </h3>
        <p className="text-white/85">
          After each Hit or Stand the dealer reveals one card before you act again. The duel
          continues until the dealer reaches 17 or higher (<strong>H17</strong>: dealer stands on
          soft 17).
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">MINIMUM STAND 14</h3>
        <p className="text-white/85">
          Stand is disabled while your hand total is below 14 — a house rule unique to MASQUER.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">5-CARD CHARLIE</h3>
        <p className="text-white/85">
          Holding 5 cards without busting (and without a natural Blackjack) pays{' '}
          <strong>3:2</strong>.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">SIDE PLAYS</h3>
        <ul className="ml-5 list-disc space-y-1 text-white/85">
          <li>
            <strong>Split</strong> — matching opening pair? Split into two hands; one extra bet per
            split (up to 4 hands).
          </li>
          <li>
            <strong>Double</strong> — double your bet and take exactly one more card.
          </li>
          <li>
            <strong>Insurance</strong> — offered when the dealer shows an Ace; pays 2:1 if the
            dealer has Blackjack.
          </li>
          <li>
            <strong>Surrender</strong> — forfeit half your bet to fold a weak opening hand.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">BUST AUTO-SETTLE</h3>
        <p className="text-white/85">
          Busting yourself ends the hand immediately. If the dealer busts mid-alternation, every one
          of your live hands is paid instantly.
        </p>
      </section>
    </div>
  );
}
