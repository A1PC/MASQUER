# Phase 15 sub-project #11 — Plinko upgrade

**Status:** Draft for user review.
**Date:** 2026-05-27.
**Sub-project:** #11 in the Phase 15 umbrella. Per release order, follows #10.v2 American Bingo ✅, precedes #12.v1 Texas Hold'em.
**Original release:** Phase 12 (`v0.12-plinko`, 2026-05-20). Modern-casino Plinko in `src/games/plinko/`: 20-row peg board / 21 bins, 4 risk levels (Safe / Low / Medium / High) with edge multipliers `16x / 110x / 420x / 5000x`, manual + auto modes (1-100 balls), multi-ball-in-flight via `inFlightBalls[]`, Framer-Motion keyframe animation, one `rounds` row per ball.
**Scope answer:** _Full polish + admin page + critical animation/geometry rebuild + new bet limits._ User flagged this as "a very important one" with three blocking requirements:

1. **Buckets must sit at the base of the peg pyramid** — currently far below the pegs.
2. **Ball animation must visibly trace the peg path to its bucket** — currently the visual and the outcome don't align.
3. **Bet limits: max 1,000,000 chips per ball; max 1,000 balls per auto-drop session.**

---

## 1. Goal

Make Plinko both look and feel like a real plinko cabinet. The geometry has to be right (triangular peg field + buckets aligned with the bottom row of pegs forming a pyramid base), the ball has to visibly bounce through the pegs along its actual RNG path, and the player has to be able to bet big and run a long auto session. Plus the standard polish recipe + a full new admin page.

Three concrete blocking fixes (in priority order):

1. **Peg layout → triangular pyramid.** Today's peg grid is uniform across all rows; the edge buckets sit way below where any peg actually is. New layout: row N has N+1 pegs (or some triangle pattern), bottom row's pegs define the bucket column positions. Buckets sit immediately below the bottom peg row, each bucket centred on a peg gap.
2. **Ball trajectory → peg-centred bouncing.** At each row, the ball arrives at a peg, bounces L or R based on the RNG path, lands at the next peg's column. The visible final-row column position MUST equal the bin the outcome resolves to. Add a small peg-hit visual cue (peg flash + ball brief scale-down) on every bounce; sound a `peg.ping` per bounce.
3. **Bet ceiling 5,000 → 1,000,000 per ball; auto-drop session cap 100 → 1,000 balls.**

Plus everything else in the standard polish recipe + a new `/admin/plinko` analytics + curve-tuning page.

---

## 2. Decomposition

**Two PRs** (matching Roulette #6 / Baccarat #8 pattern):

- **PR A — game-side**: MASQUER · Plinko title, LobbyButton/OddsInfoBox/RulesModal manual retrofit (no GameShell), brand-token pass, triangular peg geometry + bucket alignment + peg-centred ball trajectory + peg-ping sound + edge-bin jackpot celebration + bet-ceiling bumps. Logic / RNG / multiplier curves byte-stable; only the geometry + presentation change.
- **PR B — admin**: New `/admin/plinko` page with 4 StatCards + 21-bin hit distribution chart + per-risk-level multiplier curve viewer (read-only; tunability deferred to Phase 15 #14 Admin overhaul) + recent drops table. Plus all-time aggregations in `src/systems/stats.ts`.

PR A is the big one. PR B is the standard admin pattern.

---

## 3. Standing invariants

1. **Pure logic untouched.** `src/games/plinko/logic.ts` — `dropBall(rng)`, `payoutFor(risk, bin, stake)`, `MULTIPLIER_CURVES`, `ROW_COUNT`, `BIN_COUNT` all byte-stable. The RNG path is the source of truth; the new animation must follow it.
2. **Games sandbox** preserved. No `@/db` / `@/store` imports from `src/games/plinko/**`. Wallet via `@/systems/**`.
3. **One `rounds` row per ball** (ADR-0016).
4. **Integer money. No `Math.random()`.** ESLint enforces.
5. **Spec-first.** BUILD_GUIDE §8.5 (or equivalent Plinko section) updated first if any rule notes change (bet ceiling is a config-level change, not a rule change).
6. **No CLAUDE.md edits.**
7. **Commit subject ≤ 100 chars**; admin scope is `admin` (NOT `admin-plinko`).
8. **No new ADR expected.** If the trajectory math gets non-trivial enough to merit one (e.g. how the peg-column → bin mapping is locked), add a small ADR-0047 in PR A.

---

## 4. PR A — game-side rebuild

### 4.1 Title + shared shell retrofit (no GameShell)

PlinkoPage has its own custom layout. Manual retrofit:

- **MASQUER · Plinko** title (replaces `🔻 PLINKO`). Subtitle next to it: `Risk: <risk>` when in-game.
- **`<LobbyButton />`** absolute top-left.
- **`<OddsInfoBox>`** absolute top-right with risk-tier summary: `Safe 16× edge · Low 110× · Medium 420× · High 5000× (centre <1×)`.
- **RULES button** bottom-left → `<RulesModal>` with new `PlinkoRules` content.

### 4.2 Brand pass (all 9 UI files)

Tokenize colours across `PlinkoPage.tsx`, `Board.tsx`, `BinRow.tsx`, `FallingBall.tsx`, `SetupPanel.tsx`, `AutoDropControls.tsx`, `HistoryStrip.tsx`, `EndScreen.tsx`. Standard pairings from `docs/PHASE_15_PATTERNS.md` §1.4: `bg-felt-table`, `bg-velvet`, `bg-velvet-deep`, `border-brass`, `text-ivory`, `text-gold`, `text-gold-bright`, `bg-jewel-magenta` for the 5000× edge bin signature.

Pegs themselves: small brass discs (`bg-brass` with subtle gradient + tiny gold-glow on hit).

### 4.3 The big one — geometry rebuild (peg pyramid + bucket alignment)

**Current state**: 20 rows × 21 columns of pegs in a uniform grid. Buckets sit in a flat row well below the pegs. The end buckets are visually disconnected from any peg above them.

**New layout — staggered triangular pyramid**:

- **Row R has R + 1 pegs** (or similar progression — row 0 = 1 peg, row 19 = 20 pegs). Pegs in row R sit at horizontal positions `(col + 0.5) / (R + 1)` × board-width (so they're centred between pegs in row R-1).
- **Even/odd rows offset by half a peg-spacing** (the classic staggered plinko look). Or use the more authentic "triangle of equilateral triangles" where each peg sits in the gap between two pegs above.
- **20 rows → row 19 has 20 pegs → 21 gaps** between pegs (+ outside edges count as gaps). 21 gaps ⇒ 21 bins, one per gap.
- **Buckets sit immediately below row 19's pegs**, each bucket centred on a peg gap. Bucket 0 at the far-left gap (between left edge and leftmost peg of row 19), bucket 20 at the far-right gap.
- **No vertical gap** between the bottom peg row and the bucket row — they touch (or near-touch, with the brass divider that frames the bin row). The pyramid base = bucket array.

The implementer should pick the EXACT triangular pattern that looks best (classic equilateral-triangle peg layout is the safe choice; matches Plinko-go and most cabinets) and document the geometry in a code comment.

### 4.4 The big one — ball trajectory matches the path

**Current**: `FallingBall.tsx` moves the ball ±2% per row over 20 rows, lands somewhere, but the bucket positions aren't aligned with those percentages, so the visual "looks like" bin X while the outcome is bin Y.

**New**: build trajectory keyframes that trace the EXACT peg path:

- At row R, the ball is at peg-column `C` (with `C` ranging 0 to R inclusive, equal to the count of R-choices made in path[0..R-1]).
- After bouncing at peg (R, C), it moves to peg-column `C + 1` (path[R] = R) or `C` (path[R] = L) at row R+1.
- Final bin = count of R in path (matches today's `bin` from `dropBall`).
- Translate (row, col) → (x%, y%) using the SAME geometry as the peg pyramid. The ball's final-frame x% MUST equal the centre-x% of bin[count-of-R].

Animation cadence: 75 ms per row (matches today). Per-row easing has the ball briefly squash on peg impact (`scaleY: 0.85` at the bottom of the row, springs back to 1 at the top of the next row) so the bounce reads kinetically.

**Critical: physics OR keyframes — keyframes are sufficient.** No 2D physics engine needed. The path is deterministic; just build the keyframe array that traces it. Implementer's call if a tiny `spring` per-row would feel better than `easeIn`/`easeOut`.

### 4.5 Peg-ping sound

`peg.ping` plays on every peg bounce (= every row transition during ball drop) = 20 sounds per ball.

Cadence guardrails (per `docs/PHASE_15_PATTERNS.md` §1.5):

- Auto mode at fast interval (250 ms between drops) + 20 pings per ball = potentially 80 pings/second across in-flight balls. **Debounce: max one `peg.ping` per 30 ms** (~33/s ceiling). Coalesce within balls — if multiple peg hits land within 30 ms, fire once.
- Reduced motion → one batched sound per ball, not per peg.
- Sample should be SHORT and SOFT (~40 ms, ~600 Hz click). Add to `scripts/gen-audio.mjs` if missing; register key in `src/systems/sound/ids.ts`.

### 4.6 Edge-bin jackpot celebration

Reuse ADR-0033 tiered celebration pattern. When a ball lands in bin 0 OR bin 20 (the edges) at **High risk** (5000× jackpot tier):

- Coin shower (~20 chip particles drift down from top of board for ~2 s).
- Subtle screen shake (Framer Motion `x: [0, -2, 2, -1, 1, 0]` on the board container, 400 ms, reduced-motion skip).
- Tier-3 banner with `bg-jewel-magenta` border + `win.jackpot` sound.
- For medium-risk edge (420×): coin shower without shake, `win.medium`.
- For lower-risk wins (>2× stake): `win.small`, no shower.
- Losses (multiplier < 1.0): `loss` sound (debounced same as peg.ping under auto mode).

### 4.7 Ball-trail sparkle (high-multiplier landings only)

If `payout / stake >= 100` (i.e. landed in a high-multiplier bin), trail 3-4 fading gold sparkles behind the ball for the last 3 rows of its drop. Optional; implementer judgment if it crowds visually. Skip in reduced-motion.

### 4.8 Manual-drop cooldown

Per docket — manual drops are currently spam-clickable. Add a 150 ms cooldown between manual drops to prevent stacking visual chaos. UI: DROP button disabled for 150 ms after each click + a faint ring fade.

### 4.9 Bet limits

- `PLINKO_CONFIG.MAX_BET`: **5,000 → 1,000,000** chips per ball.
- Auto-drop session cap: **100 → 1,000** balls per session.
- `BettingPanel` chip ladder already supports 1000 max chip — fine. Player can place 1000 chip 1000 times to reach 1M ball, or whatever combination.
- Note: a 1M-stake ball at 5000× = 5,000,000,000 chip payout. House net swings will be wider; player balances can grow large fast. Acceptable for a play-money app.

### 4.10 Sound

| Event                                       | Sample        | Notes                                   |
| ------------------------------------------- | ------------- | --------------------------------------- |
| Chip click on bet                           | `chip.place`  | Reuse                                   |
| DROP button → ball spawn                    | `ball.drop`   | Reuse                                   |
| Peg bounce (per row)                        | `peg.ping`    | NEW — short soft click; max 1 per 30 ms |
| Bin landing — Win tier 1 (1.0–2.0×)         | `win.small`   | Reuse                                   |
| Bin landing — Win tier 2 (2.0–20×)          | `win.medium`  | Reuse                                   |
| Bin landing — Win tier 3 (≥ 20× / edge bin) | `win.jackpot` | Reuse                                   |
| Bin landing — Loss (< 1.0×)                 | `loss`        | Reuse; debounced in auto mode           |

All gated on `useEffectiveReducedMotion`.

### 4.11 Scrollable modals + RulesModal

Standard: `max-h-[60vh] overflow-y-auto` on `EndScreen` body + new RulesModal body (per #230).

`PlinkoRules.tsx` content:

- Object — drop a ball, it bounces through the pegs, lands in one of 21 bins, payout = `stake × multiplier[bin]`.
- Risk levels — Safe / Low / Medium / High. Same probabilities (Binomial(20, 0.5)); different multiplier curves. Higher risk = bigger edges + deeper centre.
- Multipliers — table per risk level (edge / shoulder / centre values).
- Manual vs Auto — single drop per click, or queue up to 1,000 balls with intervals 250 / 500 / 1000 ms.
- Bet limits — 10 chips / ball minimum, **1,000,000 chips / ball maximum**, **1,000 balls / auto session maximum**.
- RTP — ~95-98% depending on risk level.

### 4.12 PR A scope guardrails

**Allowed:**

- `src/games/plinko/**` (all UI files + tests)
- `src/systems/sound/{engine,ids}.ts` (only to register `peg.ping`)
- `scripts/gen-audio.mjs` + `src/assets/audio/peg-ping.wav` (NEW)
- `BUILD_GUIDE.md` (only if §8.5 needs a small amendment for the 1M bet ceiling)
- `tailwind.config.ts` + `src/theme/tokens.ts` (only if a new plinko-specific token is genuinely needed)
- `docs/adr/0047-plinko-peg-geometry.md` (NEW, only if the geometry math is non-trivial enough to merit a record)

**Not allowed:**

- `src/games/plinko/logic.ts` rules / multiplier curves / `dropBall` / `payoutFor` — byte-stable
- `src/games/plinko/machine.ts` semantics — byte-stable (config constants OK to change)
- Other games / admin pages
- New gameplay (drop-from-column picker, 5th risk tier, progressive jackpot — all stay in the deferred docket)

---

## 5. PR B — `/admin/plinko` analytics page

### 5.1 Goal

New `/admin/plinko` page following the established admin-stats pattern (`/admin/roulette` / `/admin/slots` / `/admin/baccarat` / `/admin/lottery`). Read-only over existing `rounds.details` — no schema migration. Curve tunability deferred to Phase 15 #14 Admin overhaul (mentioned in the deferred docket; we'll ship the viewer here, the editor later).

### 5.2 New aggregations in `src/systems/stats.ts`

Additive functions (do NOT modify existing):

```ts
export interface PlinkoAllTimeStats {
  ballsDropped: number;
  totalWagered: number;
  totalPaid: number;
  netHouseChips: number;
  netPlayerChips: number;
  actualRtp: number | null;
  // Per-risk breakdown
  perRisk: Record<
    'safe' | 'low' | 'medium' | 'high',
    {
      drops: number;
      wagered: number;
      paid: number;
      rtp: number | null;
    }
  >;
  // Headline events
  jackpotHits: number; // landed in bin 0 or 20 at High risk
  edgeBinHits: number; // landed in bin 0 or 20 at any risk
  centreBinHits: number; // landed in bin 10 (worst payout)
}

export interface PlinkoBinDistribution {
  bin: number; // 0..20
  count: number;
}

export interface PlinkoRiskDistribution {
  risk: 'safe' | 'low' | 'medium' | 'high';
  count: number;
}
```

All iterate `db.rounds.where('game').equals('plinko').toArray()` once. Tests pin against a ~20-row fixture covering all 4 risks × mixed bins.

### 5.3 `AdminPlinkoPage`

Layout mirrors `AdminRoulettePage`:

- **Top: 4 StatCards** — Balls Dropped · House Net Chips (red if positive / green if negative) · Actual RTP (vs ~95-98% target) · Jackpot Hits (high-risk edge bin count).
- **Hero chart**: 21-bin hit distribution. Mirror `PocketDistributionBar`'s shape (one bar per bin 0-20, coloured by bin's edge-distance — gold edges, dimmer towards centre). `ChartTooltipShell` for tooltips.
- **Per-risk distribution panel**: 4 mini-bars (Safe / Low / Medium / High) showing drops + per-risk RTP.
- **Multiplier curve viewer**: 4 sparkline charts showing each risk's multiplier curve (just the configured `MULTIPLIER_CURVES` values, not derived from drops). Read-only — tunability deferred to Phase 15 #14.
- **Recent drops table (last 20)**: `Played at | Risk | Bin | Multiplier | Stake | Payout | House P/L`. Ordered `playedAt` desc via load-all + sort-in-memory + slice-20 (per #250 pattern).

### 5.4 Chart wrapper

New `src/components/charts/PlinkoBinDistributionBar.tsx` (+ test). Similar to `PocketDistributionBar` — 21 bars, colour-shaded by edge-distance, `ChartTooltipShell`.

### 5.5 PR B scope guardrails

**Allowed:**

- `src/systems/stats.ts` + test (additive only)
- `src/pages/admin/AdminPlinkoPage.tsx` + test (NEW)
- `src/components/charts/PlinkoBinDistributionBar.tsx` + test (NEW)
- `src/pages/admin/AdminLayout.tsx` + test (add `Plinko` nav entry; preserve existing entries)
- `src/router.tsx` (add lazy route)

**Not allowed:**

- `src/games/plinko/**` (game logic + UI untouched in PR B)
- Other admin pages
- Schema migrations
- Curve tunability editor — deferred to Phase 15 #14

---

## 6. Sub-project workflow

1. **Spec PR** (this doc).
2. **Plan PR** with task breakdown + inline geometry math.
3. **PR A** — game-side rebuild.
4. **PR B** — admin analytics.
5. Then user "start next" → #12.v1 Texas Hold'em.

---

## 7. Testing

- **Pure logic** (`logic.test.ts`) — untouched; all existing tests pass.
- **Geometry**: pin the peg-column → x-percent mapping for all 21 bins; assert FallingBall's final-frame x equals the bucket's centre-x for each possible path.
- **Trajectory match**: for a known path, assert each row's keyframe row-position matches the peg in that row, column.
- **Sound debounce**: assert `peg.ping` fires at most once per 30 ms under a synthetic 20-ping burst.
- **Page tests**: title + LobbyButton + OddsInfoBox + RulesModal + bet ceiling + auto-cap.
- **Admin tests** (PR B): seed fake plinko rounds; assert each card text + chart + recent table.
- **DoD per PR**: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`

---

## 8. Risks + open items

- **Geometry rebuild is the highest-risk piece.** Triangular peg layout + bucket alignment + trajectory math all need to land together. Implementer should build a tiny manual test page or Storybook story showing the peg pyramid + a known-path ball, verify visually, THEN wire into the game.
- **Peg-ping cadence.** 20 sounds per ball × multiple balls in flight is a lot. The 30 ms debounce should handle it; if it still feels noisy under stress (Auto mode 250 ms × many balls), lower the volume of the sample or tighten the debounce to 50 ms.
- **1M-stake balls swing house net hard.** RTP per ball stays the same — but a single 1M @ 5000× = 5B-chip swing. Admin's House Net stat could go very negative very fast. Acceptable for play money. Document in admin if a single drop creates an outlier (`>1B house P/L` could trigger a small warning badge).
- **Auto-drop session cap × 10**. 1000 balls × 250 ms = 250 s ≈ 4 minutes of continuous animation + sound. Page should stay responsive — `inFlightBalls[]` already supports many balls; verify performance with 50-100 simultaneous balls in flight.
- **Edge-bin coin shower under multi-ball auto mode**. If 5 balls land in edge bins within a second, don't stack 5 coin showers — debounce to one celebration per ~1 s.

---

## 9. Self-review

1. **Placeholder scan**: none.
2. **Internal consistency**: two-PR scope is bounded; geometry rebuild + trajectory fix are clearly the load-bearing risk; bet limits are config-level changes.
3. **Scope check**: PR A is bigger than typical re-skin (geometry rebuild = real engineering work). PR B is the standard admin pattern.
4. **Ambiguity check**: §4.3 trajectory math + §4.4 peg-column → bin mapping called out explicitly. Sound cadence flagged in §7. RTP swing flagged in §7.

---
