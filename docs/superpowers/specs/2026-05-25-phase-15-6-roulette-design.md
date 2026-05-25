# Phase 15 sub-project #6 — Roulette upgrade

**Status:** Draft for user review.
**Date:** 2026-05-25.
**Sub-project:** #6 in the Phase 15 umbrella (`2026-05-22-phase-15-umbrella-roadmap-design.md`). Per release order, follows #5 Blackjack ✅, precedes #7 Slots.
**Original release:** Phase 4 (`v0.5-roulette`, 2026-05-17). Logic, machine, payouts, and wheel order all locked by ADRs 0029 / 0030 / 0031 and BUILD_GUIDE §8.2.

---

## 1. Goal

Bring the European-roulette table to the **MASQUER / Velvet Deco** bar: brand-consistent visuals, the shared #1 design-system primitives, #2 motion + sound polish, the shared `LobbyButton` + `OddsInfoBox` + scrollable rules already adopted by Blackjack and Coin-flip. Land two **gameplay-quality** changes the user asked for: a live auto-spin timer (30 s opening / 10 s between rounds, both skippable) and an unlimited bet-position model with the chip ladder topping out at 1000. Fix a long-standing visual: the ball currently lands on the leading edge of the winning pocket; it must land on the **centre**.

Add a new all-time site-wide **`/admin/roulette` analytics page** that surfaces ball-spin volume, number distribution, colour / parity / dozen / column counts, and house net — derived from the existing `rounds` table (no schema migration needed).

The pure game logic — `spin()`, `bets.ts`, `wheel.ts`, payout maths — is **untouched**. The XState machine is replaced (additive new states + events) but the per-bet resolution it composes is unchanged. ADR-0030's 10-position cap is **superseded**; ADR-0031's spin-animation contract is **amended** in two places (ball-target maths + new "betting window" states gating the spin).

The user has explicitly said _"i am happy with all of the game features, just a reskin"_ — no rule variants (no La Partage, no American wheel, no racetrack / neighbour bets). Those stay in the deferred docket.

---

## 2. Sub-project decomposition (per user direction)

> _"Lets do the reskin in one part and the admin as a part 2 so its two prs"_

The implementation is **two PRs** (plus the spec / plan PRs that bracket them):

- **PR A — Re-skin + timer + bet-cap removal + ball alignment (~1 large PR).** Visual rebuild, shared shell primitives, sound, new machine states for the auto-spin timer, unlimited positions, max-bet 1000, ball-centre fix, rules rewrite, ADR amendments. No new pages. No schema migration.
- **PR B — All-time admin analytics page.** New `/admin/roulette` route, new aggregations on `src/systems/stats.ts`, new Recharts panels reusing the existing lazy chunk (ADR-0039). Pure read-only over the existing `rounds` table. No game-side changes.

Both PRs follow the established pattern: implementer subagent, scoped allowlist, DoD `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`, controller monitors + merges on green.

---

## 3. Standing invariants (must survive both PRs)

These come straight from the umbrella roadmap §4.4 and CLAUDE.md hard rules and are non-negotiable here:

1. **Pure logic untouched.** `src/games/roulette/{logic,bets,wheel}.ts` and their `*.test.ts` stay byte-stable except where a non-cap config constant moves. The spin RNG (`logic.spin()` → `rng.randomInt(0, 36)`) is **never** replaced or re-seeded.
2. **Games sandbox** preserved. No `@/db` or `@/store` imports from inside `src/games/roulette/**`. Wallet access goes through `@/systems/**` only (existing pattern via `useGameRound` + `placeBet` + `settleRound`).
3. **One `rounds` row per spin** (ADR-0016). Auto-spin with **zero** bets on the board produces **zero** rows (a wallet-less spin is a non-event — no stake means nothing to record per ADR-0016's contract). Auto-spin **with** bets settles exactly one row as today.
4. **Integer money.** All chip amounts integers; chip presets remain integer denominations.
5. **One RNG.** No `Math.random()`. ESLint enforces.
6. **Spec-first.** BUILD_GUIDE §8.2 is updated first (bet-cap removal note + auto-spin timer note + ball-centre note). ADRs amended first. Then code.
7. **No CLAUDE.md edits.**
8. **Conventional Commits, commit subject ≤ 100 chars** (commitlint header-max-length=100 — captured in `feedback-localgamble-commit-subject-limit`).
9. **Recent-results sidebar stays.** Per user: _"keep showing the recent results on the side of the page as normal."_ `GameShell` already does this via `recentItems`; the page keeps passing them.

---

## 4. PR A — Re-skin + timer + bet-cap + ball alignment

### 4.1 Visual rebuild (brand pass)

Adopt the MASQUER / Velvet Deco palette throughout. Replace raw hex in `WheelView.tsx`, `BettingLayout.tsx`, `ChipSelector.tsx`, `ChipStack.tsx`, `ResultBanner.tsx`, and `RoulettePage.tsx` with the brand tokens already in use by Blackjack + Coin-flip:

- **Felt** (table surface): `bg-felt-table` / `bg-felt-table-deep` (the deep felt-green established in #0). Replaces the current ad-hoc background.
- **Wheel woods** (outer ring, hub): `roulette-wood-*` tokens currently in use are **fine** — they already match Velvet Deco's brass-trimmed wood aesthetic. Keep them; if any raw hex slipped in, port to the same token names.
- **Pocket fills**: keep the three semantic fills (`red`, `black`, `green`) but pull them from tokens. Today the file hard-codes `#a3122a / #1a1a1a / #3dd17a` — promote these to `roulette-pocket-red / roulette-pocket-black / roulette-pocket-green` tokens in `tailwind.config.ts` + `src/theme/tokens.ts` (or reuse `velvet`/`ink`/`emerald` if a near match exists; implementer picks the closest brand token and notes in PR description if a new token is added). The exact hex values may evolve **per brand**, but the _contract_ is one token per semantic colour.
- **Brass trim** (pocket borders, hub border): existing `#d4af37` → `text-brass` / `border-brass` tokens already in the system.
- **Pointer triangle** (top of wheel): keep gold; pull from `text-gold` token.
- **Chips**: replace `ChipSelector.tsx`'s chip styling to match the chip preset ladder shipped in Blackjack/Coin-flip in #230. Same denominations: `1, 5, 25, 100, 500, 1000`. Same per-chip token mapping (`velvet`, `brass`, `ivory` per #230's `CHIP_STYLES` record). If `ChipSelector` currently has its own chip ladder, **replace** it with the shared `BettingPanel.tsx` chip render path, or factor a shared `ChipDenominationButton` into `src/games/_shared/` so both sites use the same component. Implementer's call — prefer factoring if the divergence is meaningful, otherwise inline match.
- **Result banner** (winner overlay): re-style to use `Panel surface="brass"` (or the closest existing primitive) with `text-ivory` / `text-gold`. Animate in with the shared `motion-safe` slide-up variant.

Adopt the shared shell pattern from #230 / #231:

- `<LobbyButton />` from `@/games/_shared/LobbyButton` (top-left, auto-positioned by `GameShell`).
- `<OddsInfoBox>` from `@/games/_shared/OddsInfoBox` (top-right, auto-positioned by `GameShell`) — contents: `Straight 35:1 · Split 17:1 · Street 11:1 · Corner 8:1 · Six-line 5:1 · Column 2:1 · Dozen 2:1 · Red/Black/Odd/Even/Low/High 1:1`.
- `GameShell.tsx` already drops the `meta` caption when `oddsInfo` is provided; **remove** the existing `meta="Single-zero · 5–1000 · max 10 positions"` from `RoulettePage.tsx` (it's now outdated AND auto-suppressed).

### 4.2 Sound

Wire `useSound()` (from `@/systems/sound/useSound`, established in #2):

| Event                                        | Sample       | Notes                                                      |
| -------------------------------------------- | ------------ | ---------------------------------------------------------- |
| Chip click on table position                 | `chip.place` | Same sample Blackjack uses                                 |
| `SPIN_NOW` clicked or 30 s / 10 s timer ends | `wheel.spin` | New sample if none exists; else reuse `card.deal` swept up |
| Wheel reaches `settled`                      | `ball.drop`  | New short percussive click                                 |
| Winning bet (any payout > 0)                 | `win.small`  | Reuse Blackjack/Coin-flip                                  |
| Big win (Straight-up 35:1)                   | `win.medium` | Reuse                                                      |
| Zero (house wins all non-green bets)         | `loss`       | Reuse                                                      |

If `wheel.spin` / `ball.drop` samples don't exist in `scripts/gen-audio.mjs`, **add them** (offline self-synthesised WAVs per the established pattern). Sounds skipped per `useEffectiveReducedMotion()` (the page already consults the OS pref + user pref via the existing hook).

### 4.3 Animation polish

Existing wheel/ball spin animation is preserved (ADR-0031 amended below for the ball-centre fix). Additional polish:

- **Chip placement on table.** When a chip is added to a position, animate the stack growth: short `scale: [0.6, 1.05, 1]` keyframe + `opacity: [0, 1]` (~180 ms). Existing `ChipStack` likely just appends a DOM node; wrap in `motion.div` from Framer Motion with `useEffectiveReducedMotion` short-circuit.
- **Timer ring.** A thin circular SVG arc that depletes over the 30 s / 10 s window, surrounding the SPIN button. Driven by a CSS `stroke-dashoffset` keyed off the remaining time. Implementation detail in §4.5.
- **Winning pocket pulse.** Already exists via ADR-0031 `RESULT_PULSE_MS`. Keep.
- **Win banner.** Animates in (shared slide variant) and out (after a few seconds OR when `SPIN_NOW` clicked OR when between-rounds timer expires).

### 4.4 Ball-centre alignment fix (ADR-0031 amendment)

**Bug.** `WheelView.tsx:102` sets `const thetaDeg = targetIdx * ARC_DEG`. With each slice spanning `[i * ARC_DEG, (i+1) * ARC_DEG]` and labels rendered at `midDeg = (startDeg + endDeg) / 2`, `thetaDeg` is the **leading edge** of pocket N, not its **centre**. The ball orbit wrapper lands the ball at viewport angle `thetaDeg` → the ball sits visually on the boundary between pocket N and pocket N-1, which is the symptom the user reported (_"the ball to land in the middle of the sections on the wheel, as this it is not always clear where the ball lands"_).

**Fix.** Update `thetaDeg`:

```ts
// WheelView.tsx — line ~102, inside the rotation-model block
const thetaDeg = targetIdx * ARC_DEG + ARC_DEG / 2;
```

Apply the **same** offset to the wheel's rest target as well (`wheelTarget` when not spinning) so the two stay in sync? — No: the wheel's rest target is `0` (full multiples of 360), and the geometry is "pocket N's centre, in wheel-local angle, is at `(i + 0.5) * ARC_DEG`". The ball's orbit angle is the **viewport** angle. With wheel rotation = 0 mod 360, pocket N's viewport centre is `(i + 0.5) * ARC_DEG`, which is exactly the new `thetaDeg`. So **only the ball orbit's `thetaDeg` is corrected; the wheel's rotation maths is untouched**.

**Test.** Extend `WheelView.test.tsx`'s landing-alignment invariant to assert `(thetaDeg - ARC_DEG / 2) mod ARC_DEG === 0` (i.e. ball lands on a centre line, not an edge) — this is mathematically equivalent to `thetaDeg mod ARC_DEG === ARC_DEG / 2`. Pin the existing "data-rotate-target" assertion to the corrected value.

**ADR-0031 amendment.** Add a new section "**Ball-centre offset (2026-05-25, Phase 15 #6)**":

> The ball's `thetaDeg` includes a `+ ARC_DEG / 2` (≈ 4.86°) offset so the ball lands on the _centre_ of pocket N, not its leading edge. The wheel's rotation maths is unchanged: it still ends at multiples of 360°, so pocket N's geometric viewport centre is `(i + 0.5) * ARC_DEG` — the ball's target after the offset. The orbit and rotation are still independent; only the ball's end angle changes. Tests pin the new offset value.

### 4.5 Auto-spin timer (NEW; ADR-0046)

**User requirement, quoted verbatim:**

> _"When you click on the roulette wheel option from the lobby menu, give the player 30s to place their bets, then the wheel auto spins. After the spin, the player can click a button to spin the wheel immedietly, otherwise, give them 10s before the wheel auto spins with or without the bets on the board."_

**State-machine shape.** Replace the current `betting → spinning → settled` with:

```
                   ┌─────────────────────────┐
                   │      ENTRY (mount)      │
                   └─────────────┬───────────┘
                                 │
                                 ▼
       ┌─────── SPIN_NOW ──┐ placing_bets_30s ──── after 30s ────┐
       │                   └──── PLACE_BET / REMOVE_BET / CLEAR ┘│
       │                                                          ▼
       │                                                       spinning
       │                                                          │
       │                                                          │ after SPIN_DURATION_MS
       │                                                          ▼
       │                                                       settled
       │                                                          │
       │                                                          │ after RESULT_DISPLAY_MS (≈ 1500ms)
       │                                                          ▼
       └───────────────── between_rounds_10s ◄────────────────────┘
                              │
                              └── after 10s OR SPIN_NOW → spinning
                              │
                              └── PLACE_BET / REMOVE_BET / CLEAR
```

New constants in `ROULETTE_CONFIG`:

```ts
INITIAL_BET_WINDOW_MS: 30_000,
BETWEEN_ROUNDS_MS: 10_000,
RESULT_DISPLAY_MS: 1_500,   // how long `settled` lingers before between_rounds starts
```

New events:

```ts
| { type: 'SPIN_NOW' }   // skip remaining timer (works in both placing_bets_30s + between_rounds_10s)
```

`SPIN` (the legacy explicit-spin event) is **removed** — the SPIN button now sends `SPIN_NOW`.

**Zero-bet auto-spin.** Per user: spin proceeds with **or without** bets. In machine terms: no `hasAtLeastOneBet` guard on the auto-spin transition. (The current code has this guard on `SPIN`; it's removed.) When bets are zero, the spin still runs, the wheel still animates, `settled` still fires, and the page's settle-bridge **skips** the `wallet.settleRound` call entirely (no handles, nothing to record per ADR-0016).

**Timer visibility.** The page reads a `betWindowEndsAt: number | null` field from machine context (`Date.now() + windowMs` stamped on entry to either timer state, cleared on exit). A small page-level `useEffect` ticks `setInterval(..., 100)` while in a timer state to drive the countdown ring + numeric readout (e.g. `12s`). Counter ticks live in component state, NOT machine context, to avoid pushing 10 events/s through XState.

**Pause rules** (sensible defaults, called out so reviewers can object during spec review):

- **Rules modal open:** **pause** (player is reading; the dealer waits). Implemented by storing `pausedAt: number | null` in context and updating `betWindowEndsAt` on resume.
- **Browser tab hidden:** **do NOT pause** (real casino, dealer doesn't wait). Player who tabs away loses their window.
- **Navigate away:** machine is unmounted by route change; timers cancelled implicitly.

**Reduced-motion.** Timers still tick (a player who prefers reduced motion still needs the betting window). Visual countdown ring → static "Auto-spin in 12 s" text instead. The wheel-spin reduced-motion path (`spinDurationMs: 0`) already exists per ADR-0031 — keep.

**ADR-0046 (NEW).** Title: _"Roulette — auto-spin betting windows"_. Body: states + delays + zero-bet path + pause-on-rules-modal rule + reduced-motion behavior + the `SPIN_NOW` event. Reserved file: `docs/adr/0046-roulette-auto-spin-betting-windows.md`.

**Machine test additions** (in `machine.test.ts`):

- enters `placing_bets_30s` on mount, transitions to `spinning` after 30 s
- `SPIN_NOW` during `placing_bets_30s` transitions immediately to `spinning`
- `spinning` always sets `spinResult` and transitions to `settled` after `spinDurationMs`
- `settled` transitions to `between_rounds_10s` after `RESULT_DISPLAY_MS`
- `between_rounds_10s` transitions to `spinning` after 10 s
- `SPIN_NOW` during `between_rounds_10s` transitions immediately to `spinning`
- zero-bet auto-spin still runs (no guard); page's settle-bridge no-ops
- rules-modal pause: when `PAUSE_TIMER` is sent, `betWindowEndsAt` extends by the paused duration on `RESUME_TIMER`
- reduced-motion + zero `spinDurationMs` still settles immediately (existing path)
- `prepareNextRound` (existing) still clears winning bets, retains losing bets keyed by `betHandleId: ''` so the next round's first PLACE_BET re-debits

### 4.6 Unlimited bet positions + max 1000 per position (ADR-0030 supersession)

**User requirement, verbatim:** _"up to 1000 chip bet (as many as the player wants to place down)"_.

Current state: `ROULETTE_CONFIG.MAX_POSITIONS_PER_ROUND = 10` (gates `addBet` in `machine.ts`). `ROULETTE_CONFIG` already has per-bet min/max — implementer should confirm by reading `config.ts`; if `MAX_BET` per position is not already 1000, raise it.

**Spec changes:**

1. Remove the `MAX_POSITIONS_PER_ROUND` cap entirely (delete the constant + the guard in `addBet`). No soft cap. If perf becomes an issue with hundreds of positions, address in a follow-up; not preemptive.
2. Raise `MAX_BET` per position to **1000** if not already. Existing `BettingPanel` chip ladder will offer the 1000 chip (shipped in #230).
3. Update `BettingLayout.tsx` to allow infinite positions to render (verify the layout doesn't break with > 10 active positions — likely fine because positions render in fixed grid cells; chip-stack at each position just gets taller).
4. **ADR-0030** (`roulette-bet-position-model.md`) — append an "Amendment (Phase 15 #6, 2026-05-25)" section:

   > The original 10-position cap was a safety rail for the multi-bet wallet code. With the deferred-`placeBet` model from Phase 4 already settled and tested in production, the cap is removed: the player may place as many positions as they wish, each up to `MAX_BET` (1000). Total stake is bounded by balance, not by position count. The original ADR's bet-key uniqueness contract (one `PlacedBet` per `BetPositionKey` per round, with re-clicks accumulating `amount`) is unchanged.

5. Update `RoulettePage.test.tsx` and `machine.test.ts` cases that asserted the cap.

### 4.7 Rules rewrite + scrollable (already shipped in #230's GameShell `max-h-[60vh] overflow-y-auto`)

Rewrite `src/games/roulette/rules.tsx` to cover:

- **Object** — predict which numbered pocket the ball lands in. One spin, multiple bets allowed.
- **Bet types** (table, with `<h3>` per category):
  - **Inside bets**: Straight 35:1, Split 17:1, Street 11:1, Corner 8:1, Six-line 5:1.
  - **Outside bets**: Column 2:1, Dozen 2:1, Red/Black 1:1, Odd/Even 1:1, Low (1–18) / High (19–36) 1:1.
- **The zero** — all even-money and outside bets **lose** on 0 (no La Partage). Inside bets including 0 (Straight 0, Split 0-1/0-2/0-3, Street 0-1-2 / 0-2-3) pay normally.
- **Auto-spin timer** — 30 s to place opening bets; 10 s between rounds; `SPIN NOW` button skips either window. The wheel spins whether or not you've placed bets.
- **Bet maximums** — up to 1000 per position; unlimited positions; total stake bounded by your balance.
- **Result determination** — winning number decided by the RNG before the wheel starts moving (cosmetic animation only). Ball lands on the centre of the winning pocket.
- **Repeat last bets** — _not in scope this PR; deferred_.

Same Velvet Deco styling — `<h3 class="font-display text-gold">`, body `text-ivory/85`, tight sections, no walls of prose. Reuse the section-style pattern already in `src/games/blackjack/rules.tsx`.

### 4.8 Scope guardrails (PR A)

**Allowed paths:**

- `src/games/roulette/**` (all files)
- `src/games/_shared/**` (only if factoring `ChipDenominationButton` shared component)
- `docs/adr/0030-roulette-bet-position-model.md` (amendment)
- `docs/adr/0031-roulette-spin-animation-contract.md` (amendment)
- `docs/adr/0046-roulette-auto-spin-betting-windows.md` (NEW)
- `BUILD_GUIDE.md` (§8.2 update — bet cap + timer + ball-centre)
- `tailwind.config.ts` + `src/theme/tokens.ts` (if adding the three pocket-colour tokens)
- `scripts/gen-audio.mjs` (if adding `wheel.spin` / `ball.drop` samples)
- `public/sounds/` (if generating new samples lands assets there)

**Not allowed:**

- Other games (#5 Blackjack, #4 Coin-flip, Phases 5–13c).
- `src/db/**`, `src/store/**` from inside `src/games/roulette/**`.
- Admin pages (those are PR B).
- `src/systems/stats.ts` (PR B's territory).
- `Math.random()` anywhere (existing ESLint rule).

---

## 5. PR B — All-time admin roulette analytics

### 5.1 Goal

Add a new `/admin/roulette` page surfacing site-wide statistics derived from the existing `rounds` table (`game: 'roulette'`). All-time means _all rows ever recorded across all profiles_ — no per-user filter. No new tables; no schema migration.

### 5.2 Aggregations (new in `src/systems/stats.ts`)

Per ADR-0038, `src/systems/stats.ts` is the shared neutral aggregation module. Add these functions:

```ts
// All-time, across all users
getRouletteAllTimeStats(): Promise<{
  ballsSpun: number;                       // count(rounds where game='roulette' AND details.spin exists)
  netHouseChips: number;                   // sum(rounds.betAmount - rounds.payout) — positive = house won
  netPlayerChips: number;                  // -netHouseChips
  redCount: number;                        // count where details.spin.color === 'red'
  blackCount: number;
  greenCount: number;                      // i.e. zero hits
  oddCount: number;                        // count where number !== 0 && number is odd
  evenCount: number;                       // count where number !== 0 && number is even
  lowCount: number;                        // 1–18
  highCount: number;                       // 19–36
  dozenCounts: [number, number, number];   // [1–12, 13–24, 25–36]
  columnCounts: [number, number, number];  // column-1, column-2, column-3 by canonical mapping
}>

getRouletteNumberDistribution(): Promise<{
  number: number;                          // 0..36
  count: number;
}[]>  // length 37
```

Both queries iterate `db.rounds.where('game').equals('roulette').toArray()` and reduce in memory. With even tens of thousands of rounds the cost is fine for an admin page — no indexing required. If we cross into hundreds of thousands later, add a Dexie compound index then. Not preemptively.

Tests: pin each aggregation against a fixture of ~20 rounds covering all colours / parities / dozens / columns / the zero.

### 5.3 `AdminRoulettePage`

New file: `src/pages/admin/AdminRoulettePage.tsx`. Layout mirrors `AdminLotteryPage` and `AdminBingoPage` (the established admin-analytics shape):

- **Top: 4 StatCards** — Balls Spun, House Net Chips (tone red if house is up / green if house is down — mirror the lottery card pattern), Red %, Black % (the green % can be implied or shown as a third card). Use the existing `StatCard` component from `src/components/admin/`.
- **Distribution chart** — Recharts `<BarChart>` with 37 bars (one per number 0–36). Colour each bar by pocket colour (red bar for red numbers, black bar for black, green bar for 0). Lazy-loaded chunk per ADR-0039 — adds no weight to main bundle.
- **Parity / range panel** — small Recharts `<BarChart>` or simple text grid showing Red / Black / Odd / Even / Low / High counts.
- **Dozens + Columns** — two `<BarChart>` or `<PieChart>` (whichever reads cleaner in 3 categories).
- **Recent draws table** (optional bottom) — last 20 rounds with timestamp, winning number, colour. Reuses the lottery page's table pattern.

All Recharts panels lazy-loaded via the existing `React.lazy` chunk pattern. The page itself is route-lazy per the admin chunk-split convention.

### 5.4 Admin sidebar nav

Add a "ROULETTE" entry to the admin sidebar (where `BINGO`, `LOTTERY` etc. live). Icon: lucide `CircleDot` (matches the wheel visual). Route: `/admin/roulette`. Guard with the existing `RequireAdmin` route guard.

### 5.5 Scope guardrails (PR B)

**Allowed paths:**

- `src/systems/stats.ts` (additive new functions only — do not modify existing ones)
- `src/systems/stats.test.ts`
- `src/pages/admin/AdminRoulettePage.tsx` (NEW)
- `src/pages/admin/AdminRoulettePage.test.tsx` (NEW)
- `src/router.tsx` (add the lazy route)
- `src/components/admin/AdminSidebar.tsx` (add the link)
- `src/components/admin/AdminSidebar.test.tsx` (update)
- `src/components/charts/**` (if a new chart wrapper is needed — prefer reusing existing wrappers)

**Not allowed:**

- `src/games/roulette/**` (game logic untouched).
- Schema migrations (this PR is read-only over existing `rounds`).
- Per-user filters (this is the all-time site-wide page; per-user roulette stats stay on the existing `StatsPage` Phase 7 deliverable).

### 5.6 Out of scope (admin)

- Per-user `/admin/users/:id/roulette` breakdown — not requested.
- Date-range filter on the all-time chart — not requested; can be added later.
- Export to CSV — not requested.

---

## 6. Sub-project workflow

Per the umbrella's §6 four-step cycle:

1. **Spec PR** — this document, single docs commit, scope `docs`.
2. **Plan PR** — `docs/superpowers/plans/2026-05-25-phase-15-6-roulette-plan.md` with per-PR step-by-step file lists, full code drafted inline per `feedback-planning-depth`.
3. **Implementation PR A** — re-skin / timer / ball / bet-cap (subagent, controller monitors + merges on green).
4. **Implementation PR B** — admin analytics (subagent, controller monitors + merges on green).

Per `feedback-phase15-game-sub-project-order`, the next sub-project (#7 Slots) waits for the user's explicit _"start next"_ prompt.

---

## 7. Testing strategy summary

- **Pure logic** (`logic.test.ts`, `bets.test.ts`, `wheel.test.ts`) — untouched; all existing tests pass.
- **Machine** (`machine.test.ts`) — heavily expanded: new states, new events, timer pause, zero-bet path. Use `vi.useFakeTimers()` + `advanceTimersByTimeAsync` for the 30s/10s windows (per the Phase 12 CI-flakiness lesson — never sync-drain timers).
- **Wheel** (`WheelView.test.tsx`) — pin the corrected `thetaDeg` invariant; pin the `+ ARC_DEG / 2` offset directly so any regression is caught.
- **Page** (`RoulettePage.test.tsx`) — render under fake timers, advance through one full cycle (place a bet → 30 s elapses → spin animates → settled → between_rounds_10s → 10 s elapses → next spin). Test `SPIN_NOW` button skips both windows. Test zero-bet auto-spin runs without a wallet handle.
- **Admin** (PR B `AdminRoulettePage.test.tsx`) — render with fake `db.rounds` rows, assert all aggregations and chart counts. Use the same `fake-indexeddb` + `ResizeObserver` polyfill setup already in `src/test/setup.ts` (Phase 9 precedent).
- **DoD per PR**: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`

---

## 8. Risks + open questions

- **Timer + XState `after` clocks.** XState's `after` uses real-time timers; tests must use fake timers consistently. The current machine's `after.spinDuration` already passes a delay-key — extend to `bet_window: 30_000` and `between_rounds: 10_000` keys in `delays`. Edge case: a `pause` mid-window needs to translate to "extend the after-timer". XState v5 doesn't natively support after-pausing; the cleanest implementation is to **exit and re-enter** the state with a new computed delay (or to use `invoke` of a `fromCallback` that does its own `setTimeout` and is cancellable). Implementer's call; flag this in the plan for thought before coding.
- **Adding sound samples.** If `wheel.spin` / `ball.drop` get added to `scripts/gen-audio.mjs`, the script's output must be re-checked into `public/sounds/` (or wherever the engine loads them). Mention this in the PR description so the human reviewer doesn't miss the generated assets.
- **Chip ladder factoring.** The `ChipDenominationButton` factor-out is optional; if `BettingPanel`'s chips are tightly coupled to its layout, an inline match is fine. Don't over-engineer.
- **`MAX_POSITIONS_PER_ROUND` removal regression risk.** Some old test files may assert the cap-rejection behavior; sweep them on removal.
- **Admin route addition.** The lazy-route pattern in `src/router.tsx` requires the file-level `react-refresh/only-export-components` disable to be respected — verify before pushing (Phase 9 precedent in the status snapshot).
- **Auto-spin with browser-tab hidden.** Browser background timers throttle to 1Hz minimum on most browsers; a 10-second timer that runs while hidden will still tick down (just less frequently). Acceptable per the "dealer doesn't wait" rule. Document in ADR-0046.
- **`details.spin` shape on existing rows.** Confirmed: `RouletteRoundDetails.spin` already carries `{ number, color, pocketIndex }` per `src/games/roulette/types.ts` (verified during spec drafting). PR B's aggregations work directly on existing rows; no backfill required.

---

## 9. Self-review checks (pre-commit)

Checked against the spec self-review heuristic from the brainstorming skill:

1. **Placeholder scan.** No "TBD"; no "implement later"; no vague requirements.
2. **Internal consistency.** Re-skin scope (PR A) and admin scope (PR B) are non-overlapping. Both depend on the existing `rounds` shape; the data contract is described once in §5.6.
3. **Scope check.** Each PR is bounded — PR A is large but well-trimmed (no admin, no per-game cross-touch); PR B is small and surgical.
4. **Ambiguity check.** The "rules-modal pauses the timer" rule is called out explicitly so it's not silently chosen at implementation time. The "tab hidden does NOT pause" rule is also explicit. The "zero-bet auto-spin produces no `rounds` row" is explicit. The "ball-centre offset is exactly `+ ARC_DEG / 2`" is explicit. The "MAX_POSITIONS_PER_ROUND removal" is explicit. The new sound samples and the chip-button factoring are both flagged as implementer-choice with default behavior named.

---
