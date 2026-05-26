# Phase 15 sub-project #9 — Lottery upgrade

**Status:** Draft for user review.
**Date:** 2026-05-26.
**Sub-project:** #9 in the Phase 15 umbrella (`2026-05-22-phase-15-umbrella-roadmap-design.md`). Per release order, follows #8 Baccarat ✅, precedes #10 Bingo (British / American).
**Original release:** Phase 10 (`v0.10-lottery`, 2026-05-19). Pick-5+1 daily lottery with strict 20:00 local draw + idempotent backfill, 4 Dexie tables (lotteryDraws / lotteryTickets / lotteryLines / lotteryFavorites), `systems/lottery.ts` (logic + system; ADR-0040 — not a games-sandbox citizen), LotteryPage (HeroSection + NumberGrid + TicketCart + FavoritesDropdown + HistorySlide + YourTicketsSlide + DrawAnimationModal), Sidebar 🎟️ LOTTERY + unread dot, AdminLotteryPage (4 stat cards + 2 frequency charts + recent draws), 1M jackpot, ~43% RTP, match-2 free re-entry.
**Scope answer:** _Pure re-skin + draw-reveal sound polish + dramatic ball reveal + scrollable modals + admin consistency + new economy (20M jackpot, 2-credit ticket)._

---

## 1. Goal

Bring the daily lottery to the MASQUER / Velvet Deco bar with the now-standard polish patterns. Most of the game stays as-is — the 20:00 draw, the backfill, the match-2 free re-entry, the 4 Dexie tables, the `systems/lottery.ts` module all stay intact. The work is:

1. **Visual rebuild** — tokenize colours, retrofit `LobbyButton` + `OddsInfoBox` into the custom hero (no `GameShell` wrapper exists for lottery), MASQUER · Lottery title.
2. **Scrollable modal pattern** — apply `max-h-[60vh] overflow-y-auto` (the pattern from #230's `RulesModal`) to the add-lucky-dip menu, the buy/ticket-click menu, and the lucky-dip reveal modal so long content scrolls instead of overflowing.
3. **Dramatic ball reveal** — restyle the hero's drawn balls (currently flat) into a colourful brand-themed display with a dramatic ball-by-ball reveal animation (one ball at a time, scale-in + glow flash, ~250 ms each). Reuse `useEffectiveReducedMotion` for the instant-fallback.
4. **Sound integration** — wire `useSound` for `ball.drop` per ball in the draw modal, `chip.place` on ticket buy, win-tier stingers on settle.
5. **Admin polish** — restyle `/admin/lottery`'s recent-draws table to match the brand-consistent pattern (post-#250 / #251 — pocket-style or winner-style coloured row badges, the new ChartTooltipShell from #251 already applies). Confirm the `.where(...).reverse()` ordering bug (fixed for roulette / baccarat / slots in #250) doesn't repeat here.
6. **Rewrite rules into the shared `RulesModal`** — lottery currently has no rules popover. Add one (the bottom-left RULES button pattern + scrollable modal) covering pool sizes / payout table / draw timing / backfill / match-2 re-entry.
7. **New economy** — bump `LINE_COST` from 10 → **2 chips**, bump 5+bonus jackpot from 1,000,000 → **20,000,000 chips**. Other tier payouts (5 / 4+bonus / 4 / 3+bonus / 3) unchanged. **⚠ RTP shift — see §8.**

The rest of the system (draw RNG, payouts table for non-jackpot tiers, daily 20:00 clock, settleMissedDraws backfill, favorites CRUD, unread-dot) stays byte-stable.

---

## 2. Decomposition

**Single PR.** Lottery already has its own `/admin/lottery` page from Phase 10 — no admin PR B needed. Single PR mirrors the Slots #7 pattern.

---

## 3. Standing invariants

1. **Pure logic mostly untouched.** `systems/lottery.ts` keeps: `draw()` RNG, `tierFor()` matcher, `settleMissedDraws()` backfill, `buyTicket()` flow, favorites CRUD, admin queries. The ONLY changes are two constants: `LINE_COST` (10 → 2) and the `payoutFor('5+bonus')` jackpot value (1,000,000 → 20,000,000). Tests for those two cases get updated; everything else stays.
2. **ADR-0040** (lottery as system, not games-sandbox citizen) is preserved. Lottery still imports freely from `@/db` and `@/store` because it IS a system.
3. **One rounds row per evaluated line** (per §7.4 of the Phase-10 decision matrix). Unchanged.
4. **20:00 daily draw + backfill** — unchanged.
5. **Match-2 free re-entry** — unchanged semantically. Since `REENTRY_VALUE = LINE_COST` today, dropping `LINE_COST` to 2 means a re-entry is worth 2 chips. That's the cleanest semantics ("a free ticket equals a current line cost"); preserve the tie.
6. **Dexie schema** — no version bump. The 4 tables (lotteryDraws / lotteryTickets / lotteryLines / lotteryFavorites) stay as-is.
7. **Integer money. No `Math.random()`.** ESLint enforces.
8. **No CLAUDE.md edits.**
9. **Commitlint header-max-length 100** — feedback memory `feedback-localgamble-commit-subject-limit`.

---

## 4. Scope (single PR)

### 4.1 Title + shared shell retrofit

Lottery doesn't use `GameShell` (it's a top-level page, not under a game-cabinet wrapper). Manually retrofit:

- **MASQUER · Lottery** title in the hero (replaces whatever the current heading is — likely just "Daily Lottery" or similar).
- **`<LobbyButton />`** from `@/games/_shared/LobbyButton` rendered absolute top-left of the page (mirror the `GameShell` flex-row pattern from #238 manually).
- **`<OddsInfoBox>`** from `@/games/_shared/OddsInfoBox` rendered absolute top-right. Contents: `Jackpot 20M · 5 500K · 4+B 100K · 4 10K · 3+B 2K · 3 100 · 2 free re-entry`.
- **Rules button** — bottom-left, opening the `<RulesModal>` (shared, already supports scrollable body from #230). Covered in §4.7.

### 4.2 Visual rebuild (brand pass)

Tokenize colours across:

- `LotteryPage.tsx`
- `HeroSection.tsx`
- `NumberGrid.tsx`
- `TicketCart.tsx`
- `HistorySlide.tsx`
- `YourTicketsSlide.tsx`
- `FavoritesDropdown.tsx`
- `DrawAnimationModal.tsx`

Replace raw hex with brand tokens: `bg-felt-table` / `bg-felt-table-deep`, `text-ivory`, `text-gold` / `text-gold-bright`, `border-brass`, `bg-velvet` / `bg-velvet-deep`, `bg-jewel-magenta` for jackpot signature surfaces. Ball colours per pool: bonus ball gets the `jewel-magenta` (signature pop); main balls get a `bg-velvet` → `bg-brass` gradient via Tailwind utilities. New tokens added only if a clear brand-equivalent doesn't exist (implementer judgment).

### 4.3 Scrollable prompt boxes (the user's specific request)

Wherever lottery currently renders a popup / modal / drawer / slide that can grow tall, cap its body at `max-h-[60vh]` and enable `overflow-y-auto` (the pattern shipped in #230's `RulesModal`). At minimum:

- **Add-lucky-dip menu** — the prompt where the player chooses how many lucky-dip lines to add.
- **Buy / ticket-click menu** — the modal that opens when the player clicks an existing ticket or the buy CTA.
- **Lucky-dip reveal menu** — the modal that shows the freshly-generated numbers.
- **DrawAnimationModal** — already has a fixed structure; verify its content scrolls cleanly when many tiers hit.

Apply the same brand-token treatment to each modal's chrome (`bg-velvet-deep`, `border-brass/60`, ivory body text). A small scroll-shadow (mask-image fade) is nice-to-have, not required.

### 4.4 Dramatic ball-reveal animations on the hero

The hero shows the winning balls once a draw has happened. Today the reveal is flat. New behaviour:

- **6 winning slots** on the hero (5 main + 1 bonus). Pre-draw they show neutral "?" placeholders.
- **On draw reveal** (DrawAnimationModal open OR hero refresh after backfill): balls reveal one by one with a ~250 ms stagger — each ball scales in from 0.6 → 1.05 → 1.0, gets a brief gold-glow flash (`shadow-gold-glow`), and lands.
- **Visual treatment**: each ball is a circular bg-velvet-deep with a brass border, ivory body text for the number, gold-glow on the bonus ball + a subtle magenta ring to differentiate.
- **`useEffectiveReducedMotion` short-circuit**: all balls appear simultaneously, no animation. Sound `ball.drop` per ball in normal mode; one batched sound in reduced-motion.
- **Persistence**: once a draw is revealed, the balls stay shown statically. Animation only fires on the FIRST reveal per draw (use a ref tracking the last-revealed `drawId`).

The DrawAnimationModal (which already exists and animates ball-by-ball) should adopt the same per-ball visual treatment so the modal → hero hand-off looks consistent.

### 4.5 Sound

Wire `useSound`:

| Event                                     | Sample                       | Notes                                                     |
| ----------------------------------------- | ---------------------------- | --------------------------------------------------------- |
| Chip click on a ticket / buy              | `chip.place`                 | Reuse                                                     |
| Each ball drop in DrawAnimationModal      | `ball.drop`                  | NEW or reuse — was added for craps; check `gen-audio.mjs` |
| Hero ball reveal (per ball)               | `ball.drop`                  | Same as above                                             |
| Tier celebration small / medium / jackpot | `win.small/.medium/.jackpot` | Reuse — `jackpot` reserved for 5 / 5+bonus only           |
| Loss (no tier)                            | `loss`                       | Reuse                                                     |
| New unread draw available                 | n/a                          | Skip — unread dot is silent                               |

All gated on `useEffectiveReducedMotion` (no audio on reduced).

### 4.6 Admin polish — `/admin/lottery`

Bring `AdminLotteryPage` to the brand-consistent bar:

- **Recent draws table** — restyle to match the brand-consistent pattern (post-#250). Use the same coloured-badge approach: a tier badge for each draw's biggest hit (None / 3 / 4 / 5 / 5+bonus), `text-ivory` body, tabular-nums for chips.
- **Ordering fix**: confirm the recent-draws query doesn't use `.where(...).reverse().limit(...)` — if it does, switch to `.toArray()` + in-memory sort by `playedAt`/`drawDate` desc (the same bug fixed for roulette/baccarat/slots in #250).
- **Chart tooltips**: `NumberFrequencyBar` already migrated to the new shell in #251. No further change.
- **No new aggregations** — the existing 4 StatCards + 2 frequency charts are enough. Optional: add a small "biggest single jackpot" StatCard. Implementer's call; default to no.

### 4.7 Rules — add a Rules button + RulesModal

Lottery doesn't have a rules popover today. Add the bottom-left RULES button + `<RulesModal>` (the shared component from #230 — scrollable body, brand-token chrome).

Rules content sections:

- **Object** — Pick 5 numbers (1–50) + 1 bonus (1–10). Daily draw at 20:00 local.
- **Tickets** — 2 chips per line. Up to N lines per ticket (verify current cap).
- **Lucky dip** — generates a random line.
- **Payouts** — table per tier (5+bonus 20M, 5 500K, 4+bonus 100K, 4 10K, 3+bonus 2K, 3 100, 2 free re-entry).
- **Match-2 free re-entry** — a match-2 grants a free ticket on the next draw (worth 2 chips).
- **Backfill** — if the app is closed when a draw fires, missed draws settle in chronological order on next open.
- **Favorites** — save number sets you reuse.

### 4.8 New economy

**Two constants change in `systems/lottery.ts`:**

```ts
const LINE_COST = 2;           // was 10
// in payoutFor()
case '5+bonus': return 20_000_000;  // was 1_000_000
```

`REENTRY_VALUE` is already `= LINE_COST`, so it tracks automatically (a free re-entry = a free 2-chip ticket).

**Test updates:** `systems/lottery.test.ts` — any test that asserted `LINE_COST === 10` or `payoutFor('5+bonus') === 1_000_000` or RTP-adjacent math needs updating.

**BUILD_GUIDE §10.5** needs updating to reflect the new economy.

**⚠ RTP shift — flagged for your confirmation in §8.**

### 4.9 Out of scope (deferred docket items)

- Subscription tickets (auto-buy favorites daily) — stays in docket.
- Lottery-specific leaderboards — stays in docket.
- Multi-user prize pools / pari-mutuel — N/A for single-user local app.
- Larger admin expansions (date filters, CSV export, per-user breakdowns).
- Haptic feedback on draw reveal (could ship later if the visual + audio polish needs more punch).

### 4.10 Scope guardrails

**Allowed paths:**

- `src/pages/lottery/**` (all UI files + tests)
- `src/pages/admin/AdminLotteryPage.tsx` + test (recent-draws restyle only — no aggregation changes)
- `src/systems/lottery.ts` + test (LINE_COST + jackpot constant changes only — no logic structure changes)
- `BUILD_GUIDE.md` §10.5 (economy notes)
- `tailwind.config.ts` + `src/theme/tokens.ts` (only if a new lottery-specific token is genuinely needed)

**Not allowed:**

- `src/games/**` (other games untouched).
- New Dexie tables / schema bumps.
- `src/components/charts/**` (already polished in #251).
- ADR-0040 semantic changes (only an amendment note possible).

---

## 5. Sub-project workflow

Per the umbrella's §6 cycle:

1. **Spec PR** — this doc.
2. **Plan PR** — implementation plan with inline code stubs.
3. **Implementation PR** — single PR (no PR B since admin is small).
4. Await user's "start next" for #10 Bingo (split into 10.v1 British + 10.v2 American per the umbrella's variant rule).

---

## 6. Testing strategy

- **Pure logic** (`systems/lottery.test.ts`) — update LINE_COST + jackpot tests; everything else passes.
- **Page tests** — update for new title, LobbyButton + OddsInfoBox presence, sound mocks, new ball-reveal animation contract.
- **Modal tests** — assert `max-h-[60vh]` + `overflow-y-auto` on the relevant modal bodies.
- **Admin test** — recent-draws table renders with new badge pattern.
- **DoD**: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`

---

## 7. Risks + open items

- **Ball-reveal animation timing** — staggering 6 balls at ~250 ms each ≈ 1.5 s total. Pleasant but not slow. Verify against `useEffectiveReducedMotion`.
- **DrawAnimationModal vs hero reveal** — both surfaces show winning balls. The modal already animates ball-by-ball; the hero should match the modal's animation feel so the transition modal-close → hero-shows-balls feels continuous. Implementer should verify by booting dev.
- **Sound cadence** — 6 `ball.drop` sounds in 1.5 s could feel busy. If yes, ease cadence (e.g. 300 ms stagger) or lower sample volume in `gen-audio.mjs`. Implementer judgment.
- **RTP shift** — see §8.

---

## 8. ⚠ RTP shift — please confirm

The current economy (`LINE_COST=10`, jackpot=1M) yields ~43% RTP (per the Phase-10 spec). The requested change (`LINE_COST=2`, jackpot=20M) shifts the math substantially:

| Tier                | Probability\*  | Old payout    | Old EV/ticket | New payout   | New EV/ticket |
| ------------------- | -------------- | ------------- | ------------- | ------------ | ------------- |
| 5+bonus             | ~1/21.2M       | 1,000,000     | ~0.047        | 20,000,000   | ~0.944        |
| 5                   | ~9/21.2M       | 500,000       | ~0.212        | 500,000      | ~0.212        |
| 4+bonus             | ~225/21.2M     | 100,000       | ~1.061        | 100,000      | ~1.061        |
| 4                   | ~2,025/21.2M   | 10,000        | ~0.955        | 10,000       | ~0.955        |
| 3+bonus             | ~12,150/21.2M  | 2,000         | ~1.147        | 2,000        | ~1.147        |
| 3                   | ~109,350/21.2M | 100           | ~0.516        | 100          | ~0.516        |
| 2 (re-entry)        | ~328,050/21.2M | 10 chip value | ~0.155        | 2 chip value | ~0.031        |
| **Total EV/ticket** |                |               | **~4.09**     |              | **~4.87**     |
| **Ticket cost**     |                |               | **10**        |              | **2**         |
| **RTP**             |                |               | **~41%**      |              | **~243%**     |

_Rough probabilities from `C(50,5) _ 10 = 21,187,600` for the full pool.

**The proposed economy means the house loses ~143 chips per 100 wagered.** That's a player-favourable lottery on net, driven primarily by the 5x ticket-cost drop (the 20M jackpot is only ~9% of EV/ticket on its own; the cost change dominates).

**Three reasonable resolutions — pick one before I write the plan:**

- **A) Keep as requested.** Ship 20M jackpot + 2-chip ticket as a deliberately-generous play-money lottery. (Acceptable for a play-money app; just be aware.)
- **B) Keep 20M jackpot, bump ticket cost.** E.g. ticket = 12 chips (matches roughly the old RTP). Most directly preserves the original `~43%` design intent while delivering the dramatic jackpot.
- **C) Different numbers entirely.** Tell me what RTP target you want, and I'll back-solve the ticket cost.

I'll lock the plan once you pick. Recommend (A) explicitly if you're fine with a generous lottery, otherwise (B).

---

## 9. Self-review

1. **Placeholder scan**: none.
2. **Internal consistency**: single-PR scope, logic invariants spelled out, the only logic-side changes are two constants.
3. **Scope check**: bounded — most files are touched cosmetically; only `systems/lottery.ts` and its test get logic-level changes.
4. **Ambiguity check**: RTP shift is the biggest open question — explicitly raised in §8.

---
