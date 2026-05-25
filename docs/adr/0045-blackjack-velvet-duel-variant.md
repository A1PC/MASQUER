# ADR-0045: Blackjack "Velvet Duel" variant (Phase 15 #5)

- Status: Accepted
- Date: 2026-05-25
- Deciders: @adamzspare

## Context

Phase 3 shipped a faithful Vegas-Strip blackjack: 6-deck shoe, H17, split-to-4
with DAS, double, insurance, natural 3:2 (ADR-0021 through ADR-0028). It works,
but as a single-player offline game it lacks the live-table tension of a real
heads-up duel: the player decides everything, then the dealer plays out his
hand in a deterministic block at the end. There is no _interplay_.

Phase 15 #5 ("Blackjack Upgrade") is also our opportunity to lock the
**MasquerCard** visual language for every card game and to retire the
Phase-3-deferred ask for Royal art on J/Q/K. While we were already touching
the page anyway, we took the opportunity — per CLAUDE.md's spec-first hard
rule — to add a deliberate gameplay drama layer: the **"Velvet Duel"** variant.
Pure cosmetic changes ship in PR A (`MasquerCard`) and PR C (page rebuild);
this ADR records the rules that change in PR B.

The brainstorming that produced the variant is captured in
[`docs/superpowers/specs/2026-05-25-phase-15-5-blackjack-design.md`](../superpowers/specs/2026-05-25-phase-15-5-blackjack-design.md)
(§2 "Decisions" and §3.2 "Velvet Duel — gameplay machine changes").

## Decision

Adopt the **Velvet Duel** variant on top of the Phase-3 baseline. Four rule
additions; everything else (split-to-4, DAS, double, insurance, surrender,
H17, natural 3:2, the seeded 6-deck shoe, integer money, one-row-per-round
recording) is preserved unchanged.

1. **Dealer interleaves card-by-card.** After each player `Hit`, `Double`, or
   the first card dealt to a new split hand, the dealer's hole card flips
   face-up (idempotent) and the dealer draws exactly **one** additional
   face-up card. This continues until the dealer's total reaches the H17
   stand threshold (hard 17 or higher; soft 17 still hits per ADR-0021), at
   which point alternation stops and the dealer takes no further cards
   regardless of subsequent player actions. If alternation never fires the
   dealer simply plays out his hand normally after the player is done — the
   existing post-stand `dealer_action` loop. `STAND` does **not** trigger an
   alternation tick.

2. **Min-stand-14.** The player must `Hit` on any total below 14. The
   machine's `STAND` guard rejects illegal stands; the UI mirrors the
   restriction with a disabled `Stand` button and a "Must Hit on totals
   below 14" helper line (PR C). The threshold tightens early-game decisions
   and biases sessions toward longer hands (and therefore more 5-Card
   Charlie opportunities, see below).

3. **Player chooses each Ace's value (1 or 11).** When the player draws an
   Ace — on the opening deal, on a `Hit`, on a `Double`, or as the second
   card of a split hand — the machine emits an `ACE_PROMPT` with the card
   coordinates and an `allowEleven` flag. The flag is `false` (and the Ace
   auto-locks at 1 with no prompt) iff counting the Ace as 11 would
   immediately push the hand above 21; otherwise the player resolves via
   `CHOOSE_ACE { value: 1 | 11 }` and the Ace's value is locked for the
   remainder of the hand. Multiple Aces prompt sequentially in deal order.
   The lock is honoured by `handTotal()`, which never demotes a locked-11
   Ace (the player chose it deliberately). **Dealer Aces never prompt** and
   keep classic soft-auto-11 behaviour — the duel is the player's choice to
   make, not the dealer's. Alternation does **not** fire between a deal and
   its associated `ACE_PROMPT` (the spec is explicit: "alternation only
   fires after a fully-resolved player action").

4. **5-Card Charlie 3:2 bonus.** A winning hand that contains **5 or more
   cards** pays **`floor(bet * 2.5)`** (stake + 1.5× winnings) instead of
   the standard 1:1. The bonus applies only on a `player-win` outcome
   (never on push, loss, or bust) and is mutually exclusive with the
   natural-blackjack 3:2 — a natural is exactly 2 cards by definition. On
   split hands the bonus is evaluated per hand independently. Settle.ts
   carries a per-hand `fiveCardCharlie: boolean` through `HandResult` and
   `BlackjackRoundDetails.hands[]`; PR C's outcome `Badge` reads
   "5-CARD CHARLIE +1.5×" and PR C's sound layer plays `win.medium` (one
   tier up from the standard `win.small`).

5. **Bust ends the Velvet Duel alternation:** player bust on HIT skips the
   dealer interleave for that hand; dealer bust during an interleave draw
   settles all live player hands immediately as wins.

The unchanged Phase-3 mechanics carried forward without modification:

- **Insurance + peek** (ADR-0023). Runs at deal time before any alternation.
  A dealer natural BJ on peek settles the round immediately; alternation is
  never armed in that case.
- **Split-to-4 with DAS** (ADR-0022). Split-Aces remain one-card-each with
  no further player action; each hand's bonus is evaluated independently.
- **Double** (ADR-0022). One card after doubling; the hand is then resolved.
  The doubled hand can still earn the Charlie bonus only if it ends with 5+
  cards (rare — doubling caps at 3 cards in the doubled hand).
- **Surrender** — preserved as a future-Phase-3 mechanic; if/when the
  `SURRENDER` event is added, it must short-circuit alternation (no dealer
  draw on surrender, per the spec's PR-B step 4).
- **H17** (ADR-0021), **shoe penetration** (ADR-0024), **bet limits &
  rounding** (ADR-0025).
- **One `rounds` row per completed round** via `wallet.settleRound`
  (ADR-0016); the Velvet Duel additions only enrich `BlackjackRoundDetails`,
  they do not introduce a second persistence path.

## Alternatives considered

- **No rule changes; only the visual re-skin.** Faithful to Vegas, but
  squanders the once-per-phase opportunity to add gameplay drama. The
  brainstorming explicitly weighed and rejected this — "Velvet Duel" was
  named to signal that we deliberately stepped away from a generic
  Vegas-faithful build to give the offline game its own identity.
- **Always-soft Aces (no player choice).** Keeps the existing
  `handTotal()` semantics. Rejected because the Ace decision is one of the
  most evocative moments in real-life blackjack and was free to model — the
  cost is a single prompt state and one optional `aceValue` field.
- **6-Card Charlie or 7-Card Charlie.** Less generous bonuses are common in
  some house rules. We picked 5 to align with the **min-stand-14** rule
  (which already pushes hands toward 4+ cards); 5+ keeps the bonus
  achievable for engaged players without devaluing the natural 3:2.
- **Alternate every-other-card without an upper bound.** Would force the
  dealer to play recklessly past 17. Rejected — keeping the H17 stop
  preserves the existing `dealerShouldHit` helper and the H17 ADR.
- **Per-Ace lock at 11 by default with a button to flip to 1.** Equivalent
  but UX-noisier; the explicit prompt is unambiguous and matches the
  brand's "old-school Vegas content / modern web execution" stance.

## Consequences

- **Easier:** The player now has a meaningful decision per Ace and per
  dealer-draw beat; the round feels like a duel. The 5-Card Charlie pays
  off the longer hands the min-stand-14 rule already encourages. The
  per-hand Charlie flag lets the Recent Results panel and Stats surface a
  visible bonus without re-deriving it.
- **Harder:** The machine grows three context fields (`dealerInterleaving`,
  `pendingDealerDraw`, `acePrompt`), two new states (`awaiting_ace_choice`,
  `checking_player_aces` + a bridge), and one new event (`CHOOSE_ACE`). The
  ace-prompt-then-resume chaining adds a `pendingAfterAce` discriminator
  that has to be set on every entry path to `checking_player_aces`. Future
  game changes (e.g. Surrender) must remember to clear `pendingDealerDraw`
  to avoid an unintended alternation tick. The page UI (PR C) gains a
  blocking Modal — the `AceValuePrompt` — that has to coordinate with the
  existing `InsurancePrompt` Modal (only one open at a time, but both can
  fire in the same round).
- **Locked-in:** Game logic IS modified by this ADR, on purpose, per
  CLAUDE.md's spec-first hard rule (rule #2). Any future blackjack work
  starts from the Velvet Duel baseline; reverting to a Vegas-faithful build
  would require another spec change and another ADR.

## References

- [`BUILD_GUIDE.md` §8.1 — Blackjack rules (Velvet Duel subsection)](../../BUILD_GUIDE.md#81-blackjack--build-first).
- [`docs/superpowers/specs/2026-05-25-phase-15-5-blackjack-design.md`](../superpowers/specs/2026-05-25-phase-15-5-blackjack-design.md) — §2 Decisions, §3.2 Velvet Duel — gameplay machine changes.
- [`docs/superpowers/plans/2026-05-25-phase-15-5-blackjack-plan.md`](../superpowers/plans/2026-05-25-phase-15-5-blackjack-plan.md) — PR-B task breakdown.
- Phase-3 baseline ADRs (preserved): ADR-0021 (H17), ADR-0022 (split-to-4 + DAS), ADR-0023 (insurance), ADR-0024 (shoe penetration), ADR-0025 (bet limits + rounding), ADR-0026 (XState machine), ADR-0027 (card style — superseded by MasquerCard in PR A), ADR-0028 (multi-hand wallet pattern).
- ADR-0016 — one `rounds` row per round via `wallet.settleRound`.
