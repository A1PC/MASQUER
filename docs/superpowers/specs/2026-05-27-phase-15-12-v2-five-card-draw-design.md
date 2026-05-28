# Phase 15 sub-project #12.v2 — Five-Card Draw upgrade

**Status:** Spec
**Author:** Adam + Claude (assistant)
**Date:** 2026-05-27
**Phase:** 15 (Polish & Overhaul) · MASQUER per-game upgrade · poker trio #12.v2 of 3
**Game:** Five-Card Draw (`src/games/poker/five-card-draw/`) — inherits shared chrome from `src/games/poker/_shared/`
**Prior shipped phase:** Phase 13b (`v0.13b-five-card-draw`) — gameplay complete; reuses ADR-0041
**Predecessor sub-project:** #12.v1 Texas Hold'em (PRs #278/#279/#280/#281) — shipped all shared poker chrome that this sub-project inherits

---

## 1. Goal

Apply the same MASQUER polish recipe that landed on Hold'em in #12.v1 to Five-Card Draw. The shared chrome (MasquerCard adapter, mask names, MaskAvatar, PokerOddsHeader, PokerRulesModal, brand-token pairings, 3s outcome banner pattern, 15s leave-grace pattern, post-hand AI card reveal) is already on main; #12.v2 retrofits the Draw-specific surfaces and fills the variant-specific content that v1 left as placeholders.

This is a smaller, mechanical sub-project — single PR.

## 2. Non-goals

Out of scope (deferred per `masquer-deferred-features.md`):

- Multi-table / tournament mode
- Hand-history viewer
- Run-it-twice / time-bank / sit-out
- Adaptive AI / opponent modelling
- Table chat / AI tells
- Insurance / side bets
- Pot-Limit / Fixed-Limit variants
- Admin work — `/admin/poker` already has the Draw tab; the existing aggregations in `src/systems/stats.ts` already filter by `details.variant === 'five-card-draw'`; no admin changes needed

Pure game logic in `five-card-draw/drawLogic.ts`, `five-card-draw/machine.ts`, `_shared/handEvaluator.ts`, `_shared/sidePots.ts`, `_shared/deck.ts`, `_shared/ai/{archetypes,decide,decideDiscard}.ts` is **byte-stable**.

## 3. Inheritance from #12.v1 (already on main)

All of the following came from the Hold'em sub-project and are immediately usable here:

- **MasquerCard via `_shared/PlayingCard.tsx` adapter** — Draw imports `PlayingCard` from `../_shared/PlayingCard` in `DrawSeat`, `DiscardControls`; both already render the MASQUER porcelain visual + Colombina back. Nothing to change in those imports.
- **`_shared/maskNames.ts` + `MaskAvatar.tsx`** — Venetian name pool + helper + avatar component ready for adoption.
- **`_shared/PokerOddsHeader.tsx`** + **`_shared/PokerRulesModal.tsx`** — variant-aware. Draw branch currently renders placeholder strings; this sub-project replaces those with real content.
- **`/admin/poker` Draw tab** — already populates from `details.variant === 'five-card-draw'` rounds (no work).
- **Brand-token pairings** (`bg-velvet`, `bg-felt-table`, `text-ivory`, `text-gold-bright`, `border-brass`, `bg-jewel-magenta`) — documented in `PHASE_15_PATTERNS.md` §1.4.
- **`useEffectiveReducedMotion`** hook — project standard.
- **`useSound`** hook — project standard with established taxonomy.
- **`useGameRound`** wallet bridge — same `('poker')` game key.

## 4. What lands in this PR

### 4.1 `FiveCardDrawPage.tsx` chrome rewrite

Mirror the Hold'em pattern (the implementer should diff against `src/games/poker/holdem/HoldemPage.tsx` for the canonical shape):

- Root: `<div className="relative flex h-full flex-col bg-felt-table text-ivory">` (drops `min-h-screen`).
- Title block: `MASQUER · Five-Card Draw` (font-display text-2xl tracking-[0.18em] text-gold-bright) + variant subtitle `Five-Card Draw · No-Limit · Cash` (text-xs ivory/55).
- Top-left absolute: `<LobbyButton />`.
- Top-right absolute: `<PokerOddsHeader variant="five-card-draw" />`.
- Bottom-left absolute: `<RulesButton />` + `<PokerRulesModal variant="five-card-draw" />` state.
- `<main className="flex flex-1 flex-col overflow-hidden p-3 pt-14">`.
- Replace `useReducedMotion` (framer-motion) with `useEffectiveReducedMotion` (project).
- `useSound` wiring per §4.4 below.
- Replace `ARCHETYPE_NAMES` + `name = "${ARCHETYPE_NAMES[archetype]} ${i+1}"` plumbing with `assignMaskName(rng, tableSize)`; thread mask names into `aiArchetypes[i].name`. Archetype stays on the seat (still drives `decide()` + `decideDiscard()`); just never displayed.
- Bust prompt + session-over screens restyled with brand tokens, `bg-velvet-deep` panel, brass border, ivory body text, gold-bright headings (mirror HoldemPage's screens).
- 3s outcome banner + 15s leave-grace countdown bar (with LEAVE NOW / DEAL NOW + countdown), with the fallback grace trigger from `idle` for uncontested-fold-out paths. Direct port from HoldemPage.

### 4.2 `DrawTable.tsx` brand pass + isPostHand reveal

- Replace `bg-felt-deep` + `text-white` + `neon-cyan`/`neon-magenta` with brand tokens. Oval-felt brass-edged backdrop matching `holdem/PokerTable.tsx`.
- Central pot display: `font-mono tabular-nums text-2xl text-gold-bright`.
- Compute `isPostHand` from machine state (`stateValue === 'hand_complete' || stateValue === 'showdown' || (stateValue === 'idle' && handResult !== null)`) and pass `revealHoleCards` + computed `handRank` to each `DrawSeat` so all 5-card hands flip face-up post-hand. Mirror PokerTable's per-AI-seat logic.
- Five-Card Draw has **no community board** — hand evaluation feeds `evaluateBest5(seat.holeCards)` directly (5 cards in, the function picks the same 5). No `board.length === 5` guard needed because all 5 cards are always present once dealt.

### 4.3 `DrawSeat.tsx` retrofit

- Adopt `<MaskAvatar name={name} active={isActing} size="sm" />` for AI seats (drop the existing `archetype.toUpperCase()` display).
- Brand-token pass: drop `bg-felt-deep`, `neon-cyan`/`neon-magenta`, `text-white` — use `bg-velvet-deep`, `border-brass`, `ring-gold-bright`, `text-ivory` matching `holdem/Seat.tsx`.
- Add `revealHoleCards?: boolean` + `handRank?: HandRank` props mirroring `holdem/Seat`. When `revealHoleCards`, all 5 hole cards flip face-up; when `handRank` provided, render the category label beneath (`HAND_CATEGORY_LABEL` map, same as Hold'em Seat).
- Preserve existing `drewLabel?: string` prop — Draw-specific; shows "drew 2" / "stood pat" after the draw phase.
- Status badges (FOLDED / ALL-IN / BUSTED) reuse the brand-token styling from `holdem/Seat`.

### 4.4 Sound taxonomy

| Trigger                                        | Event         | Cadence                                                                    |
| ---------------------------------------------- | ------------- | -------------------------------------------------------------------------- |
| Player or AI bet / raise / call commits chips  | `chip.place`  | One per action                                                             |
| Blinds posted at hand start                    | `chip.place`  | One for SB + one for BB                                                    |
| Each card dealt (initial 5-card deal)          | `card.deal`   | Stagger ~60 ms per card across 5 cards × N seats — coalesce to max ~12/sec |
| Each card dealt (draw replacement phase)       | `card.deal`   | One per replacement card across all seats; stagger 80 ms                   |
| Showdown card flip per seat (revealed at once) | `card.deal`   | One per seat reveal during stagger                                         |
| Player wins pot — `< 2×` total committed       | `win.small`   | One per win                                                                |
| Player wins pot — 2-20×                        | `win.medium`  | —                                                                          |
| Player wins pot — ≥ 20×                        | `win.jackpot` | —                                                                          |
| Player loses showdown OR busts                 | `loss`        | One per loss event                                                         |

All gated on `useEffectiveReducedMotion`. Reduced motion → no audio.

### 4.5 `DiscardControls.tsx` brand pass

- Tap-to-discard ring on selected cards: `ring-2 ring-gold-bright`.
- DRAW / STAND PAT buttons: brand-token styling (gold for primary, brass-outlined for secondary).
- Caption text: ivory/85.
- Disabled state: `opacity-40`.

### 4.6 `_shared/PokerOddsHeader.tsx` Draw content

Replace the placeholder string:

```ts
'five-card-draw': "No-Limit Five-Card Draw · 2-6 players · 80 BB buy-in · Rebuy on bust",
```

(Hold'em already has the matching pattern.)

### 4.7 `_shared/PokerRulesModal.tsx` Draw rules block

Replace the `DrawRules` placeholder body with the real rules:

- **Object** — Make the best 5-card hand from your dealt 5 cards. After the first betting round, optionally replace 0–3 cards from the deck. Best hand after the second betting round wins.
- **Hand rankings (high → low)** — same standard list as Hold'em (Royal Flush · Straight Flush · Four of a Kind · Full House · Flush · Straight · Three of a Kind · Two Pair · One Pair · High Card).
- **Blinds** — Heads-up: button is small blind. 3+: button posts nothing; next two seats post SB + BB.
- **Draw phase** — Tap cards to select up to 3 for replacement. Click DRAW to swap, or STAND PAT to keep your hand. Order: pre-draw bet → draw → post-draw bet → showdown.
- **Betting rounds** — Pre-draw and post-draw. Action: fold · check · call · raise.
- **Showdown** — If two or more players remain after the post-draw bet, hole cards reveal; best 5-card hand wins (split on ties).
- **Table** — Cash game. Buy-in = 80 BB. Rebuy on bust. Leave Table any time between hands.

## 5. Architecture

### 5.1 PR decomposition

**Single PR**. Files touched:

| File                                                       | Action  | Responsibility                                                           |
| ---------------------------------------------------------- | ------- | ------------------------------------------------------------------------ |
| `src/games/poker/five-card-draw/FiveCardDrawPage.tsx`      | Rewrite | Chrome retrofit per §4.1                                                 |
| `src/games/poker/five-card-draw/FiveCardDrawPage.test.tsx` | Modify  | Add MASQUER chrome + sound + mask name + grace + banner assertions       |
| `src/games/poker/five-card-draw/DrawTable.tsx`             | Modify  | Brand pass + isPostHand reveal per §4.2                                  |
| `src/games/poker/five-card-draw/DrawSeat.tsx`              | Modify  | MaskAvatar + brand tokens + new props per §4.3                           |
| `src/games/poker/five-card-draw/DrawSeat.test.tsx`         | Modify  | New assertions for mask name + brand tokens + revealHoleCards + handRank |
| `src/games/poker/five-card-draw/DiscardControls.tsx`       | Modify  | Brand pass per §4.5                                                      |
| `src/games/poker/five-card-draw/DiscardControls.test.tsx`  | Modify  | Update class-string assertions                                           |
| `src/games/poker/_shared/PokerOddsHeader.tsx`              | Modify  | Real Draw content per §4.6                                               |
| `src/games/poker/_shared/PokerOddsHeader.test.tsx`         | Modify  | Update Draw variant assertion                                            |
| `src/games/poker/_shared/PokerRulesModal.tsx`              | Modify  | Real Draw rules block per §4.7                                           |
| `src/games/poker/_shared/PokerRulesModal.test.tsx`         | Modify  | Update Draw variant assertion                                            |
| `BUILD_GUIDE.md` §13b                                      | Modify  | Note polish pass                                                         |

### 5.2 No machine changes

Drop the pure logic untouched rule (per `PHASE_15_PATTERNS.md §2`): `drawLogic.ts` + `machine.ts` stay byte-stable. The reveal behaviour is presentation-only (table + seat layer); the machine emits the same `revealedHands` on showdown and the same empty array on uncontested wins, with the `isPostHand` UI gate filling the fold-out gap (same pattern Hold'em uses).

## 6. Standing rules (recap from `PHASE_15_PATTERNS.md §2`)

1. **Pure logic untouched.**
2. **Games sandbox preserved.**
3. **One `rounds` row per poker session** (ADR-0041).
4. **Integer money. No `Math.random()`.**
5. **Spec-first.** This doc + BUILD_GUIDE amendment land before any code.
6. **No CLAUDE.md edits.**
7. **TS strict + exactOptionalPropertyTypes.**
8. **Commit subject ≤ 100 chars.**
9. **Scopes:** `poker` (game-side + shared `_shared/` files since they serve the poker variants), `docs` (BUILD_GUIDE).
10. **No `--no-verify`, no `--amend`.**
11. **DoD:** `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`
12. **Tokens-only Tailwind** in rebuilt files.
13. **Page root MUST be `flex h-full flex-col`, NEVER `min-h-screen`** (per `masquer-min-h-screen-in-pages` memory).
14. **Visual verification via Playwright at 1440×900 before pushing** (per `masquer-screenshot-before-pushing-ui` memory).

## 7. Risks + watch-outs

- **DrawSeat tests pin old colors + archetype labels.** The current `DrawSeat.test.tsx` asserts against `neon-cyan`, `bg-felt-deep`, and the archetype label (e.g. "ROCK"). All those assertions need to flip to brand-token + mask-name equivalents. Same trap fired during Hold'em PR A and was caught in the same task.
- **Reduced-motion hook swap** changes return type (`boolean | null` → `boolean`). Direct `if (reduce)` usage works the same. No `=== null` checks in current Draw code (verify).
- **Fallback grace trigger** must fire even when ShowdownReveal-equivalent never mounts. Hold'em has no separate ShowdownReveal in Draw — reveal is via `isPostHand` on the table itself. Grace trigger fires from `idle` with handResult populated, regardless of whether a stagger animation ran. Mirror HoldemPage exactly.
- **DiscardControls renders PlayingCards** to show the player's hand for tap-to-discard. Verify those cards already inherit the MasquerCard visual via the `_shared/PlayingCard` adapter (they should — adapter is fully transparent to callers).
- **5-card initial deal stagger** is heavier than Hold'em's 2-card deal. Cap at ~60 ms per card so a 6-player table's 30-card deal doesn't drown the player (~12 sounds/sec ceiling per `PHASE_15_PATTERNS.md §1.5`).

## 8. Definition of done

- PR merged.
- Five-Card Draw looks + sounds + feels like a peer of Hold'em — same MASQUER chrome, same Velvet Deco palette, same 3s outcome banner + 15s leave grace, same post-hand AI reveal.
- `/admin/poker` Draw tab continues to populate without changes.
- Visually verified at 1440×900 via Playwright.
- All Phase 15 standing rules respected; full DoD green.
- Tag candidate: `v0.15.12.v2-draw` after manual smoke.

## 9. Open questions

None. All decisions inherit from #12.v1 conventions.

## 10. Workflow

Per [`PHASE_15_PATTERNS.md §3`](../../PHASE_15_PATTERNS.md#3-sub-project-workflow):

1. **Spec PR** (this doc).
2. **Plan PR** with task breakdown + inline code stubs.
3. **Implementation PR** dispatched in parallel with plan-merge.
4. User says "start next" → controller starts #12.v3 Omaha.

---
