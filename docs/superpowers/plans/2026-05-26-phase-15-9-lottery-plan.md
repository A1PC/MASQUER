# Phase 15 sub-project #9 — Lottery upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 15 #9 — re-skin the daily lottery on the MASQUER / Velvet Deco bar AND expand the game from Pick-5+1 to Pick-6+1 with the UK National Lottery payout shape (jackpot 20M, ticket cost 5 chips, ~84% RTP).

**Architecture:** Single PR. Lottery lives at `src/pages/lottery/` (top-level page per ADR-0040 — not a `src/games/` sandbox citizen). Logic in `src/systems/lottery.ts` gets the game-shape expansion (Pick-5 → Pick-6, new tier matcher + payout table, free-re-entry value now 5). UI gets brand-token pass, dramatic ball-reveal animation, scrollable modal pattern, sound integration, rules modal, manual `LobbyButton` + `OddsInfoBox` retrofit (no `GameShell` wrapper). Dexie v3 → v4 destructive migration wipes old Pick-5 lottery rows.

**Tech Stack:** TypeScript 5 strict + exactOptionalPropertyTypes · React 18 · Vite 5 · Tailwind 3 · Framer Motion 12 + `useEffectiveReducedMotion` · Dexie 4 (v3 → v4) · Vitest 2 + RTL + fake-indexeddb · pnpm 9.12.

**Spec:** `docs/superpowers/specs/2026-05-26-phase-15-9-lottery-design.md` (merged at #253). Read it before each task batch — especially §4.8 (Pick-6 + tier table), §8 (locked economy).

---

## Shared rules

1. **`systems/lottery.ts` logic structure preserved.** `draw()` / `tierFor()` / `payoutFor()` rewrite per the new shape. Backfill / favorites / settleMissedDraws / unread-dot all stay structurally intact.
2. **ADR-0040** (lottery as system) preserved — lottery still imports `@/db` / `@/store` freely.
3. **Integer money. No `Math.random()`.** Existing ESLint enforces.
4. **Spec-first.** BUILD_GUIDE §10.5 + ADR-0040 amendment note commit BEFORE code.
5. **Dexie v3 → v4 destructive migration** of the four lottery tables. `rounds` rows for past lottery wins stay (no impact).
6. **No CLAUDE.md edits.**
7. **Commit subject ≤ 100 chars** (commitlint header-max-length; `feedback-masquer-commit-subject-limit`).
8. **No `--no-verify`. No `--amend`** — soft-reset + new commit if needed.
9. **DoD per task batch:**
   ```
   pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
   ```
10. **TS strict + exactOptionalPropertyTypes** — `{...(cond ? {key: val} : {})}` spread pattern.
11. **Tokens-only Tailwind** in rebuilt files. New tokens only if missing.

---

## File structure

| File                                               | Action  | Responsibility                                                                                                                     |
| -------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `BUILD_GUIDE.md` §10.5                             | Rewrite | New economy + new tier table + Pick-6+1 mechanics.                                                                                 |
| `docs/adr/0040-lottery-as-system.md`               | Modify  | Append Phase 15 #9 amendment note (game expanded; ADR core unchanged).                                                             |
| `src/systems/lottery.ts`                           | Modify  | MAIN_PICKS=6, LINE_COST=5, new LotteryMatchTier union, rewrite tierFor/payoutFor/draw/isValidLine/lucky-dip + bump schema version. |
| `src/systems/lottery.test.ts`                      | Modify  | Update tier+payout cases; verify Pick-6 draw shape; backfill/idempotence/favorites tests stay structurally.                        |
| `src/db/index.ts` (or wherever Dexie schema lives) | Modify  | v3 → v4 schema bump with destructive lottery-table wipe.                                                                           |
| `src/pages/lottery/LotteryPage.tsx`                | Rewrite | MASQUER · Lottery title, manual `LobbyButton`+`OddsInfoBox` retrofit, RULES modal, brand tokens.                                   |
| `src/pages/lottery/LotteryPage.test.tsx`           | Modify  | Title + shell shell + rules assertions.                                                                                            |
| `src/pages/lottery/HeroSection.tsx`                | Rewrite | 7 ball slots (6 main + 1 bonus), dramatic per-ball reveal animation, brand tokens.                                                 |
| `src/pages/lottery/HeroSection.test.tsx`           | Modify  | Pin animation contract + reduced-motion path + bonus ball treatment.                                                               |
| `src/pages/lottery/NumberGrid.tsx`                 | Modify  | Player picks 6, not 5; "X/6 selected"; brand tokens.                                                                               |
| `src/pages/lottery/NumberGrid.test.tsx`            | Modify  | Update assertions for 6-pick.                                                                                                      |
| `src/pages/lottery/TicketCart.tsx`                 | Modify  | Render 6-number lines; brand tokens; max-h-[60vh] overflow-y-auto on the cart body.                                                |
| `src/pages/lottery/TicketCart.test.tsx`            | Modify  | 6-number line assertions; scroll-container assertion.                                                                              |
| `src/pages/lottery/YourTicketsSlide.tsx`           | Modify  | Render 6-number lines; scrollable.                                                                                                 |
| `src/pages/lottery/YourTicketsSlide.test.tsx`      | Modify  | 6-number assertions.                                                                                                               |
| `src/pages/lottery/FavoritesDropdown.tsx`          | Modify  | 6-number favorites; brand tokens.                                                                                                  |
| `src/pages/lottery/FavoritesDropdown.test.tsx`     | Modify  | 6-number assertions.                                                                                                               |
| `src/pages/lottery/HistorySlide.tsx`               | Modify  | Brand tokens; scrollable body; render 6+1 balls per draw.                                                                          |
| `src/pages/lottery/HistorySlide.test.tsx`          | Modify  | Update ball-count assertions.                                                                                                      |
| `src/pages/lottery/DrawAnimationModal.tsx`         | Modify  | Reveal 6+1 balls; match the dramatic-reveal style of HeroSection; scrollable body; sound on each ball.                             |
| `src/pages/lottery/DrawAnimationModal.test.tsx`    | Modify  | 6+1 reveal sequence assertion.                                                                                                     |
| `src/pages/lottery/useLotteryCart.ts`              | Modify  | Type signatures for 6-number lines; cap if applicable.                                                                             |
| `src/pages/lottery/useLotteryCart.test.ts`         | Modify  | Update.                                                                                                                            |
| `src/pages/lottery/useLotteryBackfill.ts`          | Modify  | Likely no logic change; verify schema-version handshake.                                                                           |
| `src/pages/lottery/integration.test.tsx`           | Modify  | Full purchase → draw → settle flow against new shape.                                                                              |
| `src/pages/lottery/LotteryRules.tsx`               | NEW     | Rules content (§4.7) rendered in shared `RulesModal`.                                                                              |
| `src/pages/admin/AdminLotteryPage.tsx`             | Modify  | Recent-draws table restyled to brand-consistent pattern; ordering fix if `.where(...).reverse()` is used.                          |
| `src/pages/admin/AdminLotteryPage.test.tsx`        | Modify  | Update class-name assertions to new style.                                                                                         |
| `tailwind.config.ts` + `src/theme/tokens.ts`       | Modify  | Only if a new lottery-specific token is genuinely needed (default: reuse existing brand tokens).                                   |

---

## Branch

`git checkout main && git pull origin main && git checkout -b phase-15-9-pr-a`

## Task A.0 — Read context (10 min)

- [ ] **Step 1: Read the spec** end to end — `docs/superpowers/specs/2026-05-26-phase-15-9-lottery-design.md`. Lock §4.8 and §8 in your head.
- [ ] **Step 2: Read `src/systems/lottery.ts`** — note current shape: `MAIN_PICKS` is implicit `5` throughout (look for `5` literals + `for (let i = 1; i <= 5; ...)` patterns); `LotteryMatchTier` union; `tierFor`/`payoutFor` switches; `draw()` / `isValidLine()` / lucky-dip generator.
- [ ] **Step 3: Read each lottery UI file** in `src/pages/lottery/` to understand the existing visual + state contracts. Pay attention to: HeroSection's current ball rendering (the "flat" reveal to replace), NumberGrid's pick-counting logic, DrawAnimationModal's existing ball-by-ball reveal (we'll match it to HeroSection's new dramatic style).
- [ ] **Step 4: Read the reference upgraded pages** for the LobbyButton/OddsInfoBox/RulesModal retrofit pattern — `BlackjackPage.tsx`, `RoulettePage.tsx`, `SlotsPage.tsx` (all use `GameShell` so the props pattern is the source-of-truth; lottery will manually retrofit since it has no shell).
- [ ] **Step 5: Read `src/db/index.ts`** (or wherever Dexie schema is declared) to understand the version bump pattern.

## Task A.1 — BUILD_GUIDE + ADR amendment (spec-first)

**Files:** `BUILD_GUIDE.md`, `docs/adr/0040-lottery-as-system.md`.

- [ ] **Step 1: Rewrite BUILD_GUIDE §10.5** for Pick-6+1 + new tier table:

  ```markdown
  ## 10.5 Daily Lottery

  Pick 6 numbers from 1–50, plus 1 bonus number from 1–10. Draw at 20:00 local
  every day. If the app is closed when a draw fires, missed draws settle
  chronologically on next open.

  **Tickets**: 5 chips per line. Multiple lines per ticket; lucky-dip generator
  fills a random valid line. Up to N favorites can be saved for re-use.

  **Payouts** (per UK National Lottery shape):

  | Player matched | Tier      | Payout (chips)               |
  | -------------- | --------- | ---------------------------- |
  | 6 main         | `6`       | 20,000,000 (jackpot)         |
  | 5 main + bonus | `5+bonus` | 1,000,000                    |
  | 5 main only    | `5`       | 1,750                        |
  | 4 main         | `4`       | 150                          |
  | 3 main         | `3`       | 30                           |
  | 2 main         | `2`       | free re-entry (5-chip value) |
  | 0 / 1 main     | —         | 0                            |

  **RTP** ≈ 84%. House edge ≈ 16%. Match-2 free re-entry buys a ticket on the
  next draw with the player's same numbers (or new lucky dip if none saved).

  **History migration**: when the schema bumps from v3 to v4 (Phase 15 #9), the
  four lottery tables (`lotteryDraws`, `lotteryTickets`, `lotteryLines`,
  `lotteryFavorites`) are wiped — the old Pick-5 line shape can't be revalidated
  against the new Pick-6 rules. `rounds` rows for past lottery wins stay.
  ```

- [ ] **Step 2: Append amendment to ADR-0040** explaining the Pick-5 → Pick-6 game-shape change + schema bump. ADR's core decision (lottery as system, not games-sandbox citizen) is unchanged.

  ```markdown
  ## Amendment (2026-05-26, Phase 15 #9)

  Game shape expanded from Pick-5+1 to Pick-6+1 to match the UK National
  Lottery payout shape (per user request — see spec
  `2026-05-26-phase-15-9-lottery-design.md`). Tier matcher and payout
  table rewritten:

  - `LotteryMatchTier` union: `'6' | '5+bonus' | '5' | '4' | '3' | '2'`.
  - `LINE_COST` changed `10 → 5`. `REENTRY_VALUE` tracks `LINE_COST`.
  - Jackpot (`6` tier) = 20,000,000 chips. Other tiers per the new table.
  - Old `4+bonus` (was 100K) and `3+bonus` (was 2K) tiers removed —
    bonus matters only for the `5+bonus` tier.

  Dexie schema bumps v3 → v4 with a destructive wipe of the four lottery
  tables; old Pick-5 lines can't be revalidated against the new Pick-6
  rules. `rounds` rows for past lottery wins stay (untouched).

  ADR-0040's core decision (lottery as system, not games-sandbox
  citizen; lottery imports `@/db` and `@/store` freely; one rounds row
  per evaluated line per §7.4) is unchanged.
  ```

- [ ] **Step 3: Markdownlint + commit.**
  ```bash
  npx markdownlint-cli2 BUILD_GUIDE.md docs/adr/0040-*
  git add BUILD_GUIDE.md docs/adr/0040-lottery-as-system.md
  git commit -m "docs(lottery): Pick-6+1 + UK tiers in §10.5; ADR-0040 amendment"
  ```

## Task A.2 — `systems/lottery.ts` logic rewrite

**Files:** `src/systems/lottery.ts`, `src/systems/lottery.test.ts`.

- [ ] **Step 1: Read the current file end-to-end** before editing — note where `5` appears as a magic number.

- [ ] **Step 2: Add `MAIN_PICKS` constant + bump `LINE_COST`:**

  ```ts
  const MAIN_POOL_SIZE = 50;
  const BONUS_POOL_SIZE = 10;
  /** Pick-6+1 per UK National Lottery shape (Phase 15 #9). */
  const MAIN_PICKS = 6;
  const LINE_COST = 5; // 10 chips previously
  // REENTRY_VALUE stays = LINE_COST per the original semantic.
  const REENTRY_VALUE = LINE_COST;
  ```

- [ ] **Step 3: Rewrite `LotteryMatchTier` union:**

  ```ts
  export type LotteryMatchTier = '6' | '5+bonus' | '5' | '4' | '3' | '2';
  ```

  Drop `'5+bonus'`, `'4+bonus'`, `'3+bonus'`, `'2+bonus'` from the old union (note: `5+bonus` stays in the new union per the new tier table — only `4+bonus`, `3+bonus`, `2+bonus` are removed).

- [ ] **Step 4: Rewrite `tierFor()`:**

  ```ts
  export function tierFor(line: LotteryLine, draw: LotteryDraw): LotteryMatchTier | null {
    const mains = line.mainNumbers.filter((n) => draw.mainNumbers.includes(n)).length;
    const bonus = line.bonusNumber === draw.bonus;
    if (mains === 6) return '6';
    if (mains === 5 && bonus) return '5+bonus';
    if (mains === 5) return '5';
    if (mains === 4) return '4';
    if (mains === 3) return '3';
    if (mains === 2) return '2';
    return null;
  }
  ```

  Note: `4`/`3`/`2` tiers no longer care about the bonus — UK Lottery semantics.

- [ ] **Step 5: Rewrite `payoutFor()`:**

  ```ts
  export function payoutFor(tier: LotteryMatchTier | null): number {
    switch (tier) {
      case '6':
        return 20_000_000;
      case '5+bonus':
        return 1_000_000;
      case '5':
        return 1_750;
      case '4':
        return 150;
      case '3':
        return 30;
      case '2':
        return 0; // free re-entry granted by settleMissedDraws
      case null:
        return 0;
    }
  }
  ```

- [ ] **Step 6: Update `draw()` to pick 6 mains** (was 5):
      Find the `for (let i = 1; i <= 5; ...)` or equivalent and replace with `MAIN_PICKS` references. The Fisher-Yates partial draw + bonus pick stay structurally.

- [ ] **Step 7: Update `isValidLine()`** to validate `mainNumbers.length === MAIN_PICKS` (was 5).

- [ ] **Step 8: Update lucky-dip generator** to produce 6 mains.

- [ ] **Step 9: Update `LotteryLine` type** — `mainNumbers: number[]` (length 6 expected; if there's a strict tuple type, change to length-6).

- [ ] **Step 10: Rewrite `systems/lottery.test.ts`:**
  - Drop tests for `4+bonus`, `3+bonus`, `2+bonus` tiers.
  - Add tests for `6` tier (jackpot).
  - Update tier tests: 4-mains-with-bonus is now just `'4'` (no special); same for 3 and 2.
  - Update `LINE_COST` assertions (10 → 5).
  - Update payout assertions per the new table.
  - Update `draw()` shape tests — 6 mains, not 5.
  - Update `isValidLine` tests — 6 mains required.
  - Backfill / idempotence / favorites / settleMissedDraws tests stay structurally (verify they don't rely on the old tier shape).

- [ ] **Step 11: Run.**

  ```bash
  pnpm exec vitest run src/systems/lottery.test.ts
  ```

- [ ] **Step 12: Commit.**
  ```bash
  git add src/systems/lottery.ts src/systems/lottery.test.ts
  git commit -m "feat(lottery): Pick-6+1 + new UK tier table + LINE_COST=5"
  ```

## Task A.3 — Dexie v3 → v4 destructive migration

**Files:** `src/db/index.ts` (or wherever Dexie schema lives), test fixtures if affected.

- [ ] **Step 1: Read `src/db/index.ts`** — find the existing version chain (likely `db.version(1).stores(...)`, `db.version(2).stores(...)`, `db.version(3).stores(...)`).

- [ ] **Step 2: Add v4 with destructive wipe of lottery tables.**
      Dexie's upgrade callback is the cleanest path:

  ```ts
  db.version(4)
    .stores({
      // Repeat existing stores so v4 is a complete schema declaration.
      // ... unchanged stores ...
      lotteryDraws: 'drawDate, status',
      lotteryTickets: 'id, userId, drawDate',
      lotteryLines: 'id, ticketId, drawDate',
      lotteryFavorites: 'id, userId',
    })
    .upgrade(async (tx) => {
      // Phase 15 #9 — Pick-5 → Pick-6 game shape change. Old rows can't
      // be revalidated against the new rules; wipe them. `rounds` rows
      // for past lottery wins stay (no impact on game-history aggregates).
      await tx.table('lotteryDraws').clear();
      await tx.table('lotteryTickets').clear();
      await tx.table('lotteryLines').clear();
      await tx.table('lotteryFavorites').clear();
    });
  ```

- [ ] **Step 3: Add test** with fake-indexeddb that seeds a v3 schema + lottery rows, opens with the new code, and asserts the four lottery tables are empty post-migration.

- [ ] **Step 4: Commit.**
  ```bash
  git add src/db/index.ts src/db/migrations*.test.ts
  git commit -m "feat(db): v4 schema with destructive lottery-tables wipe"
  ```

## Task A.4 — `NumberGrid` 6-pick

**Files:** `src/pages/lottery/NumberGrid.tsx`, `src/pages/lottery/NumberGrid.test.tsx`.

- [ ] **Step 1: Update the pick cap** from 5 to `MAIN_PICKS` (= 6). Display "X/6 selected" instead of "X/5".
- [ ] **Step 2: Tokenize colours.** Replace raw hex with brand tokens (`bg-felt-table-deep`, `border-brass`, `text-ivory`, `text-gold`).
- [ ] **Step 3: Update tests** — pick-count assertions.
- [ ] **Step 4: Commit.**

## Task A.5 — `HeroSection` — dramatic ball-reveal animation

**Files:** `src/pages/lottery/HeroSection.tsx`, `src/pages/lottery/HeroSection.test.tsx`.

- [ ] **Step 1: Restructure to render 7 ball slots** (6 main + 1 bonus). Pre-draw: show neutral "?" placeholders.
- [ ] **Step 2: Add ball-reveal animation.** Per ball:
  - Wrapped in `<motion.div>` with `initial={{ scale: 0.6, opacity: 0 }}` `animate={{ scale: [0.6, 1.05, 1], opacity: 1 }}` `transition={{ duration: 0.4, delay: i * 0.25, ease: [0.16, 1, 0.3, 1] }}`.
  - Gold-glow flash via `shadow-gold-glow` token toggled on for ~150 ms via `onAnimationStart` callback (or animate `boxShadow` in the same keyframes).
  - Reduced-motion short-circuit via `useEffectiveReducedMotion()` → no animation, balls render at final state immediately.
- [ ] **Step 3: Per-ball visual treatment.**
  - Main balls: `bg-velvet-deep` with `border-brass`, ivory body text, `font-display`.
  - Bonus ball: same chrome + `bg-jewel-magenta` ring (+ optional gold-bright text accent).
- [ ] **Step 4: Persistence.** Use a `useRef` to track the last-revealed `drawId`; only animate on FIRST reveal per draw. Subsequent renders show static balls.
- [ ] **Step 5: Sound integration.** Each ball-land fires `play('ball.drop')`. Reduced-motion: one batched sound, not per-ball.
- [ ] **Step 6: Update tests** — assert the 7 slots, the per-ball reveal data attrs, the persistence ref behaviour, the reduced-motion path.
- [ ] **Step 7: Commit.**

## Task A.6 — `DrawAnimationModal` matching style

**Files:** `src/pages/lottery/DrawAnimationModal.tsx`, `src/pages/lottery/DrawAnimationModal.test.tsx`.

- [ ] **Step 1: Adopt the same per-ball visual treatment** as HeroSection so modal-close → hero-reveal feels continuous.
- [ ] **Step 2: Reveal 6+1 balls** (was 5+1).
- [ ] **Step 3: Apply `max-h-[60vh] overflow-y-auto`** on the modal body so many-tier-hit content scrolls cleanly.
- [ ] **Step 4: `play('ball.drop')` per ball in modal.**
- [ ] **Step 5: Commit.**

## Task A.7 — Modal scrolling (lucky-dip / buy / reveal menus)

**Files:** wherever the add-lucky-dip / buy / lucky-dip-reveal modals are defined (likely inside `TicketCart.tsx`, `FavoritesDropdown.tsx`, or a dedicated modal component).

- [ ] **Step 1: Locate each modal** by grepping for `Modal`/`Dialog`/`Popover`/`overflow-`. Many UI primitives in `src/components/ui` should have the right shape.
- [ ] **Step 2: For each modal body, wrap content** in a container with `max-h-[60vh] overflow-y-auto` per the #230 pattern. Apply brand tokens to the chrome (`bg-velvet-deep`, `border-brass/60`, ivory body text).
- [ ] **Step 3: Update tests** to assert `max-h-[60vh]` and `overflow-y-auto` (use `expect(el.className).toContain('max-h-[60vh]')` and similar).
- [ ] **Step 4: Commit.**

## Task A.8 — Brand tokenisation across all lottery UI

**Files:** `LotteryPage.tsx`, `HeroSection.tsx`, `NumberGrid.tsx`, `TicketCart.tsx`, `HistorySlide.tsx`, `YourTicketsSlide.tsx`, `FavoritesDropdown.tsx`, `DrawAnimationModal.tsx`.

- [ ] **Step 1: For each file, replace raw hex / non-token Tailwind** with brand tokens (`bg-felt-table`, `bg-velvet-deep`, `text-ivory`, `text-gold`, `border-brass`, `bg-jewel-magenta` for jackpot signature).
- [ ] **Step 2: Verify Storybook renders.** Use `pnpm storybook` locally.
- [ ] **Step 3: Update tests** — drop hex assertions, use class-name / data-token assertions.
- [ ] **Step 4: Commit per-file or batched.**

## Task A.9 — `useSound` integration

**Files:** `LotteryPage.tsx` + the components that emit sound events.

- [ ] **Step 1: Wire `useSound`:**
  - `play('chip.place')` on ticket-buy commit.
  - `play('ball.drop')` per ball reveal (modal + hero).
  - `play('win.small/.medium/.jackpot')` on settle, gated on tier:
    - `'6'` → `win.jackpot`
    - `'5+bonus'` → `win.jackpot`
    - `'5'` → `win.medium`
    - `'4'` / `'3'` → `win.small`
    - `'2'` → no sound (silent re-entry)
  - `play('loss')` on settle if `tier === null`.
  - All gated on `useEffectiveReducedMotion`.
- [ ] **Step 2: Tests** — mock `useSound`, assert calls per outcome.
- [ ] **Step 3: Commit.**

## Task A.10 — Add `LotteryRules` content + `RulesModal`

**Files:** `src/pages/lottery/LotteryRules.tsx` (NEW), `LotteryPage.tsx`.

- [ ] **Step 1: Create `LotteryRules.tsx`** with sectioned `<h3>` headings (mirror the Blackjack / Slots rules patterns):
  - Object — Pick 6 from 1–50 + 1 bonus from 1–10. Daily 20:00 draw.
  - Tickets — 5 chips/line. Lucky-dip generates a random valid line. Save favorites.
  - Payouts — table per tier (6 = 20M, 5+bonus = 1M, 5 = 1750, 4 = 150, 3 = 30, 2 = free re-entry).
  - Match-2 free re-entry — grants a free ticket on the next draw (worth `LINE_COST` = 5 chips).
  - Backfill — missed draws settle chronologically on next app open.
  - Favorites — save number sets for re-use.

- [ ] **Step 2: Wire into `LotteryPage`** — add a bottom-left RULES button + `<RulesModal>` from `@/components/ui` (or wherever the shared modal lives). Already supports scrollable body from #230.

- [ ] **Step 3: Test** — RULES button opens modal; modal contains expected sections.

- [ ] **Step 4: Commit.**

## Task A.11 — `AdminLotteryPage` restyle

**Files:** `src/pages/admin/AdminLotteryPage.tsx`, `AdminLotteryPage.test.tsx`.

- [ ] **Step 1: Check ordering** — does the page use `db.rounds.where('game').equals('lottery').reverse().limit(20)`? If so, fix per #250 pattern (load all + sort by playedAt desc + slice 20).
- [ ] **Step 2: Restyle recent-draws table** to match the brand-consistent pattern from #250: ivory body, brass borders, a coloured tier badge per row (None / 3 / 4 / 5 / 5+bonus / 6).
- [ ] **Step 3: Verify ChartTooltipShell adoption.** `NumberFrequencyBar` was migrated in #251 — no further chart change needed.
- [ ] **Step 4: Update tests** — class-name + ordering assertions.
- [ ] **Step 5: Commit.**

## Task A.12 — `LotteryPage` title + `LobbyButton` + `OddsInfoBox` retrofit

**Files:** `LotteryPage.tsx` + test.

- [ ] **Step 1: Add MASQUER · Lottery title** at the page header (replace whatever is there).
- [ ] **Step 2: Render `<LobbyButton />`** absolute top-left of the page (manual retrofit; no `GameShell`).
- [ ] **Step 3: Render `<OddsInfoBox>`** absolute top-right with contents: `Jackpot 20M · 5+B 1M · 5 1,750 · 4 150 · 3 30 · 2 free re-entry`.
- [ ] **Step 4: Update tests** for title + LobbyButton + OddsInfoBox presence.
- [ ] **Step 5: Commit.**

## Task A.13 — Full DoD + open PR

- [ ] **Step 1: Run the full DoD.**
  ```bash
  pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
  ```
- [ ] **Step 2: Push + open PR** titled `phase-15(#9): lottery reskin + Pick-6+1 + UK tiers + sound + dramatic balls` (counts under 100 chars).
- [ ] **Step 3: Report DoD + PR URL.** Do NOT merge.

---

## Self-review

**Spec coverage:**

- §4.1 (title + shared shell) → A.12
- §4.2 (brand pass) → A.8
- §4.3 (scrollable modals) → A.7
- §4.4 (dramatic ball reveal) → A.5 + A.6
- §4.5 (sound) → A.9
- §4.6 (admin polish) → A.11
- §4.7 (rules modal + content) → A.10
- §4.8 (Pick-6+1 + new tiers + LINE_COST=5) → A.1 + A.2 + A.3
- §4.9 (out of scope) → respected via the allowed-paths list
- §4.10 (scope guardrails) → applied per-task

**Placeholder scan:** None — every step has the code or the exact command.

**Type consistency:** `LotteryMatchTier`, `LotteryLine`, `LINE_COST`, `MAIN_PICKS`, `REENTRY_VALUE` referenced consistently.

**Risks already flagged in spec §7** carried forward:

- Ball-reveal cadence (~250 ms × 7 ≈ 1.75 s) — implementer can ease.
- Sound cadence — 7 `ball.drop` sounds; implementer can lower sample volume.
- DrawAnimationModal vs HeroSection visual continuity — both adopt same per-ball treatment in A.5 + A.6.
- Destructive Dexie wipe — explicit in A.3 + ADR amendment in A.1.

---
