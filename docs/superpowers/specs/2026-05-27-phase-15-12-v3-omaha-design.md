# Phase 15 sub-project #12.v3 — Omaha upgrade

**Status:** Spec
**Author:** Adam + Claude (assistant)
**Date:** 2026-05-27
**Phase:** 15 (Polish & Overhaul) · MASQUER per-game upgrade · poker trio #12.v3 of 3 (final)
**Game:** Omaha (`src/games/poker/omaha/`) — inherits shared chrome from `src/games/poker/_shared/`
**Prior shipped phase:** Phase 13c (`v0.13c-omaha`) — gameplay complete; reuses ADR-0041
**Predecessor sub-projects:** #12.v1 Texas Hold'em (PRs #278/#279/#280/#281) shipped shared chrome + reveal/banner/grace patterns · #12.v2 Five-Card Draw (PR #284) proved the inheritance pattern

---

## 1. Goal

Apply the same MASQUER polish recipe that landed on Hold'em (#12.v1) and Five-Card Draw (#12.v2) to Omaha. This is the third and final poker variant — its shared chrome (MasquerCard adapter, mask names, MaskAvatar, PokerOddsHeader, PokerRulesModal, brand-token pairings, 3s outcome banner, 15s leave grace, post-hand AI card reveal) is already on main; #12.v3 retrofits the Omaha-specific surfaces and fills the variant-specific content that v1 left as placeholders.

Closing this sub-project completes the poker trio.

## 2. Non-goals

Out of scope (deferred per `localgamble-deferred-features.md`):

- Multi-table / tournament mode
- Hand-history viewer
- Run-it-twice / time-bank / sit-out
- Adaptive AI / opponent modelling
- Table chat / AI tells
- Insurance / side bets
- Pot-Limit Omaha (most popular real-world Omaha variant) — still No-Limit only per the existing implementation
- Omaha Hi-Lo / 8-or-better variants
- Admin work — `/admin/poker` already has the Omaha tab; existing aggregations in `src/systems/stats.ts` already filter by `details.variant === 'omaha'`

Pure game logic in `omaha/omahaLogic.ts`, `omaha/machine.ts`, `_shared/handEvaluator.ts` (incl. the `'omaha'` rule branch), `_shared/sidePots.ts`, `_shared/deck.ts`, `_shared/ai/{archetypes,decide,decideOmaha}.ts` is **byte-stable**.

## 3. Inheritance from #12.v1 + #12.v2 (already on main)

All of the following are usable here:

- **MasquerCard via `_shared/PlayingCard.tsx` adapter** — Omaha imports `PlayingCard` from `../_shared/PlayingCard` in `OmahaSeat`; already renders MASQUER porcelain visual + Colombina back. Nothing to change in the import.
- **`_shared/maskNames.ts` + `MaskAvatar.tsx`** — Venetian name pool + helper + avatar component.
- **`_shared/PokerOddsHeader.tsx`** + **`_shared/PokerRulesModal.tsx`** — variant-aware. Omaha branch currently renders placeholders; this sub-project fills them.
- **`_shared/ShowdownReveal`-equivalent** — Omaha already mounts the Hold'em `ShowdownReveal` (it's generic over `revealedHands.holeCards.length`, so 4-card hands render). Stagger + winner glow + win-tier stinger inherited free.
- **`/admin/poker` Omaha tab** — already populates from existing aggregations (no work).
- **Brand-token pairings** documented in `PHASE_15_PATTERNS.md` §1.4.
- **`useEffectiveReducedMotion`** + **`useSound`** + **`useGameRound`** hooks.
- **3s outcome banner + 15s leave-grace + fallback grace trigger from idle** — port directly from `HoldemPage.tsx`.

## 4. What lands in this PR

### 4.1 `OmahaPage.tsx` chrome rewrite

Mirror the Hold'em pattern (diff against `src/games/poker/holdem/HoldemPage.tsx` for the canonical shape):

- Root: `<div className="relative flex h-full flex-col bg-felt-table text-ivory">` (drops `min-h-screen`).
- Title block: `MASQUER · Omaha` (font-display text-2xl tracking-[0.18em] text-gold-bright) + variant subtitle `Omaha · No-Limit · Cash` (text-xs ivory/55).
- Top-left absolute: `<LobbyButton />`.
- Top-right absolute: `<PokerOddsHeader variant="omaha" />`.
- Bottom-left absolute: `<RulesButton />` + `<PokerRulesModal variant="omaha" />` state.
- `<main className="flex flex-1 flex-col overflow-hidden p-3 pt-14">`.
- Replace `useReducedMotion` (framer-motion) with `useEffectiveReducedMotion` (project).
- `useSound` wiring per §4.4.
- Replace `ARCHETYPE_NAMES` + `name = "${ARCHETYPE_NAMES[archetype]} ${i+1}"` plumbing with `assignMaskName(rng, tableSize)`; thread mask names into `aiArchetypes[i].name`. Archetype stays on the seat (still drives `decideOmaha()`); never displayed.
- Bust prompt + session-over screens restyled with brand tokens, `bg-velvet-deep` panel, brass border, ivory body text, gold-bright headings.
- 3s outcome banner + 15s leave-grace countdown bar (with LEAVE NOW / DEAL NOW + countdown), fallback grace trigger from `idle` with populated `handResult`. Direct port from HoldemPage.

### 4.2 `OmahaTable.tsx` brand pass + isPostHand reveal

- Replace raw colour classes with brand tokens (drop `bg-felt-deep`, `text-white`, `neon-*`; use `bg-felt-table-deep`, `text-ivory`, `border-brass`, `bg-velvet-deep`). Oval-felt brass-edged backdrop matching `holdem/PokerTable.tsx`.
- Central pot display: `font-mono tabular-nums text-2xl text-gold-bright`.
- Compute `isPostHand` (`isShowdown || (stateValue === 'idle' && handResult !== null)`) and pass `revealHoleCards` + computed `handRank` to each `OmahaSeat`.
- **Omaha-specific hand evaluation**: when board is complete (5 cards), compute `handRank` via `evaluateFrom(seat.holeCards, board, 'omaha')` — this enforces the 2-of-4-hole + 3-of-5-board rule. When board is incomplete (pre-river fold-out), show cards without category. Showdown-revealed entries that already carry a `handRank` from the machine take precedence.

### 4.3 `OmahaSeat.tsx` retrofit

- Adopt `<MaskAvatar name={name} active={isActing} size="sm" />` for AI seats (drop the existing `archetype.toUpperCase()` display).
- Brand-token pass: drop `bg-felt-deep`, `neon-cyan`/`neon-magenta`, `text-white` — use `bg-velvet-deep`, `border-brass`, `ring-gold-bright`, `text-ivory` matching `holdem/Seat.tsx`.
- Add `revealHoleCards?: boolean` + `handRank?: HandRank` props mirroring `holdem/Seat`. When `revealHoleCards`, all 4 hole cards flip face-up; when `handRank` provided, render the category label beneath using the same `HAND_CATEGORY_LABEL` map as `holdem/Seat`.
- Preserve the 4-card layout — OmahaSeat already renders 4 cards with `cardSize: 'mini'` at top positions. No layout changes needed beyond the brand-token swap and new props.
- Status badges (FOLDED / ALL-IN / BUSTED) restyled with brand tokens.

### 4.4 Sound taxonomy

| Trigger                                         | Event         | Cadence                                          |
| ----------------------------------------------- | ------------- | ------------------------------------------------ |
| Player or AI bet / raise / call commits chips   | `chip.place`  | One per action                                   |
| Blinds posted at hand start                     | `chip.place`  | One for SB + one for BB                          |
| Each hole card dealt (initial 4 × N seats deal) | `card.deal`   | Stagger ~80 ms per card; coalesce to max ~12/sec |
| Flop reveal (3 cards)                           | `card.deal`   | 3 staggered (120 ms apart)                       |
| Turn / river reveal (1 card each)               | `card.deal`   | One per board card                               |
| Showdown card flip per seat                     | `card.deal`   | One per seat reveal during stagger               |
| Player wins pot — `< 2×` total committed        | `win.small`   | One per win                                      |
| Player wins pot — 2-20×                         | `win.medium`  | —                                                |
| Player wins pot — ≥ 20×                         | `win.jackpot` | —                                                |
| Player loses showdown OR busts                  | `loss`        | One per loss event                               |

All gated on `useEffectiveReducedMotion`. Reduced motion → no audio.

### 4.5 `_shared/PokerOddsHeader.tsx` Omaha content

Replace the placeholder string:

```ts
'omaha': "No-Limit Omaha · 2-6 players · 80 BB buy-in · Rebuy on bust",
```

### 4.6 `_shared/PokerRulesModal.tsx` Omaha rules block

Replace `OmahaRules` placeholder body with the real rules — same JSX shape as `HoldemRules`/`DrawRules`. Sections:

- **Object** — Make the best 5-card hand using **exactly 2 of your 4 hole cards + exactly 3 of the 5 community cards**. The 2+3 rule is strict; you cannot play "the board" or use just 1 hole card.
- **Hand rankings (high → low)** — standard list (Royal Flush · Straight Flush · Four of a Kind · Full House · Flush · Straight · Three of a Kind · Two Pair · One Pair · High Card).
- **Blinds** — Heads-up: button is small blind. 3+: button posts nothing; next two seats post SB + BB.
- **Betting rounds** — Preflop → Flop (3) → Turn (1) → River (1). Action: fold · check · call · raise.
- **Showdown** — If two or more players remain after the river, hole cards reveal; best 5-card hand wins per the 2+3 rule (split on ties).
- **Table** — Cash game. Buy-in = 80 BB. Rebuy on bust. Leave Table any time between hands.

## 5. Architecture

### 5.1 PR decomposition

**Single PR**. Files touched:

| File                                               | Action  | Responsibility                                                           |
| -------------------------------------------------- | ------- | ------------------------------------------------------------------------ |
| `src/games/poker/omaha/OmahaPage.tsx`              | Rewrite | Chrome retrofit per §4.1                                                 |
| `src/games/poker/omaha/OmahaPage.test.tsx`         | Modify  | Add MASQUER chrome + sound + mask name + grace + banner assertions       |
| `src/games/poker/omaha/OmahaTable.tsx`             | Modify  | Brand pass + isPostHand reveal per §4.2                                  |
| `src/games/poker/omaha/OmahaSeat.tsx`              | Modify  | MaskAvatar + brand tokens + new props per §4.3                           |
| `src/games/poker/omaha/OmahaSeat.test.tsx`         | Modify  | New assertions for mask name + brand tokens + revealHoleCards + handRank |
| `src/games/poker/_shared/PokerOddsHeader.tsx`      | Modify  | Real Omaha content per §4.5                                              |
| `src/games/poker/_shared/PokerOddsHeader.test.tsx` | Modify  | Update Omaha variant assertion                                           |
| `src/games/poker/_shared/PokerRulesModal.tsx`      | Modify  | Real Omaha rules block per §4.6                                          |
| `src/games/poker/_shared/PokerRulesModal.test.tsx` | Modify  | Update Omaha variant assertion                                           |
| `BUILD_GUIDE.md` §13c                              | Modify  | Note polish pass + chrome inheritance                                    |

### 5.2 No machine changes

Per `PHASE_15_PATTERNS.md §2`: `omahaLogic.ts` + `machine.ts` stay byte-stable. The machine still emits the same `revealedHands` on showdown and the same empty array on uncontested wins; the `isPostHand` UI gate fills the fold-out gap (mirrors Hold'em + Draw).

## 6. Standing rules

Per `PHASE_15_PATTERNS.md §2` — same as #12.v2.

1. Pure logic untouched.
2. Games sandbox preserved.
3. One `rounds` row per poker session (ADR-0041).
4. Integer money. No `Math.random()`.
5. Spec-first.
6. No CLAUDE.md edits.
7. TS strict + exactOptionalPropertyTypes.
8. Commit subject ≤ 100 chars.
9. Scopes: `poker` (game-side + shared `_shared/` files since they serve the poker variants), `docs` (BUILD_GUIDE). Never `admin` (no admin work), never `sound` (reverted earlier this phase).
10. No `--no-verify`, no `--amend`.
11. DoD: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`
12. Tokens-only Tailwind.
13. Page root MUST be `flex h-full flex-col`, NEVER `min-h-screen` (per `localgamble-min-h-screen-in-pages` memory).
14. Visual verification via Playwright at 1440×900 before pushing (per `localgamble-screenshot-before-pushing-ui` memory).

## 7. Risks + watch-outs

- **OmahaSeat tests pin archetype labels + neon-cyan classes.** Same trap fired during Hold'em PR A and Draw — flip assertions to MaskAvatar + brand-token equivalents + add two new cases (no leak during play + reveal+handRank renders category).
- **`evaluateFrom(holeCards, board, 'omaha')` vs `evaluateBest5`.** Easy to import the wrong helper. The Omaha rule requires `'omaha'` — using `evaluateBest5([...holeCards, ...board])` directly would let players play 0/1/3/4 hole cards (illegal in Omaha). Implementer must verify the import + the rule arg.
- **4-card hand layout** — OmahaSeat already handles `cardSize: 'mini'` at top positions. Don't accidentally regress the layout when adding MaskAvatar + brand pass.
- **`useReducedMotion` → `useEffectiveReducedMotion`** semantic difference (boolean | null vs boolean). No `=== null` checks expected (verify).
- **4-card deal stagger × N seats = up to 24 sounds at 6-max.** Cap card.deal stagger to 80 ms per card and coalesce to max ~12/sec total per the cadence guardrail.
- **Fallback grace trigger** must fire even when ShowdownReveal never mounts (uncontested fold-out path). Direct port from HoldemPage's logic.

## 8. Definition of done

- PR merged.
- Omaha looks + sounds + feels like a peer of Hold'em + Draw — same MASQUER chrome, same Velvet Deco palette, same 3s outcome banner + 15s leave grace, same post-hand AI reveal (4 cards face-up + hand category enforced via the `'omaha'` rule).
- `/admin/poker` Omaha tab continues to populate without changes.
- Visually verified at 1440×900 via Playwright (setup + mid-hand + post-hand reveal + rules modal showing the 2+3 rule).
- All Phase 15 standing rules respected; full DoD green.
- Tag candidate: `v0.15.12.v3-omaha` after manual smoke. **Closes the poker trio.**

## 9. Open questions

None. All decisions inherit from #12.v1 + #12.v2 conventions.

## 10. Workflow

Per [`PHASE_15_PATTERNS.md §3`](../../PHASE_15_PATTERNS.md#3-sub-project-workflow):

1. **Spec PR** (this doc).
2. **Plan PR** with task breakdown + inline code stubs.
3. **Implementation PR** dispatched in parallel with plan-merge.
4. User says "start next" → controller starts #13 Craps.

---
