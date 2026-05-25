# Phase 15 sub-project #7 — Slots upgrade

**Status:** Draft for user review.
**Date:** 2026-05-25.
**Sub-project:** #7 in the Phase 15 umbrella (`2026-05-22-phase-15-umbrella-roadmap-design.md`). Per release order, follows #6 Roulette ✅, precedes #8 Baccarat.
**Original release:** Phase 5 (`v0.6-slots`, 2026-05-17). 3-reel single-payline, 5 symbols (Cherry/Lemon/Bell/BAR/Seven), weighted to ~86% RTP, tiered win celebration with jackpot coin shower, sequential reel stops at 3 / 5 / 8 s. ADRs 0032 (symbol weights + RTP) and 0033 (tiered celebration) lock the design.
**Scope answer:** _Pure re-skin (Coin-flip pattern)._ No new symbols (no WILD, no SCATTER, no bonus rounds). Logic byte-stable.

---

## 1. Goal

Bring the slot machine to the MASQUER / Velvet Deco bar with the now-standard polish pattern: brand-consistent visuals, shared `LobbyButton` + `OddsInfoBox` + scrollable rules, sound on chip place / reel stop / win tier, MASQUER · Slots title. Game mechanics, RNG, weights, paytable, win tiers, celebration durations — **all unchanged**. ADRs 0032 / 0033 stand as-is.

The decision to skip gameplay additions (WILD, SCATTER, free-spins bonus, multi-payline, cascading reels, progressive jackpot) is the user's explicit "pure re-skin" answer at brainstorm. Those candidates stay in the deferred docket if the user wants to revisit.

---

## 2. Decomposition

**Single PR.** Coin-flip (#4) and the early roulette work both proved this small-scope pure-reskin pattern fits in one PR comfortably. No spec / plan split into multiple implementation PRs.

---

## 3. Standing invariants

All non-negotiable, per umbrella roadmap §4.4 + CLAUDE.md:

1. **Pure logic untouched.** `src/games/slots/logic.ts`, `symbols.ts`, `types.ts`, and their `*.test.ts` stay byte-stable. `config.ts` constants stay byte-stable (max-bet is already 1000 — no change needed). ADR-0032 weights + ADR-0033 tier thresholds locked.
2. **Games sandbox** — no `@/db` or `@/store` imports from `src/games/slots/**`. Wallet via `@/systems/**` only (existing `useGameRound` pattern).
3. **One `rounds` row per spin** (ADR-0016). Existing settle path unchanged.
4. **Integer money. No `Math.random()`.** ESLint enforces.
5. **Spec-first.** This doc + any ADR amendment commit before code (no new ADRs expected; if a sound sample needs an asset note, that's an inline ADR-0033 amendment).
6. **No CLAUDE.md edits.**
7. **Commitlint header-max-length 100** — feedback memory `feedback-localgamble-commit-subject-limit` flags this.

---

## 4. Scope (single PR)

### 4.1 Title + meta

- `SlotsPage.tsx`: change `title="🎰 SLOTS"` → `title="MASQUER · Slots"`.
- Remove `meta="3 reels · 5–1000"` — automatically suppressed by `GameShell` when `oddsInfo` is provided (shipped in #231), but explicit removal keeps the call site clean.

### 4.2 Shared-shell adoption

Mirror Blackjack (#226) / Coin-flip (#230 / #232) / Roulette (#235):

- `lobbyButton={<LobbyButton />}` from `@/games/_shared/LobbyButton` (top-left, auto-positioned by `GameShell`'s flex header from #238).
- `oddsInfo={<OddsInfoBox>...</OddsInfoBox>}` from `@/games/_shared/OddsInfoBox` (top-right). Contents: `3× 7 50:1 · 3× BAR 20:1 · 3× Bell 12:1 · 3× Lemon 8:1 · 3× Cherry 5:1 · 2× Cherry 2:1`.
- `rules={<SlotsRules />}` already wired — rewrite content per §4.5.
- Scrollable rules container from `RulesModal` (already shipped in #230) handles long content automatically.

### 4.3 Visual rebuild (brand pass)

Tokenize all colours in `SlotsPage.tsx`, `ReelView.tsx`, `SymbolView.tsx`, `Paytable.tsx`, and the win-celebration overlays. Replace raw hex with brand tokens (`bg-velvet`, `bg-felt-table`, `bg-felt-table-deep`, `text-ivory`, `text-gold`, `text-gold-bright`, `border-brass`, `bg-velvet-deep`). The symbol art itself (the per-symbol fills / glow) can keep its intrinsic colours promoted to tokens (`slots-symbol-seven`, `slots-symbol-bar`, etc.) if Velvet Deco swap-outs aren't a clear visual win — implementer's call, document if any new tokens are added.

The jackpot magenta-neon glow (the existing 50× Seven payoff visual) **stays**. It's the slot's signature payoff cue and ADR-0033 doesn't change. Re-frame it in token form (`bg-jewel-magenta` or equivalent) rather than re-color it.

The **felt-table backdrop** + **brass frame around the reels** are the structural changes. Today's `SlotsPage.tsx` likely has a generic dark backdrop; replace with `bg-felt-table` and a `border-brass` frame to match the other upgraded games.

### 4.4 Sound (no current `useSound` usage — first integration)

Wire `useSound` (from `@/systems/sound/useSound`, established in #2):

| Event                               | Sample        | Notes                                                                                       |
| ----------------------------------- | ------------- | ------------------------------------------------------------------------------------------- |
| Chip / bet commit                   | `chip.place`  | Reuse existing                                                                              |
| SPIN button click → reels start     | `wheel.spin`  | Reuse the one added in PR #235 for roulette                                                 |
| Each reel STOPS (3 events per spin) | `reel.stop`   | NEW — short percussive thunk; add to `gen-audio.mjs`                                        |
| Small-win tier                      | `win.small`   | Reuse                                                                                       |
| Medium-win tier                     | `win.medium`  | Reuse                                                                                       |
| Jackpot tier (3× Seven)             | `win.jackpot` | NEW or reuse `win.medium` louder — implementer picks; prefer NEW if `gen-audio.mjs` permits |
| Loss                                | `loss`        | Reuse                                                                                       |

If `reel.stop` / `win.jackpot` don't exist, add them via `scripts/gen-audio.mjs` + register the keys in `src/systems/sound/engine.ts` (or wherever the sample map lives). All samples skipped per `useEffectiveReducedMotion`.

### 4.5 Rules rewrite

Rewrite `src/games/slots/rules.tsx` to mirror the section structure of Blackjack / Coin-flip / Roulette rules (sectioned `<h3>` headings, tokens-only, scannable):

- **Object** — Match three symbols on the centre payline. Two Cherries pays too.
- **Symbols & paytable** — Table with the 6 rows from `SLOTS_PAYTABLE`. Lead with 7-7-7 = 50×.
- **How spins resolve** — Each reel is a weighted RNG pick (Cherry most common, Seven rarest). Spin animation is cosmetic; the result is decided before the reels start. Long suspense gap on reel #3 is intentional.
- **Win tiers** — Small / Medium / Jackpot per ADR-0033. Jackpot triggers a coin-shower celebration.
- **Bet limits** — 5–1000 chips per spin. Use Repeat to re-place the same bet.
- **RTP** — ~86%, locked by ADR-0032 weight tuning.

### 4.6 Animation polish (light)

- **Symbol entry under brand.** Keep ReelView's existing scroll animation; just verify the visual reads cleanly with the new brass frame.
- **Win-celebration tier overlays** already exist (ADR-0033). Re-skin them with brand colours (gold burst on small/medium, magenta-neon coin shower on jackpot). No structural change.
- **`useEffectiveReducedMotion`** — confirm every animated surface short-circuits per the existing hook. The reel-stop sound should fire even under reduced motion (the "thunk" is the affordance for "this reel has landed").

### 4.7 Bet preset ladder

`SlotsPage` uses `BettingPanel` from `_shared`. The 1000 chip preset was added in #230 and the ChipDenominationButton was factored in #237, so the chip ladder is already consistent with Blackjack / Coin-flip / Roulette. **No work needed** here — just verify the slots page renders the new chip ladder correctly.

---

## 5. Out of scope (deferred; do NOT implement)

- WILD symbol (substitute for any non-Seven).
- SCATTER symbol (pays anywhere).
- Free-spins bonus round (3+ scatter triggers N spins).
- Multi-payline (3 or 5 lines).
- Cascading reels (winning symbols clear + new ones fall in).
- Progressive jackpot pool.
- Auto-spin / repeat-N (coin-flip's `autoCommitRepeat` pattern — not requested for slots).
- Admin tunability of weights / paytable (`/admin/slots`) — could mirror the existing `/admin/bingo` pattern; not requested.

All of the above stay in the deferred docket for future consideration. If the user wants any of them later, that's its own sub-project or a follow-up PR.

---

## 6. Testing strategy

- **Pure logic** (`logic.test.ts`, `symbols.test.ts`, `machine.test.ts`) — untouched; all existing tests pass.
- **`SlotsPage.test.tsx`** — update assertions for the new title (`MASQUER · Slots`) and remove `meta` assertion if present. Add LobbyButton + OddsInfoBox presence checks (mirroring the Blackjack/Coin-flip/Roulette page tests).
- **`ReelView.test.tsx` / `SymbolView.test.tsx` / `Paytable.test.tsx`** — update any colour-hex assertions to class-name or token assertions.
- **Sound integration** — add a `useSound` mock and assert `chip.place` fires on commit, `wheel.spin` fires on SPIN, `reel.stop` fires three times per spin, and the right tier stinger fires on settle. Mirror the Coin-flip + Roulette sound-mock patterns.
- **DoD**: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`

---

## 7. Risks + open items

- **Reel-stop sound timing.** Three stops per spin at 3 s / 5 s / 8 s — that's a lot of sounds packed into 8 seconds. Spec says fire each one as the reel lands. Verify it doesn't feel busy under headphones; if it does, lower the sample volume in `gen-audio.mjs` rather than skipping events. Implementer judges.
- **Magenta-neon jackpot vs Velvet Deco palette.** ADR-0033 locks the magenta as the jackpot signature. Velvet Deco is felt-green / brass / oxblood / ivory — magenta isn't in the brand palette. The decision: **magenta stays** for the jackpot, because the visual signature is the cue. Frame as `jewel-magenta` token if it doesn't already exist; explicit note in PR description.
- **Sample additions.** `reel.stop` and (optional) `win.jackpot` may require new entries in `scripts/gen-audio.mjs`. Commit the generated `.wav` files alongside.
- **Bet preset ladder.** Already consistent post-#237 — but verify by booting the dev server and clicking through `/play/slots`.

---

## 8. Self-review

1. **Placeholder scan:** none.
2. **Internal consistency:** Single-PR scope; logic invariants spelled out; out-of-scope list explicit.
3. **Scope check:** Smaller than Coin-flip's polish work (which added BrandCoin + sound samples + win-streak + autoCommitRepeat). One PR is the right size.
4. **Ambiguity check:** Magenta-jackpot decision called out. Reel-stop sound cadence flagged.

---
