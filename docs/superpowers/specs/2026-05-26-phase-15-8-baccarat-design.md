# Phase 15 sub-project #8 — Baccarat upgrade

**Status:** Draft for user review.
**Date:** 2026-05-26.
**Sub-project:** #8 in the Phase 15 umbrella (`2026-05-22-phase-15-umbrella-roadmap-design.md`). Per release order, follows #7 Slots ✅, precedes #9 Lottery.
**Original release:** Phase 6 (`v0.7-baccarat`, 2026-05-18). All 9 bet zones (Player/Banker/Tie + Player Pair + Banker Pair + Big + Small + Player Dragon + Banker Dragon), persistent 8-deck shoe with cut card (ADR-0037), canonical Punto Banco third-card tableau (ADR-0036), bead-plate + walked-pen big road scoreboard, theatrical card reveal (slide + corner peek + flip), tier-mapped celebration reusing ADR-0033. Bet limits 5–2000 (main) / 5–1000 (side).
**Scope answer:** _Re-skin + admin analytics page (two PRs)._

---

## 1. Goal

Bring the baccarat table to the MASQUER / Velvet Deco bar via the now-standard polish pattern, and add an all-time `/admin/baccarat` analytics page derived from the existing `rounds` table.

Game mechanics — rules, payouts, shoe, third-card tableau, scoreboard derivation, all 9 bet zones — are **untouched**. ADRs 0036 (tableau + floor rounding) and 0037 (persistent shoe) stand as-is.

---

## 2. Decomposition (two PRs, mirroring sub-project #6 Roulette)

- **PR A — Re-skin** (game-side). Brand visual rebuild, shared `LobbyButton` + `OddsInfoBox` + scrollable rules + flex-row header, refactor to consume the shared `ChipDenominationButton` (factored at #237), `useSound` wiring, MASQUER · Baccarat title, rules rewrite, MasquerCard adapter for `CardReveal` (already partially in place from PR #226 — verify and consolidate). Logic + machine byte-stable.
- **PR B — All-time admin analytics** (`/admin/baccarat`). Read-only over existing `rounds` table; new aggregations in `src/systems/stats.ts`; new page mirroring `/admin/roulette` (#236) + `/admin/slots` (#242).

Both PRs follow the established pattern: implementer subagent, scoped allowlist, DoD `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`, controller monitors + merges on green.

---

## 3. Standing invariants (must survive both PRs)

1. **Pure logic untouched.** `src/games/baccarat/logic.ts`, `shoe.ts`, `types.ts`, `config.ts`, and their `*.test.ts` stay byte-stable. ADR-0036 + ADR-0037 contracts unchanged.
2. **Games sandbox** — no `@/db` or `@/store` imports from `src/games/baccarat/**`. Wallet via `@/systems/**` only.
3. **One `rounds` row per round** (ADR-0016). `rounds.details` shape (`RoundResult` + per-zone payouts) is the contract that PR B reads — no schema migration.
4. **Integer money. No `Math.random()`.** Existing ESLint enforces.
5. **Banker commission floor-round rule** (ADR-0036) — preserved exactly. The commission-of-0 UX label (in the deferred docket — when `floor(winnings * 0.05) === 0`) is **out of scope** for PR A unless it falls out trivially during the rules rewrite.
6. **Spec-first per CLAUDE.md.** ADR amendments (if any) commit before code.
7. **No CLAUDE.md edits.**
8. **Commitlint header-max-length 100** (feedback memory `feedback-masquer-commit-subject-limit`).

---

## 4. PR A — Re-skin

### 4.1 Title + meta

- `BaccaratPage.tsx`: change `title="🎴 BACCARAT"` → `title="MASQUER · Baccarat"`.
- Remove `meta="8-deck shoe · 9 zones"` (auto-suppressed when `oddsInfo` is provided since #231; explicit removal keeps the call site clean).

### 4.2 Shared-shell adoption

Mirror Blackjack / Coin-flip / Roulette / Slots:

- `lobbyButton={<LobbyButton />}` from `@/games/_shared/LobbyButton` (top-left, flex-row from #238).
- `oddsInfo={<OddsInfoBox>...</OddsInfoBox>}` (top-right). Contents: `Player 1:1 · Banker 1:1 (−5%) · Tie 8:1 · Pairs 11:1 · Big 0.54:1 · Small 1.5:1 · Dragons 30:1`. Tune wording to fit the wider OddsInfoBox (post-#237: `max-w-[480px]`).
- `rules={<BaccaratRules />}` already wired — rewrite content per §4.5.
- Scrollable rules container from `RulesModal` (#230) handles long content automatically.

### 4.3 Visual rebuild (brand pass)

Tokenize all colours in `BaccaratPage.tsx`, `BetArea.tsx`, `BetZone.tsx`, `BigSmallZone.tsx`, `ChipSelector.tsx`, `CardReveal.tsx`, `HandView.tsx`, `Scoreboard.tsx`, `BeadPlate.tsx`, `BigRoad.tsx`, `ShoeIndicator.tsx`, `WinCelebration.tsx`. Replace raw hex with brand tokens (`bg-velvet`, `bg-felt-table`, `bg-felt-table-deep`, `text-ivory`, `text-gold`, `text-gold-bright`, `border-brass`, `bg-velvet-deep`, `jewel-magenta` for big-win signature if applicable).

- **Felt** — the felt-table backdrop with brass-bordered bet zones reads classic baccarat. Use the same `bg-felt-table` / `border-brass` palette that Slots and Roulette adopted.
- **Bead plate + big road** — small scoreboard cells; keep their semantic colours (red for Banker, blue for Player, green for Tie) but promote to tokens (`scoreboard-banker / -player / -tie`) so the brand can swap them later. The semantic-colour invariant matters more than the exact hex.
- **Card reveal** — already uses MasquerCard from #226 PR C (the cross-game adapter for baccarat). Verify the integration is clean; consolidate any leftover blackjack-card adapter code if simpler now that MasquerCard exists.

### 4.4 Sound

Wire `useSound` (`@/systems/sound/useSound`):

| Event                                         | Sample                       | Notes                                                                                  |
| --------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| Chip click on any bet zone                    | `chip.place`                 | Reuse                                                                                  |
| DEAL pressed → first card flips               | `card.deal`                  | Reuse                                                                                  |
| Each subsequent card flip (up to 6 total)     | `card.deal`                  | Reuse                                                                                  |
| Tier celebration small / medium / big win     | `win.small/.medium/.jackpot` | Reuse (jackpot reserved for naturals + big side-bet hits)                              |
| Loss (net negative round)                     | `loss`                       | Reuse                                                                                  |
| Shoe cut-card crossed (next round reshuffles) | `wheel.spin`                 | Reuse (whoosh signifies new shoe) — implementer's judgment; skip if it feels misplaced |

All gated on `useEffectiveReducedMotion`.

### 4.5 Rules rewrite

Rewrite `src/games/baccarat/rules.tsx` mirroring the Slots / Blackjack section pattern:

- **Object** — Bet on which side wins (Player or Banker), or that they tie. Hand totals are the ones-digit of card-value sum. Closest to 9 wins.
- **Card values** — Ace 1, 2–9 face, 10/J/Q/K = 0.
- **Naturals** — A 2-card 8 or 9 ends the hand immediately.
- **Third-card rules** — Reference ADR-0036's canonical Punto Banco tableau. Don't reproduce the whole 67-cell table in the rules — link to "the standard Banker third-card rules apply" and summarise: Player draws on 0–5, stands on 6–7; Banker's draw depends on its total + Player's third-card value per the locked tableau.
- **Payouts** — Player 1:1 · Banker 1:1 minus 5% commission · Tie 8:1 · Pairs 11:1 · Big 0.54:1 · Small 1.5:1 · Dragons up to 30:1.
- **Commission floor-rounding** — Banker commission is floored: `floor(winnings × 0.05)`. Tiny banker wins (< 20 chips) pay no commission — that's intentional, matching real low-stakes tables.
- **Shoe + cut card** — 8-deck persistent shoe (~416 cards). When the dealer crosses the cut card (randomly placed in the last 14–28 cards), the next round triggers a reshuffle.
- **Bet limits** — 5–2000 chips on Player/Banker/Tie · 5–1000 chips on side bets.
- **Scoreboard** — The bead plate shows recent winners one per cell; the big road compresses streaks into columns. Use it however helps your superstition.

### 4.6 ChipSelector consolidation

Baccarat has its own `ChipSelector.tsx`. Refactor to use the shared `ChipDenominationButton` from `@/games/_shared/` (factored at #237) so chip colours match Slots / Roulette / Blackjack / Coin-flip identically. Delete the duplicate `CHIP_COLORS` / `CHIP_LABELS` records from `ChipSelector.tsx`. Test updates accordingly.

### 4.7 Out of scope for PR A (deferred)

- New gameplay variants (EZ Baccarat, No-Commission, Mini-Baccarat) — explicit user no.
- Commission-of-0 UX label (deferred docket item; surface only if the rules rewrite naturally explains it well).
- Big bead plate / big eye / cockroach pig roads (advanced scoreboard derivations) — the current bead + big road is enough.
- New side bets.
- Admin tunability of shoe size / cut-card position.

### 4.8 Scope guardrails (PR A)

**Allowed paths:**

- `src/games/baccarat/**` (all UI files; tests as needed)
- `src/games/_shared/**` only if the implementer needs to surface a small new prop on `BettingPanel` (none currently anticipated)
- `BUILD_GUIDE.md` §8.4 — minor amendment notes if the rules rewrite introduces new copy worth referencing
- `docs/adr/0036-*` / `docs/adr/0037-*` — only for amendment notes (no semantic change expected)

**Not allowed:**

- Other games (#7 Slots, #6 Roulette, etc.).
- `src/db/**`, `src/store/**` from inside `src/games/baccarat/**`.
- Admin pages (PR B's territory).
- `src/systems/stats.ts` (PR B's territory).

---

## 5. PR B — All-time admin baccarat analytics

### 5.1 Goal

Mirror `/admin/roulette` (#236) + `/admin/slots` (#242). New page at `/admin/baccarat` deriving site-wide stats from the existing `rounds` table where `game === 'baccarat'`. Read-only. No schema migration.

### 5.2 Aggregations (new in `src/systems/stats.ts`)

Add additive functions at the bottom of the file:

```ts
export interface BaccaratAllTimeStats {
  roundsPlayed: number;
  totalWagered: number; // sum of betAmount
  totalPaid: number; // sum of payout
  netHouseChips: number; // totalWagered - totalPaid
  netPlayerChips: number; // mirror
  actualRtp: number | null;
  // Outcome distribution
  playerWins: number;
  bankerWins: number;
  ties: number;
  // Natural rates
  naturalWins: number; // winner won on 2-card 8/9
  doubleNaturals: number; // both sides natural (often tie)
  // Pair hit rates
  playerPairs: number;
  bankerPairs: number;
  // Big/Small (Big = 5-6 cards, Small = 4 cards)
  bigCount: number;
  smallCount: number;
  // Dragon hit rates (winner wins by ≥ 4 with a non-natural)
  playerDragons: number;
  bankerDragons: number;
}

export interface BaccaratShoeStats {
  shoesPlayed: number; // distinct cut-card-passed events approximated by rounds where this round's shoe reset
  avgRoundsPerShoe: number | null;
  longestPlayerStreak: number;
  longestBankerStreak: number;
  longestTieStreak: number;
}

export async function getBaccaratAllTimeStats(): Promise<BaccaratAllTimeStats>;
export async function getBaccaratShoeStats(): Promise<BaccaratShoeStats>;
export async function getBaccaratWinnerDistribution(): Promise<
  { winner: 'player' | 'banker' | 'tie'; count: number }[]
>;
```

All iterate `db.rounds.where('game').equals('baccarat').toArray()` once. Streak detection: walk the rows in chronological order tracking the current run.

If `rounds.details` doesn't carry enough data for shoe-life metrics (cut-card-passed events aren't necessarily logged), the shoe stats can be approximated or marked "unavailable" — implementer documents which.

### 5.3 `AdminBaccaratPage`

New file: `src/pages/admin/AdminBaccaratPage.tsx`. Layout mirrors `AdminRoulettePage` / `AdminSlotsPage`:

- **Top: 4 StatCards** — Rounds Played, House Net (red if positive / green if negative), Actual RTP, Naturals %.
- **Winner-distribution chart** — bar or pie with 3 slices (Player / Banker / Tie). Colour by scoreboard semantic (red Banker / blue Player / green Tie).
- **Side-bet hit rates panel** — small bar chart or 4 mini-cards: Pairs, Big, Small, Dragons.
- **Streak stats** — longest Player / Banker / Tie streaks.
- **Recent rounds table** — last 20 rounds: timestamp, winner, totals, side-bet badges, bet, payout, P/L.

Reuse the established admin lazy-route + Recharts shared-chunk pattern. Use `useLiveQuery` with the inferred-Promise pattern (Phase 9 trap).

### 5.4 Admin sidebar nav

Add `Baccarat` entry to `src/pages/admin/AdminLayout.tsx` below "Slots". Update `AdminLayout.test.tsx` to assert the new link.

### 5.5 Scope guardrails (PR B)

**Allowed:** `src/systems/stats.ts` (additive only), `src/systems/stats.test.ts`, `src/pages/admin/AdminBaccaratPage.tsx` + test (NEW), `src/components/charts/` (if a new wrapper is needed — prefer reusing `PocketDistributionBar`-style approach), `src/pages/admin/AdminLayout.tsx` + test, `src/router.tsx`.

**Not allowed:** `src/games/baccarat/**`, schema migrations, other admin pages.

### 5.6 Out of scope (admin)

- Per-user `/admin/users/:id/baccarat` breakdown.
- Date-range filters.
- CSV export.
- Live shoe state inspection (would need new logging).

---

## 6. Sub-project workflow

1. **Spec PR** (this doc) → commit → review → merge.
2. **Plan PR** (single doc covering both PRs A + B per the user's exhaustive-planning preference) → commit → review → merge.
3. **PR A** → implementer → CI green → merge.
4. **PR B** → implementer → CI green → merge.

Per `feedback-phase15-game-sub-project-order`, #9 Lottery waits for the user's explicit _"start next"_.

---

## 7. Testing strategy summary

- **Pure logic** (`logic.test.ts`, `shoe.test.ts`) — untouched; all tests pass.
- **Page tests** — update for new title, LobbyButton + OddsInfoBox presence, sound mocks.
- **Admin tests** (PR B) — seed fake baccarat rounds covering all winner outcomes / pairs / naturals / dragons; assert each card and chart count.
- **DoD per PR:** `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`

---

## 8. Risks + open items

- **Banker commission UX label.** Deferred-docket item. If the rules rewrite naturally covers the "tiny wins get 0 commission" detail well, consider whether a tiny "(commission: 0 chips)" inline label is still worth a follow-up PR. Implementer flags if they think it's a clear add.
- **Dragon side-bet derivation.** Dragon wins when the winning side wins by ≥ 4 points with a non-natural. The `RoundResult` carries `margin` and `winnerNatural`, so derivable. Confirm in PR B.
- **Shoe-life metrics derivability.** If `rounds.details` doesn't track cut-card-passed timing, shoe stats become approximations. Implementer documents the chosen approach in PR B.
- **Scoreboard tokenization.** The semantic Banker-red / Player-blue / Tie-green colours might not have brand tokens yet. Add `scoreboard-banker / -player / -tie` to `tailwind.config.ts` if needed.
- **Tier celebration vs jackpot.** ADR-0033's tier-celebration reuse — baccarat treats natural wins + 30:1 Dragon hits as `jackpot` tier. Verify the existing tier mapping doesn't need adjustment.

---

## 9. Self-review

1. **Placeholder scan:** None.
2. **Internal consistency:** Two-PR scope explicit; logic invariants spelled out; out-of-scope list explicit for both PRs.
3. **Scope check:** Both PRs are well-bounded — PR A is UI-only (logic byte-stable); PR B is read-only over existing schema.
4. **Ambiguity check:** Banker commission edge case flagged. Shoe-life metric uncertainty flagged. Scoreboard tokens flagged.

---
