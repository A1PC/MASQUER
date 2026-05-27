import type { JSX } from 'react';
import RulesModal from '@/games/_shared/RulesModal';

type Variant = 'holdem' | 'five-card-draw' | 'omaha';

interface Props {
  open: boolean;
  variant: Variant;
  onClose: () => void;
}

function HoldemRules(): JSX.Element {
  return (
    <div className="space-y-3 text-ivory/85" data-poker-rules-body="holdem">
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">OBJECT</h3>
        <p>Make the best 5-card hand from your 2 hole cards + the 5 community cards.</p>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">
          HAND RANKINGS (HIGH → LOW)
        </h3>
        <ol className="list-inside list-decimal text-sm">
          <li>Royal Flush · Straight Flush</li>
          <li>Four of a Kind</li>
          <li>Full House</li>
          <li>Flush</li>
          <li>Straight</li>
          <li>Three of a Kind</li>
          <li>Two Pair</li>
          <li>One Pair</li>
          <li>High Card</li>
        </ol>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">BETTING ROUNDS</h3>
        <p>Preflop → Flop (3) → Turn (1) → River (1). Action: fold · check · call · raise.</p>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">BLINDS</h3>
        <p>
          Heads-up: button is small blind. 3+: button posts nothing; next two seats post SB + BB.
        </p>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">SHOWDOWN</h3>
        <p>
          If two or more players remain after the final betting round, hole cards are revealed and
          the best 5-card hand wins the pot (split on ties).
        </p>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">TABLE</h3>
        <p>Cash game. Buy-in = 80 BB. Rebuy on bust. Leave Table at any time between hands.</p>
      </section>
    </div>
  );
}

function DrawRules(): JSX.Element {
  return (
    <div className="space-y-3 text-ivory/85" data-poker-rules-body="five-card-draw">
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">OBJECT</h3>
        <p>
          Make the best 5-card hand from your dealt 5 cards. After the first betting round
          optionally replace 0-3 cards from the deck. Best hand after the second betting round wins.
        </p>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">
          HAND RANKINGS (HIGH → LOW)
        </h3>
        <ol className="list-inside list-decimal text-sm">
          <li>Royal Flush · Straight Flush</li>
          <li>Four of a Kind</li>
          <li>Full House</li>
          <li>Flush</li>
          <li>Straight</li>
          <li>Three of a Kind</li>
          <li>Two Pair</li>
          <li>One Pair</li>
          <li>High Card</li>
        </ol>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">BLINDS</h3>
        <p>
          Heads-up: button is small blind. 3+: button posts nothing; next two seats post SB + BB.
        </p>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">DRAW PHASE</h3>
        <p>
          Tap cards to select up to 3 for replacement. Click DRAW to swap, or STAND PAT to keep your
          hand. Order: pre-draw bet → draw → post-draw bet → showdown.
        </p>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">BETTING ROUNDS</h3>
        <p>Pre-draw and post-draw. Action: fold · check · call · raise.</p>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">SHOWDOWN</h3>
        <p>
          If two or more players remain after the post-draw bet, hole cards reveal and the best
          5-card hand wins the pot (split on ties).
        </p>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">TABLE</h3>
        <p>Cash game. Buy-in = 80 BB. Rebuy on bust. Leave Table at any time between hands.</p>
      </section>
    </div>
  );
}

function OmahaRules(): JSX.Element {
  return (
    <div className="text-ivory/85" data-poker-rules-body="omaha">
      <p className="text-sm italic">Full rules content coming in #12.v3.</p>
    </div>
  );
}

const RULES: Record<Variant, () => JSX.Element> = {
  holdem: HoldemRules,
  'five-card-draw': DrawRules,
  omaha: OmahaRules,
};

const TITLES: Record<Variant, string> = {
  holdem: "MASQUER · Hold'em",
  'five-card-draw': 'MASQUER · Five-Card Draw',
  omaha: 'MASQUER · Omaha',
};

/**
 * Variant-aware `RulesModal` wrapper for the poker trio. Hold'em + Draw ship
 * full rules blocks; Omaha renders a one-line placeholder until the #12.v3
 * polish sub-project fleshes it out.
 */
export default function PokerRulesModal({ open, variant, onClose }: Props): JSX.Element | null {
  const Body = RULES[variant];
  return (
    <RulesModal open={open} title={TITLES[variant]} onClose={onClose}>
      <Body />
    </RulesModal>
  );
}
