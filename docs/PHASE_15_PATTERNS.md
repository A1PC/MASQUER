# Phase 15 — Recurring Polish Patterns

Distilled from sub-projects #4 Coin-flip through #10.v2 American Bingo. Each per-game upgrade follows the same recipe; this doc is the checklist + the standard idioms so future sub-projects (#11 Plinko, #12.v1-v3 Poker, #13 Craps, #14 Admin, #15 Final integration) can scope + plan in a fraction of the time the early ones took.

This is descriptive (what we've actually been doing), not prescriptive — a sub-project can deviate when there's a good reason.

---

## 1. The standard per-game upgrade scope

Every per-game sub-project (4–13) ships these patterns. Lottery and Bingo also ship without a `GameShell` wrapper and use the manual-retrofit variant; everything else uses `GameShell` props.

### 1.1 Title

- `MASQUER · <Game>` as the page title.
- Replace any emoji/all-caps prefix (e.g. `🎰 SLOTS` → `MASQUER · Slots`).
- Game-state subtitle (e.g. variant + difficulty) renders quieter below — `text-xs text-ivory/55`.

### 1.2 LobbyButton + OddsInfoBox header

- `<LobbyButton />` from `@/games/_shared/LobbyButton` — absolute top-left.
- `<OddsInfoBox>...</OddsInfoBox>` from `@/games/_shared/OddsInfoBox` — absolute top-right.
- Content: a tight payout summary (e.g. `Player 1:1 · Banker 1:1 (−5%) · Tie 8:1 · Pairs 11:1 · Big 0.54:1 · Small 1.5:1 · Dragons 30:1`).
- `GameShell` flex-row from #238 handles positioning. Pages without `GameShell` (Lottery, Bingo) manually `absolute left-4 top-4 z-20` + `absolute right-4 top-4 z-20`.

### 1.3 RulesModal

- `<RulesButton />` bottom-left (from `@/games/_shared/RulesButton`), opens `<RulesModal>` from `@/games/_shared/RulesModal`.
- Modal body has `max-h-[60vh] overflow-y-auto` (shipped in #230).
- Rules content lives in `src/games/<game>/rules.tsx` (or `<Game>Rules.tsx`), structured with `<h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">` headings + body `text-ivory/85`.
- Sections covered: Object · Card values / setup · Payouts table · Special rules / variants · House edge / RTP if applicable.

### 1.4 Brand tokens (Velvet Deco)

Tokens-only Tailwind in rebuilt files. Raw hex is acceptable ONLY for variant-intrinsic colours (e.g. bingo's 5-column BINGO palette) — comment why if you keep them inline.

Standard pairings:

| Surface                         | Token                                                     |
| ------------------------------- | --------------------------------------------------------- |
| Felt / table backdrop           | `bg-felt-table` / `bg-felt-table-deep`                    |
| Card panel / sidebar / overlay  | `bg-velvet` / `bg-velvet-deep`                            |
| Border / hairline               | `border-brass` / `border-brass/60` / `border-brass/40`    |
| Body text                       | `text-ivory` / `text-ivory/85` / `text-ivory/55`          |
| Display heading / value         | `text-gold` / `text-gold-bright`                          |
| Loss / negative tone            | `text-casino-red` / `bg-velvet` (the brand red)           |
| Win tone                        | `text-chip-win`                                           |
| Jackpot signature               | `bg-jewel-magenta` (use sparingly — Slots / Bingo tier-3) |
| Scoreboard semantics (Baccarat) | `bg-scoreboard-banker / -player / -tie`                   |
| Roulette pocket colours         | `bg-roulette-pocket / -red / -green`                      |

### 1.5 useSound integration

Wire `useSound` from `@/systems/sound/useSound`. The standard event taxonomy:

| Event                     | Sample        | Notes                                    |
| ------------------------- | ------------- | ---------------------------------------- |
| Chip placed on table      | `chip.place`  | Every bet commit                         |
| Card flip / deal          | `card.deal`   | Every card landing                       |
| Wheel / reel spin start   | `wheel.spin`  | Roulette, slots                          |
| Reel stop                 | `reel.stop`   | Per reel landing                         |
| Ball drop (lottery/bingo) | `ball.drop`   | Per ball reveal                          |
| Win — small               | `win.small`   | Standard wins, ≤2× bet                   |
| Win — medium              | `win.medium`  | Solid wins, 2-20×                        |
| Win — jackpot             | `win.jackpot` | Naturals, tier-3, Charlie, big side bets |
| Loss / bust               | `loss`        | Net negative round                       |

All gated on `useEffectiveReducedMotion` from `@/motion/useEffectiveReducedMotion` — reduced-motion users hear no audio.

Cadence guardrails:

- Fast-call games (Hard-difficulty bingo, multi-ball plinko, etc.) — debounce or coalesce so you never play >5 sounds per second.
- Reduced-motion = single batched sound per natural batch (e.g. one `card.deal` for an initial-deal stagger).

### 1.6 Scrollable modal pattern

Anywhere a modal/popover body can grow tall — `max-h-[60vh] overflow-y-auto` on the body container. Standard application points across the suite:

- Rules modal
- End-of-round summary screens with many tiers / cards
- Variant choosers
- Lucky-dip generators
- Ticket carts
- Recent-spins / recent-rounds tables

Brand-token chrome on the modal frame: `bg-velvet-deep` + `border-brass/60` + `text-ivory` body.

### 1.7 Animation polish via `useEffectiveReducedMotion`

The "dramatic reveal" pattern (used on lottery hero balls, bingo ball-call, roulette wheel-spin, blackjack card-deal, slots reel-stop):

```ts
const reduced = useEffectiveReducedMotion();
// Framer Motion variant
const reveal = reduced
  ? {
      /* instant — no animation */
    }
  : {
      initial: { scale: 0.6, opacity: 0 },
      animate: { scale: [0.6, 1.05, 1], opacity: 1 },
      transition: { duration: 0.4, delay: i * 0.25, ease: [0.16, 1, 0.3, 1] },
    };
```

Plus a brief gold-glow flash via `shadow-gold-glow` token (or inline `shadow-[0_0_8px_rgba(232,189,109,0.6)]`) on the landed element.

Cap stagger: ~250 ms per item. For N items, total reveal ≤ N × 250 ms (and prefer ≤ 2 s total so the player isn't waiting).

### 1.8 Sticky / persistent bet (where applicable)

Slots #7 introduced `singleStepCommit` + `persistBetAcrossCommit` on `BettingPanel`. Use these when the game has a tight "tap to spin" cadence and the player benefits from keeping their bet across rounds. Coin-flip kept the two-step flow (different intent — bet is the moment, single-shot).

### 1.9 Admin page polish (per-game)

Each game gets / extends its admin page following the layout shipped in #236 (Roulette) → #242 (Slots) → #248 (Baccarat) → #258 (Bingo):

- **Top row**: 4 `StatCard`s — games played, house net (red if positive / green if negative), actual RTP, signature stat (jackpots hit / BINGO capture % / etc).
- **Hero chart**: a primary chart for the game's distribution (`PocketDistributionBar` / `SlotsCombinationBar` / `BaccaratWinnerBar` / `BingoVariantDifficultyBar` — all use `ChartTooltipShell` for tooltips).
- **Secondary panel(s)**: bonus economics / streak / side-bet hit rates / etc.
- **Recent rounds table (last 20)**: ordered by `playedAt` desc via load-all + sort-in-memory + slice-20 (per the #250 fix for the broken `.where(...).reverse().limit()` pattern).
- Tier badges in the recent table use brand-consistent colours (`scoreboard-*` / `roulette-pocket-*` / tier semantic tokens).

Add new aggregations to `src/systems/stats.ts` (additive only — never modify existing fns). Document any persisted-field gaps in the PR description (e.g. bingo #10.v1 noted `cardCount` isn't in `BingoRoundDetails`).

### 1.10 Chart tooltip consistency

All admin charts use `ChartTooltipShell` from `src/components/charts/ChartTooltip.tsx` (factored at #251). Either:

- `<Tooltip content={<DefaultChartTooltip />} />` for plain `{label: value}` charts, OR
- Custom-content + `ChartTooltipShell` wrapper for charts with formatters / multi-row bodies.

NEVER use Recharts' default `contentStyle` — it only styles the outer wrapper and the inner values render as default dark-on-dark.

---

## 2. Standing invariants (apply to every sub-project)

These come from CLAUDE.md + the umbrella's §4.4 — never violate:

1. **Pure logic untouched.** `src/games/<game>/{logic,bets,wheel,...}.ts` byte-stable. Polish is presentational + additive.
2. **Games sandbox preserved.** No `@/db` or `@/store` imports from `src/games/<game>/**` (lottery is the exception per ADR-0040).
3. **One `rounds` row per round** (ADR-0016). Exceptions: poker session (ADR-0041), craps table session.
4. **Integer money. No `Math.random()`.** ESLint enforces.
5. **Spec-first.** Update BUILD_GUIDE + any ADR amendment in the first commit; code follows.
6. **No CLAUDE.md edits.**
7. **TS strict + exactOptionalPropertyTypes.** Optional fields via `{...(cond ? {key: val} : {})}` spread, never `key: undefined`.
8. **Commit subject ≤ 100 chars** (commitlint header-max-length; captured in `feedback-masquer-commit-subject-limit`).
9. **Commit scope**: use the game name (`blackjack` / `roulette` / etc.) for game-side, `admin` (NOT `admin-<game>`) for admin pages, `stats` for `src/systems/stats.ts`, `theme` for shared UI primitives. Full list: `reference-masquer-commitlint-scopes`.
10. **No `--no-verify`. No `--amend`.** Soft-reset + new commit if you need to rewrite.
11. **DoD per PR:**
    ```
    pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
    ```
12. **Tokens-only Tailwind** in rebuilt files. New tokens only if a clear semantic doesn't have a brand equivalent.

---

## 3. Sub-project workflow

Every sub-project follows the 4-step cycle:

1. **Spec PR** at `docs/superpowers/specs/YYYY-MM-DD-phase-15-N-<game>-design.md`. Decisions locked here.
2. **Plan PR** at `docs/superpowers/plans/YYYY-MM-DD-phase-15-N-<game>-plan.md`. Bite-sized tasks with code stubs inline (per `feedback-planning-depth`).
3. **Implementation PR(s)** — usually one, sometimes two if there's a non-trivial admin-page or schema-migration component (Roulette #6 split into chrome + admin; Baccarat #8 too).
4. User says "start next" → controller starts the next sub-project per `feedback-phase15-game-sub-project-order` (release-order ranking + `x.vN` for variant splits).

Plan PR + implementation PR run in parallel — plan-CI monitor + implementer-subagent dispatched at the same time, plan merged server-side when CI clears (without disturbing the implementer's working tree).

---

## 4. Variant splits (multi-variant games)

Per `feedback-phase15-game-sub-project-order`:

- Multi-variant games split into `x.vN` sub-projects (Bingo = 10.v1 British + 10.v2 American; Poker = 12.v1 Hold'em + 12.v2 Five-Card Draw + 12.v3 Omaha).
- **v1 ships ALL shared chrome + variant-1-specific bits.**
- **v2+ ships variant-N-specific bits only.** Inherits chrome for free.
- User says "start next" between each `vN` (don't queue them all at once).

This is the pattern Bingo 10.v1 → 10.v2 used: v1 did MASQUER title / LobbyButton / OddsInfoBox / brand tokens / sound / rules modal / scrollable / admin stats, v2 added just B-I-N-G-O headers + free-centre polish.

---

## 5. Common deviations + fixes

A pattern of issues caught after shipping. Future sub-projects should watch for these:

- **`.where(...).reverse().limit()` on Dexie ties-break by primary key, not chronological.** Always use load-all + sort-by-playedAt + slice-20 for "recent rounds" queries (#250).
- **Recharts default `contentStyle` only colours the outer wrapper.** Always use a custom `<Tooltip content={...}>` with `ChartTooltipShell` (#251).
- **Admin scope is `admin`, NOT `admin-<game>`.** Bit Bingo v1 (#255 implementer used `admin-lottery`, had to be reset-rewritten).
- **Commit subject ≤ 100 chars.** Long batch-fix commits enumerating 3-5 changes hit the limit (caught at #228 and #231). Push detail into the body.
- **Markdown lint MD055/MD056/MD058** trips on tables nested inside list items. Either un-nest the table OR convert it to a prose list (#257).
- **Implementer subagents sometimes use `bg-jewel-magenta` for "winning" cells where users would prefer gold** (caught in Bingo daubs — #259). Default to gold for daubed-cell signatures; reserve `jewel-magenta` for true jackpot moments.
- **Page-level Dexie writes from `rounds.details` should match the shape the page renders** — Baccarat admin used the in-memory `RoundResult` type (nested `player.total`) when the persisted shape is flat (`playerTotal`); crashed at runtime (#249). Always define a `Persisted<Game>Details` interface mirroring what the page actually writes.

---

## 6. Tools + references

- **Spec + plan templates**: see `docs/superpowers/specs/2026-05-26-phase-15-9-lottery-design.md` + plan as the most complete reference example.
- **Shared shell primitives**: `src/games/_shared/{LobbyButton,OddsInfoBox,RulesButton,RulesModal,BettingPanel,ChipDenominationButton,GameShell}.tsx`.
- **Shared chart wrappers**: `src/components/charts/{ChartTooltip,PocketDistributionBar,SlotsCombinationBar,BaccaratWinnerBar,BingoVariantDifficultyBar,...}.tsx`.
- **Sound engine**: `src/systems/sound/{engine,ids,useSound}.ts` + samples at `src/assets/audio/`.
- **Motion**: `src/motion/useEffectiveReducedMotion.ts`.
- **Brand tokens**: `src/theme/tokens.ts` + `tailwind.config.ts`.
- **Brand marks**: `src/components/brand/{MaskMark,PlayingCard,Wordmark}.tsx`.

---

## 7. Progress snapshot (regenerate at major milestones)

As of 2026-05-26:

- **10 of 16 sub-projects shipped** (0–10.v2 done).
- **5 sub-projects + 1 final integration to go**: #11 Plinko, #12.v1–v3 Poker, #13 Craps, #14 Admin overhaul, #15 Final integration & launch polish.
- **64+ PRs shipped** across Phase 15 (incl. fix/polish iterations).
- **2378 tests passing** at the most recent merge (#264).
- **Latest tag**: pending `v0.15.10-bingo` (this housekeeping cycle).

See the umbrella roadmap progress table for the live status: `docs/superpowers/specs/2026-05-22-phase-15-umbrella-roadmap-design.md` §8.
