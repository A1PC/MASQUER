# Phase 15 · Sub-project #5 — Blackjack Upgrade ("Velvet Duel")

**Status:** Design spec. Second per-game upgrade in release order (Blackjack was Phase 3, the second game shipped). Part of the [Phase 15 umbrella roadmap](./2026-05-22-phase-15-umbrella-roadmap-design.md); consumes #0 brand, #1 components, #2 motion/sound, #3 shell.

**Date:** 2026-05-25

---

## 1. Goal

Re-skin Blackjack on the MASQUER design system, ship the **unified MasquerCard** (the card visual every card game will use), retire the deferred Phase-3 ask for **Royal art on J/Q/K**, and add a meaningful gameplay drama layer — the **"Velvet Duel" variant**: the dealer interleaves card-by-card with the player (per player action) until he reaches 17, and the player must Hit on totals below 14. All existing Phase-3 mechanics (Split-to-4, DAS, Double, Insurance, Surrender, H17) stay intact.

## 2. Decisions (from brainstorming)

- **Unified `MasquerCard`** — one shared component (`src/components/brand/PlayingCard.tsx`) used by Blackjack now and adopted by Baccarat (#7) + the poker trio (#12.v1–v3) when they come up. Replaces blackjack's local `Card.tsx` and the poker `_shared/PlayingCard.tsx` (in a later sub-project).
- **Royal art for J/Q/K** ships now — stylised SVG silhouette + masquerade mask, gold/oxblood deco palette. Inline SVG (no binary assets).
- **Velvet Duel variant** — alternating-draw rules layered on top of standard blackjack:
  - **Initial deal stays standard:** player gets 2 face-up cards, dealer gets 1 face-up + 1 face-down hole. Insurance prompt + peek as today when dealer up = Ace.
  - **Min-stand-14:** Stand is disabled when the player's hand total is < 14 (must Hit). Enforced in both the UI (button disabled) and the machine (guard rejects illegal Stand).
  - **Dealer interleaves:** after each player Hit / Double / Split (the first action on a new split hand counts), the dealer's hole flips face-up if not already, then the dealer draws **one** face-up card. Surrender does NOT trigger a dealer draw.
  - **Dealer stops at 17+** per the existing H17 rule (hits soft 17). Once he stands, he draws no more, and the player keeps playing until Stand (≥14) or Bust on every remaining hand.
  - **After player is done on all hands:** if dealer is still < 17, dealer plays out his hand normally per H17; otherwise the round settles immediately.
  - **Player Ace value is a player choice.** When the player draws an Ace (initial deal or any Hit/Split-second-card), the page prompts: _"Count this Ace as 1 or 11?"_. The choice is locked for that Ace for the remainder of the hand. If counting it as 11 would _immediately_ push the hand over 21, only 1 is offered (auto-selected; no prompt). Multiple Aces each prompt in deal order. **Dealer Aces stay automatic (soft per H17)** — the duel is the player's choice to make, not the dealer's.
  - **5-Card Charlie bonus.** A winning hand that contains **5 or more cards** (and is not a natural blackjack — a natural is by definition 2 cards) pays **3:2** instead of 1:1. The bonus applies only on a _win_ outcome (no bonus on push or loss) and stacks with neither the natural-blackjack 3:2 payout (mutually exclusive: a natural is 2 cards) nor insurance (insurance is its own side bet). For a split hand, each hand evaluates the bonus independently.
- Recorded as new **ADR-0045** (Velvet Duel blackjack variant) and reflected in `BUILD_GUIDE.md` §10.x blackjack rules (spec-first per CLAUDE.md).

## 3. Architecture

### 3.1 `MasquerCard` (`src/components/brand/PlayingCard.tsx`)

Pure presentational React component. Props: `rank: 1|2|…|13` (Ace = 1 or 14 — pick one convention; the blackjack `cards.ts` uses 1 for Ace), `suit: 'h'|'d'|'c'|'s'`, `faceDown?: boolean`, `size?: 'sm'|'md'|'lg'`, `className?: string`. Faces use the porcelain background + gold inset border + Times-serif (`Cormorant Garamond` 700) rank glyphs in the corners (rank + small suit beneath), with a centred large pip / Ace symbol / royal silhouette. Suits hearts/diamonds = oxblood `#a3122a`, clubs/spades = ink `#0c1711`. The royal art (`rank === 11/12/13`) renders one of three small inline SVG silhouettes (J = masqued courtier; Q = crowned figure with eye-mask; K = bearded crowned figure with eye-mask) — all in gold linework with oxblood/ink drapes, inside the card's gold frame. Card back = oxblood pinstripe + a centred Colombina mask SVG + Cinzel "M" + gold inner rule (matches the locked brand card back). Reuses `MaskMark` for the back's mask.

A small companion test (`PlayingCard.test.tsx`) covers: faces render rank + suit text in the corners; royals render their silhouette `<g>` group; `faceDown` renders the back (assert mask `role="img"`); `size` prop drives width/height. A Storybook story (`PlayingCard.stories.tsx` — under `src/components/brand/` only if Storybook globs catch it; otherwise add to the existing UI story dir) showcases number + ace + each royal + back.

### 3.2 Velvet Duel — gameplay machine changes (`src/games/blackjack/machine.ts`)

Add the alternation phase + min-stand guards while keeping every existing mechanic working.

- New context flag `dealerInterleaving: boolean` — starts `true` for a non-blackjack deal; flips to `false` the first time dealer's total reaches 17 (hard or soft per H17).
- The existing `dealing → player_turn → dealer_turn → settling` flow becomes `dealing → insurance_check → player_turn ⇄ dealer_draw → … → dealer_finish (if needed) → settling`.
- `STAND` event guarded by `playerTotal >= 14`; UI mirrors with disabled `Stand` button + helper text ("Must Hit on totals below 14").
- After **`HIT`/`DOUBLE`** (and after `SPLIT` resolves into the first hand): if `dealerInterleaving`, run a `dealer_draw_one` step — flip hole (idempotent), deal one card to dealer, recompute totals, check stand threshold (≥ 17 hard, or > 17 / hard 17 per H17 rule), flip `dealerInterleaving = false` if reached. If dealer busts mid-alternation, mark `dealerBusted = true` (existing field if present, else add) and continue letting the player play any remaining hands purely to determine player-side outcomes (a busted dealer guarantees player wins on any non-busted hand).
- **`SURRENDER`** does NOT trigger a dealer draw (per the brainstorm decision). The round resolves immediately per existing rules.
- **`INSURANCE`** prompt + peek run BEFORE alternation begins (at deal time). If dealer has natural blackjack on peek → round ends immediately as today (insurance pays, main bet lost unless player also has BJ → push).
- **Splits:** alternation triggers on each player action across both hands. After the last hand stands or busts, the dealer-finish step plays out any remaining dealer draws per H17 (if dealer hasn't reached 17 already).
- **Player Ace value choice.** Hand state grows a per-card `aceValue?: 1 | 11` field for player Aces only. Whenever a player Ace is dealt, the machine enters a transient `awaiting_ace_choice` state for the active hand and emits a new `ACE_PROMPT { handIndex, cardIndex, allowEleven }` snapshot field; `allowEleven = false` when 11 would push the hand over 21 (in that case the machine auto-locks the ace at 1 without prompting). The player resolves via `CHOOSE_ACE { value: 1 | 11 }`; the machine writes `aceValue` on the card and resumes whatever step came next (more cards to deal, dealer interleave, or back to `player_turn`). `handTotal()` in `hand.ts` now respects locked `aceValue` for player aces and continues to apply soft-auto-11 for dealer aces. Dealer interleave does NOT happen _between_ the deal and the ace prompt — alternation only fires after a fully-resolved player action.
- **5-Card Charlie bonus.** `settle.ts` adds a `fiveCardCharlie: boolean` field per hand result, true when `hand.cards.length >= 5 && outcome === 'win'`. The payout for that hand becomes `floor(bet * 2.5)` (stake + 1.5× winnings) instead of `bet * 2` (standard 1:1). A natural blackjack is exactly 2 cards so the conditions are mutually exclusive. `BlackjackRoundDetails` carries the per-hand `fiveCardCharlie` flag so stats / Recent Results can show a badge.
- All existing machine tests (`machine.test.ts`, `dealer.test.ts`, `settle.test.ts`, `hand.test.ts`) updated to assert the new flow + new scenarios (alternation, min-stand, surrender doesn't trigger dealer draw, blackjack-on-peek ends pre-alternation, ace-prompt resumes the right step, ace-prompt skipped when 11 would bust, 5-card win pays 3:2, 5-card loss pays nothing extra, 5-card push pushes).

### 3.3 `BlackjackPage` rebuild

Rebuild from #1 primitives + #2 motion/sound + the new `MasquerCard`. Composition: `GameShell` shell + a deco `Panel` for the table felt; `DealerArea` (re-skinned) shows the dealer's hand (cards face-up + the hole-card slot that flips on the first alternation tick); `PlayerArea` shows the player's hand(s) with split tabs and the running total; the existing `BettingPanel` for the bet + `ActionPanel` re-skinned with #1 `Button`s (Hit / Stand / Double / Split / Surrender / Insurance), Stand disabled when total < 14 with a Tooltip explanation. A new `AceValuePrompt` Modal (using #1 `Modal` + two large `Button`s) opens when `awaiting_ace_choice` is active — title "Count this Ace as", buttons `1` and `11` (the `11` button is hidden / disabled when `allowEleven === false`). Use `Badge` for outcomes (BLACKJACK / 21 / BUST / SURRENDER / **5-CARD CHARLIE**) and the win-streak indicator (consecutive wins, matches the coin-flip pattern — small Badge with Flame icon). When a hand wins with `fiveCardCharlie`, the outcome Badge reads "5-CARD CHARLIE +1.5×" and the celebration plays `win.medium` (tier up from the standard `win.small`).

**Sound** via `useSound`: `chip.place` on bet commit, `card.deal` on every card dealt (player + dealer alternation reveals), `win.small`/`win.medium` on settle by amount tiers, `loss` on bust/loss. `card.deal` already exists in the taxonomy. **Motion** via #2 shared variants + `useEffectiveReducedMotion`: cards slide in from the deck position with a brief flip (transform-only, ≤ 250 ms); dealer hole flip uses the same flip variant. Reduced-motion = instant.

## 4. PR split

- **PR A — `MasquerCard` + royal art.** Add `src/components/brand/PlayingCard.tsx` (+ test + story), royal silhouettes for J/Q/K, the mask card back. Purely additive — no game touched yet. Other card games keep their own components until they're re-skinned.
- **PR B — Velvet Duel rules + machine.** Modify `src/games/blackjack/machine.ts` for alternation + min-stand-14 + dealer-finish-after-player; update `dealer.ts`/`hand.ts`/`settle.ts` if helpers need new branches. Update `machine.test.ts` / `dealer.test.ts` / `settle.test.ts` / `hand.test.ts`. Add **ADR-0045** (Velvet Duel variant). Update `BUILD_GUIDE.md` §10.x blackjack rules.
- **PR C — Page rebuild.** Replace `Card.tsx` (and `Card.test.tsx`, `HandView.tsx`, `HandView.test.tsx`, the `PIP_LAYOUT.ts` constants) usage with the new `MasquerCard`; rebuild `BlackjackPage.tsx` (+ `BlackjackPage.test.tsx`) + `DealerArea`/`PlayerArea`/`ActionPanel`/`InsurancePrompt` on #1 primitives + #2 motion/sound; add the win-streak indicator. Delete the now-unused local card files.

## 5. Testing

- **`MasquerCard`** — face / royal / back render assertions; suit colour token; `faceDown` renders the back; size variants.
- **Velvet Duel machine** (extending `machine.test.ts`): standard deal + insurance peek + Velvet Duel alternation (player hit → dealer draw); min-stand-14 guard rejects illegal Stand; surrender does not trigger a dealer draw; dealer reaching 17 mid-alternation stops further interleaving; dealer playing out after player stands when still < 17; split + alternation interaction; double + alternation; blackjack-on-peek ends pre-alternation; **ACE_PROMPT emitted with `allowEleven=false` when 11 would bust (auto-locked at 1, no prompt); CHOOSE_ACE locks the per-card value and resumes the next step (more deals / alternation / player_turn); dealer Aces never prompt**.
- **5-Card Charlie payout** (extending `settle.test.ts`): win with 5 cards → payout = `floor(bet * 2.5)`; loss with 5 cards → no bonus; push with 5 cards → push (no bonus); natural blackjack (2 cards) keeps its 3:2 payout and is mutually exclusive; per-hand independence on splits.
- **Settle** (existing) updated for the variant scenarios where new dealer outcomes can occur (e.g., dealer bust mid-alternation, dealer 17 reached during alternation then stays).
- **Page** — Stand disabled with helper text when player total < 14; dealer reveals one card after each player Hit; final settle writes one `rounds` row with `game: 'blackjack'`; `useSound.play` called with the right ids (mocked).
- DoD: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`.

## 6. Invariants & out of scope

Game logic IS modified (the Velvet Duel variant is a deliberate rule change recorded in ADR-0045 and BUILD_GUIDE — per CLAUDE.md spec-first). One `rounds` row per round preserved; integer money; seeded RNG; games sandbox preserved (page imports go through `_shared`/`@/systems`/`@/motion` — no `@/db`/`@/store` from inside `src/games/**`); tokens-only; reduced-motion via #2; CLAUDE.md not edited. **Out of scope:** side bets (Perfect Pairs / 21+3), basic-strategy hint, multi-hand spread, photorealistic court-card art. The shared `MasquerCard` is **introduced** here but only Blackjack adopts it; Baccarat (#7) and Poker (#12.v1–v3) migrate from their own card components when those sub-projects run.

## 7. Open decisions

None outstanding — card visual locked from the mockup, Velvet Duel rules pinned in §2/§3.2, PR split agreed. ADR-0045 number reserved.
