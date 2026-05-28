# Phase 10 — Daily Lottery (design spec)

> Single-source design for the daily Pick-5+1 lottery. Hand to writing-plans next.

## 1. Goal

Add a daily lottery game (`/lottery`) where every local user shares a single Pick-5+1 draw per calendar day. The draw is deterministic per date so all users see the same numbers regardless of when they open the app. Tickets are 10 chips per line; one ticket can contain many lines; one user can buy many tickets per draw. The mechanic adds a passive engagement loop on top of the existing table games.

## 2. In scope

- `src/systems/lottery.ts` — pure draw + evaluator + lucky-dip + uniqueness logic
- `src/pages/lottery/LotteryPage.tsx` (and child components) — full UI for ticket purchase, history, hero
- Dexie v3 schema additive bump: `lotteryDraws`, `lotteryTickets`, `lotteryLines`, `lotteryFavorites`
- Strict-clock daily scheduler + backfill on app open + draw reveal modal
- Lucky-dip flow with hidden numbers until purchase confirmation
- Within-ticket line uniqueness (manual + lucky-dip combined)
- Favorite number sets (save / load / rename / delete)
- Lobby tile with live countdown and last-draw preview
- Sidebar `🔴 NEW DRAW` indicator dot for unread draw results
- HERO area on LotteryPage: countdown pre-draw → big winning balls post-draw
- Per-line settle writes one `rounds` row each (BUILD_GUIDE rule 7) so lottery wins flow into existing /stats and /leaderboard
- Admin page `/admin/lottery` with 4 stat cards + 2 number-frequency bar charts + recent-draws table
- 1 ADR (ADR-0040 — lottery as system, not games-sandbox citizen)

## 3. Out of scope

Moved to `[[masquer-deferred-features]]` memory for re-evaluation before Phase 15 Polish.

- Multi-user prize pools / pari-mutuel splitting
- Subscription tickets (auto-buy same numbers every day)
- Lottery-specific leaderboards (lottery wins flow into existing boards via `rounds`)
- Sound + haptics on draw reveal (defaults to Phase 15 polish pass)
- Service-worker push notifications when a draw runs while app is closed (browser permission cost too high for solo offline app)
- Multi-machine sync of draws across devices (offline-only app)

## 4. Page structure

### 4.1 LotteryPage layout (top → bottom)

1. **HERO** — swaps based on draw state for the most recently scheduled draw:
   - **Pre-draw** (today's draw hasn't run yet): full-width centered countdown clock to the next scheduled draw. Format: `HH:MM:SS`. Updates every second.
   - **Post-draw** (today's draw has been run, ≤ 24h ago): the 5 main numbers + 1 bonus rendered as **big number balls** (e.g. 96 × 96 px gold-edged circles with the digit centered). Below the balls, a smaller `Next draw in HH:MM:SS` countdown to tomorrow's draw.
   - **Day rollover** (next day's draw hasn't run yet, but yesterday's results are still recent): show yesterday's balls (smaller, faded) + today's countdown prominent.

2. **Buy a Ticket** — split into two columns on `md+` screens, stacked on mobile:
   - **Left:** 5×10 number grid (1-50) + 1×10 bonus row + Quick selector buttons (`Save as Favorite` / `Load Favorite ▾` / `Clear`) + "Add Line" button
   - **Right:** Current-ticket cart showing each line (manual lines show numbers; lucky-dip lines show `🎰 LUCKY DIP` placeholder), total line count, total cost, "Add Lucky Dip" button, "Buy Ticket" CTA

3. **History slide** — scrollable list of past 30 draws (newest first) with infinite-scroll loader to load earlier draws on demand. Each row collapses to: date + winning numbers (small balls) + "Lines: N" + "Won: ±X chips". Click a row to expand into per-line detail (each of your lines for that draw + which numbers matched + tier won).

### 4.2 Lobby tile

The existing lobby grid (Phases 2+) gets a `🎟️ Daily Lottery` tile alongside the games. Tile shows:

- Today's draw status: `Tickets open` / `Tickets close in HH:MM` / `Draw in HH:MM` / `Drawn: 5 - 17 - 23 - 31 - 44 • Bonus 7`
- Hover/focus reveals: "Your tickets: N • Your winnings today: X chips" if you have lines in the draw

Click navigates to `/lottery`.

### 4.3 Sidebar entry

`Sidebar.tsx` gets a `🎟️ LOTTERY` entry under the games list. When a new draw has run since the user last visited `/lottery`, a `🔴` dot appears next to the entry. Dot clears on visit.

### 4.4 No view-mode toggle

Lottery does not use the Cards/Graphs toggle from Phase 7 — it has its own distinct view model (HERO + cart + history slide).

## 5. Game mechanics

### 5.1 Picks

- **5 main numbers** chosen from 1–50 (no duplicates within a single line)
- **1 bonus number** chosen from 1–10 (independent of main pool)
- **Total combinations**: `C(50,5) × 10 = 2,118,760 × 10 = 21,187,600`

### 5.2 Line vs ticket vs draw

- **Line** = one 5+1 number set; the unit of entry into a draw
- **Ticket** = a single purchase event; contains one or more lines bought together
- **Draw** = the daily 5+1 reveal that determines winners

Each line costs **10 chips** regardless of how it was added (manual or lucky-dip). A ticket of N lines costs `N × 10` chips.

### 5.3 Buy rules

- A user may buy **unlimited tickets per draw**, capped only by wallet balance
- A user may add **unlimited lines per ticket** (subject to the within-ticket uniqueness rule below)
- A user may add **unlimited lucky dips per ticket** (subject to same uniqueness rule)
- Within ONE ticket, all lines must be distinct (5+1 tuple comparison). Manual line duplicates are blocked at "Add Line" time; lucky-dip generator retries until unique.
- Across DIFFERENT tickets, duplicates are allowed (each ticket is independent)

### 5.4 Lucky dip flow

1. User clicks `Add Lucky Dip` — a placeholder line appears in the cart marked `🎰 LUCKY DIP` with no numbers visible
2. User can repeat (add many lucky dips) and intersperse with manual lines
3. At `Buy Ticket` press:
   - Manual lines are validated for duplicates → block + inline error message if any
   - Each lucky-dip placeholder generates numbers via `generateLuckyDipLine(existingLines)`, retrying until distinct from all already-committed lines on this ticket
   - `wallet.placeBet({ amount: lineCount × 10, ... })` debits the chips
   - One `lotteryTickets` row + N `lotteryLines` rows inserted in a single Dexie transaction
4. **Reveal animation modal** appears:
   - Manual lines render immediately (numbers visible)
   - Lucky-dip lines flip one at a time, revealing their generated numbers
   - Modal can be skipped (`prefers-reduced-motion` short-circuits to instant reveal)
5. Cart clears; ticket appears in the history slide

### 5.5 Favorites (save / load number sets)

- `Save these numbers` button next to the manual picker — disabled until a valid 5+1 selection is made
- Save prompt asks for an optional name (default: `My Numbers <N>` where N is one greater than existing count for this user)
- `Load Favorite ▾` dropdown above the picker; selecting one populates the grid; user can tweak before adding to cart
- Each favorite is a `lotteryFavorites` row scoped to `userId`
- Favorites also have `Rename` and `Delete` actions in the dropdown (small icon buttons per row)
- No hard cap on favorites; soft warn at 50 ("You have a lot of favorites — consider tidying up.")

### 5.6 Free re-entry (match-2 reward)

When a line settles with **exactly 2 main matches** (regardless of bonus match), the user is granted a **free re-entry** for the next scheduled draw:

- A new `lotteryLines` row is inserted with `isFreeReentry: true`, `sourceLineId` pointing at the settling line, fresh random numbers (uniqueness within the new ticket is enforced; in practice a free-re-entry ticket has exactly 1 line)
- A new `lotteryTickets` row with `totalCost: 0`, `lineCount: 1` wraps that line
- Free re-entries do NOT cost chips and do NOT count against any future cap
- The draw modal explicitly calls out the free re-entry: "Match 2 — Free ticket for tomorrow's draw!"

### 5.7 Payout tiers

Calculated targeting ~43% RTP with a 1M jackpot anchor.

| Match            | Payout                     | Probability     | EV / 10-chip line |
| ---------------- | -------------------------- | --------------- | ----------------- |
| **5 + bonus** 🏆 | 1,000,000 chips            | 1 in 21,187,600 | 0.047             |
| 5                | 500,000 chips              | 1 in 2,354,178  | 0.212             |
| 4 + bonus        | 100,000 chips              | 1 in 94,167     | 1.062             |
| 4                | 10,000 chips               | 1 in 10,463     | 0.956             |
| 3 + bonus        | 2,000 chips                | 1 in 2,140      | 0.943             |
| 3                | 100 chips                  | 1 in 238        | 0.421             |
| 2 + bonus        | 🎟️ free re-entry next draw | 1 in 149        | (auto-ticket)     |
| 2                | 🎟️ free re-entry next draw | 1 in 16.6       | (auto-ticket)     |
| ≤1               | nothing                    | —               | —                 |

Chip-only RTP ≈ 43.1%. With free re-entries the realized RTP rises modestly above that (each re-entry is a fresh draw entry, but most do not win, so it's a small bump). Overall: a winning line about 1 in 14 draws; a meaningful chip win (≥ 100) about 1 in 220 draws.

## 6. Draw timing + backfill

### 6.1 Schedule

- **Daily draw at 20:00 local time** (user's machine local time)
- Ticket cutoff for today's draw: 19:59:59 local; at 20:00:00, new ticket purchases enter tomorrow's draw
- Draw `id` is the date string `YYYY-MM-DD` in user's local timezone

### 6.2 RNG seed

- For draw `YYYY-MM-DD`, RNG is seeded by `hash('masquer.lottery.' + 'YYYY-MM-DD')`. This makes the draw deterministic per date: all users on the same machine see the same numbers regardless of when they open the app.
- Seed → mulberry32 PRNG (already used by `src/systems/rng.ts`) → pick 5 distinct from [1,50] + 1 from [1,10]

### 6.3 Backfill on app open

`useLotteryBackfill()` hook runs once per app session at top of `LotteryPage` mount AND on initial app boot from `AppLayout`:

1. Read `lotteryDraws` for max-drawn-date and compare with today's local date
2. For every date between (last-drawn + 1) and today (exclusive of today if before 20:00, inclusive if after), in chronological order:
   - Compute draw numbers from the date seed
   - Insert a `lotteryDraws` row
   - Iterate all unsettled `lotteryLines` where `drawId = that date` — evaluate tier, set `payout`, `matchTier`, `settled: true`
   - For each match-2 line, insert a free-re-entry ticket + line for the next draw
   - For each settled line, write a `rounds` row per the rules in §7.4
3. If any draws were just settled, fire a `DrawAnimationModal` sequence that walks through each settled draw with the user's lines highlighted

### 6.4 DrawAnimationModal

- Backdrop overlay; cannot be backdrop-dismissed
- For each settled draw (in chronological order):
  - Reveal balls one at a time (~250ms gap, instant on `prefers-reduced-motion`)
  - For each of the user's lines in that draw, render an inline strip: line numbers with the matching ones lit up, tier name, win amount (or "Match 2 — Free entry for next draw!")
  - "Next draw →" button (or "Done" on the last one)
- Modal state persists across refresh-mid-modal (last-shown-draw saved in `localStorage.masquer.lottery.lastSeenDraw`); next session resumes from where left off

## 7. Persistence (Dexie v3 — additive)

### 7.1 New tables

```ts
lotteryDraws: '&id, drawAt'; // id = 'YYYY-MM-DD'
lotteryTickets: '&id, [userId+drawId], purchasedAt';
lotteryLines: '&id, [ticketId], [userId+drawId], [drawId+settled]';
lotteryFavorites: '&id, [userId+createdAt]';
```

### 7.2 Field shapes

```ts
type LotteryDraw = {
  id: string; // 'YYYY-MM-DD'
  drawAt: number; // epoch ms when the draw ran
  mainNumbers: number[]; // sorted asc, length 5
  bonus: number; // 1-10
  totalLines: number; // count of lines in this draw
  totalRevenue: number; // sum of all line costs (excludes free re-entries)
  totalPayout: number; // sum of all line payouts
};

type LotteryTicket = {
  id: string; // uuid
  userId: string;
  drawId: string; // FK -> lotteryDraws.id
  purchasedAt: number; // epoch ms
  totalCost: number; // chips debited (0 if a free re-entry wrapper)
  lineCount: number; // count of lines in this ticket
};

type LotteryLine = {
  id: string;
  ticketId: string; // FK -> lotteryTickets.id
  userId: string;
  drawId: string; // FK -> lotteryDraws.id (denormalized for index)
  mainNumbers: number[]; // sorted asc, length 5
  bonusNumber: number; // 1-10
  isLuckyDip: boolean; // was the line generated as a lucky dip?
  isFreeReentry: boolean; // was the line a match-2 reward?
  settled: boolean;
  matchTier: MatchTier | null; // '5+bonus' | '5' | '4+bonus' | '4' | '3+bonus' | '3' | '2+bonus' | '2' | null
  payout: number; // chip prize (0 if no win or free-re-entry)
  sourceLineId?: string; // for free-re-entry, the line that earned it
};

type LotteryFavorite = {
  id: string;
  userId: string;
  name: string;
  mainNumbers: number[]; // length 5
  bonusNumber: number; // 1-10
  createdAt: number;
};

type MatchTier = '5+bonus' | '5' | '4+bonus' | '4' | '3+bonus' | '3' | '2+bonus' | '2';
```

### 7.3 Migration

Dexie schema bump: `version(3).stores({ lotteryDraws, lotteryTickets, lotteryLines, lotteryFavorites })`. Existing tables untouched. No data migration needed (lottery starts empty).

### 7.4 Round-row writes (BUILD_GUIDE rule 7)

Decision matrix for when a settled `lotteryLines` row writes a `rounds` row, and with what values:

| Line kind     | matchTier                               | rounds row? | `betAmount` | `payout`            | `netChange` | `outcome` |
| ------------- | --------------------------------------- | ----------- | ----------- | ------------------- | ----------- | --------- |
| Paid          | 5+bonus / 5 / 4+bonus / 4 / 3+bonus / 3 | YES         | 10          | tier payout         | payout − 10 | `'win'`   |
| Paid          | 2+bonus / 2                             | YES         | 10          | 10 (re-entry value) | 0           | `'push'`  |
| Paid          | null (no match)                         | YES         | 10          | 0                   | −10         | `'loss'`  |
| Free re-entry | 5+bonus / 5 / 4+bonus / 4 / 3+bonus / 3 | YES         | 0           | tier payout         | payout      | `'win'`   |
| Free re-entry | 2+bonus / 2                             | NO          | —           | —                   | —           | —         |
| Free re-entry | null (no match)                         | NO          | —           | —                   | —           | —         |

Rationale:

- Paid match-2 is treated as a _push_ with implied re-entry value (the chip cost is virtually refunded as a re-entry credit, so net is zero). Keeps /stats RTP coherent.
- Free re-entry lines that don't pay cash (lose or match-2) write no `rounds` row — they're not "rounds the player committed to" and would bloat round counts without adding stat value. The chain continues silently.
- Free re-entry lines that DO pay cash get a `rounds` row with `betAmount: 0` so they show as pure-upside wins in /stats.

Row shape when written:

```ts
{
  userId: line.userId,
  game: 'lottery',                    // NEW Game enum value — see §8.4
  betAmount: <per matrix>,
  payout: <per matrix>,
  netChange: <per matrix>,
  outcome: <per matrix>,
  details: {
    drawId: line.drawId,
    mainNumbers: line.mainNumbers,
    bonusNumber: line.bonusNumber,
    drawMainNumbers: draw.mainNumbers,
    drawBonus: draw.bonus,
    matchTier: line.matchTier,
    isLuckyDip: line.isLuckyDip,
    isFreeReentry: line.isFreeReentry,
  },
  balanceAfter: <post-settle balance>,
  playedAt: draw.drawAt,
}
```

## 8. Architecture

### 8.1 Where lottery lives

**Top-level `src/systems/lottery.ts`** + **top-level `src/pages/lottery/`** — NOT under `src/games/`. Documented in **ADR-0040**.

Rationale: the games-sandbox contract (`src/games/<name>/`) assumes one-user-one-round-at-a-time gameplay where the user clicks through to a result. The lottery is an event-driven batch settle: many users buy into one shared event, and the event settles all entries together at a scheduled time. Forcing lottery into the games shape adds friction (must add per-line `useGameRound` wrapping; sandbox import rule conflicts with admin reads of `lotteryDraws`).

`src/systems/lottery.ts` is permitted to import from `@/db/*` and write to the `rounds` table via `@/systems/wallet` like other systems modules. ESLint exception is the existing `src/systems/**` allowance.

### 8.2 Module map

```
src/systems/
└─ lottery.ts                      # pure logic + DB writes
src/systems/lottery.test.ts        # exhaustive logic tests

src/pages/lottery/
├─ LotteryPage.tsx                 # shell
├─ LotteryPage.test.tsx
├─ HeroSection.tsx                 # countdown <-> winning-balls swap
├─ HeroSection.test.tsx
├─ NumberGrid.tsx                  # 5×10 + 1×10 picker
├─ NumberGrid.test.tsx
├─ TicketCart.tsx                  # cart of lines pre-purchase
├─ TicketCart.test.tsx
├─ FavoritesDropdown.tsx           # save / load / rename / delete
├─ FavoritesDropdown.test.tsx
├─ DrawAnimationModal.tsx          # reveal sequence after backfill
├─ DrawAnimationModal.test.tsx
├─ HistorySlide.tsx                # scrollable past draws
├─ HistorySlide.test.tsx
└─ useLotteryBackfill.ts           # hook that drives the scheduler

src/components/charts/
├─ NumberFrequencyBar.tsx          # admin frequency chart (NEW)
└─ NumberFrequencyBar.test.tsx

src/pages/admin/
├─ AdminLotteryPage.tsx            # /admin/lottery
├─ AdminLotteryPage.test.tsx

docs/adr/
└─ 0040-lottery-as-system.md

BUILD_GUIDE.md                      # §12 row update; new §11 lottery section
src/router.tsx                      # add /lottery + /admin/lottery routes
src/components/Sidebar.tsx          # add LOTTERY entry + unread dot
src/pages/LobbyPage.tsx             # add lottery tile
src/db/schema.ts                    # Dexie v3 bump
src/db/index.ts                     # type exports for new tables
```

### 8.3 systems/lottery.ts surface

```ts
// Pure
export function drawForDate(date: string): { mainNumbers: number[]; bonus: number };
export function evaluateLine(
  line: { mainNumbers: number[]; bonusNumber: number },
  draw: { mainNumbers: number[]; bonus: number },
): MatchTier | null;
export function payoutFor(tier: MatchTier | null): number;
export function generateLuckyDipLine(
  existingLines: ReadonlyArray<{ mainNumbers: number[]; bonusNumber: number }>,
): { mainNumbers: number[]; bonusNumber: number };
export function lineKey(line: { mainNumbers: number[]; bonusNumber: number }): string; // canonical sorted string for dedupe
export function nextDrawAt(now: number): number; // ms timestamp of the next 20:00 local boundary

// Async (DB-touching)
export async function buyTicket(input: {
  userId: string;
  lines: Array<
    { kind: 'manual'; mainNumbers: number[]; bonusNumber: number } | { kind: 'lucky-dip' }
  >;
}): Promise<{ ticketId: string; lines: LotteryLine[] }>;
export async function settleMissedDraws(): Promise<{
  settledDrawIds: string[];
  freshDraws: LotteryDraw[];
}>;
export async function getUserDraws(
  userId: string,
  limit?: number,
): Promise<Array<{ draw: LotteryDraw; tickets: LotteryTicket[]; lines: LotteryLine[] }>>;
export async function saveFavorite(input: {
  userId: string;
  name: string;
  mainNumbers: number[];
  bonusNumber: number;
}): Promise<LotteryFavorite>;
export async function listFavorites(userId: string): Promise<LotteryFavorite[]>;
export async function renameFavorite(id: string, name: string): Promise<void>;
export async function deleteFavorite(id: string): Promise<void>;

// Admin reads
export async function getLotteryAdminStats(): Promise<{
  ticketsSoldToday: number;
  linesSoldToday: number;
  totalRevenue: number;
  totalPayout: number;
  netProfit: number;
}>;
export async function getNumberFrequency(pool: 'main' | 'bonus'): Promise<number[]>; // index = number-1, value = times drawn
```

### 8.4 New `Game` enum value

The existing `Round['game']` type union is extended to add `'lottery'`. Verify in `src/db/schema.ts` and ensure all switch statements that exhaustively map game keys (Sidebar, StatsLeftRail, LeaderboardLeftRail, GAME_LABELS in Phase 7 pages) handle 'lottery'.

Sidebar adds a LOTTERY entry. StatsLeftRail and LeaderboardLeftRail must each gain a LOTTERY tab so per-game stats include lottery rounds. The GAME_LABELS Record adds `lottery: 'Lottery'` (and 'LOTTERY' uppercase variant for titles).

## 9. Admin lottery page (`/admin/lottery`)

### 9.1 Layout

Standard admin shell + AdminLeftRail (existing). Page body:

1. **Header**: `LOTTERY · OVERVIEW`
2. **4 stat cards** (using existing `StatCard` primitive):
   - **Tickets sold today** — `N tickets / L lines`
   - **Revenue (all-time)** — total chips collected from line sales (excludes free re-entries)
   - **Payout (all-time)** — total chips paid out in winnings
   - **House profit** — `revenue − payout`. Card uses `tone="positive"` if ≥ 0 (green border + value), `tone="negative"` if < 0 (red border + value). Signed value displayed prominently.
3. **2 number-frequency charts** (new component `NumberFrequencyBar`):
   - Main pool: bars for numbers 1–50 (vertical bars on shared X axis), height = times drawn historically; gold color
   - Bonus pool: bars for numbers 1–10, height = times drawn historically; magenta color
   - Tooltip on hover: "Number N — drawn X times (Y% of draws)"
4. **Recent draws table** (newest 50 rows, infinite scroll for more):
   - Date | Main numbers | Bonus | Lines sold | Total payout | Net P/L

### 9.2 Sidebar entry

`AdminLeftRail` adds a `LOTTERY` entry. Reuses `StatsLeftRail`-style NavLink pattern.

## 10. Routing

- `/lottery` — public (logged-in user) page, lazy-loaded with the same Suspense pattern as `/stats` and `/leaderboard`
- `/admin/lottery` — admin-only page (guarded by existing `RequireAdmin`), lazy-loaded with the admin Suspense fallback

`src/router.tsx` adds two new lazy imports and route entries.

## 11. Integration with /stats and /leaderboard (Phase 7)

Because every settled line writes a `rounds` row with `game: 'lottery'`:

- `/stats` per-game tab gains a **Lottery** option in the left rail. Cards show lottery-scoped: rounds played (lines), wagered (10 × line count, exc. free re-entries), won, lost, net, RTP, biggest win, longest streak, etc.
- `/leaderboard` per-game tab gains a **Lottery** option. The 3 boards (best player, biggest single win, most rounds played) work unchanged.

The "biggest single win" board across all games will surface a lottery jackpot winner immediately on the overview tab. **No new leaderboard code needed** — Phase 7 plumbing handles it for free.

## 12. ADRs to write

- **ADR-0040 — Lottery as a system, not a games-sandbox citizen.** Documents why `/lottery` lives in `src/systems/lottery.ts` + `src/pages/lottery/` rather than `src/games/lottery/`, and the precedent it sets for future event-style content (e.g., daily challenges, achievements).

## 13. PR sequencing (6 PRs)

1. **PR A — Schema + systems/lottery (logic only) + ADR-0040**
   - Dexie v3 schema bump; new types exported
   - `src/systems/lottery.ts` pure functions + DB-write functions
   - Exhaustive unit tests on `drawForDate` determinism, `evaluateLine` (≥ 16 cases covering each tier + non-winners + bonus-edge), `generateLuckyDipLine` uniqueness, `payoutFor`, `nextDrawAt` (DST boundary case), `lineKey` canonical sort
   - `buyTicket` + `settleMissedDraws` integration tests against fake-indexeddb
   - `'lottery'` added to the Game type
   - ADR-0040 committed
   - Estimated +15 tests
2. **PR B — LotteryPage shell + NumberGrid + TicketCart + Favorites**
   - `LotteryPage` shell with placeholder HERO + the buy-a-ticket two-column layout
   - `NumberGrid` (5×10 + 1×10) with selection state, valid-selection check, Save-favorite affordance
   - `TicketCart` showing manually-added lines, count, total cost
   - `FavoritesDropdown` save / load / rename / delete with confirmation
   - "Add Line" button validates uniqueness within current cart
   - Wires to `buyTicket` for manual-only purchases (no lucky dip yet)
   - Estimated +25 tests
3. **PR C — Lucky dip flow + within-ticket uniqueness + DrawAnimationModal (purchase reveal)**
   - `Add Lucky Dip` adds placeholder to cart
   - `buyTicket` purchase flow generates lucky-dip numbers + writes ticket + lines
   - **Purchase reveal modal** (subset of DrawAnimationModal — lucky-dip line flip animation only)
   - Reduced-motion path skips animations
   - Estimated +18 tests
4. **PR D — Scheduler + backfill + DrawAnimationModal (draw reveal) + HERO + Sidebar dot + Lobby tile**
   - `useLotteryBackfill` hook drives `settleMissedDraws` on app open + LotteryPage mount
   - `DrawAnimationModal` full implementation (draw reveal sequence, resume-from-localStorage)
   - `HERO` component swaps countdown vs winning-balls based on draw state
   - Sidebar gains LOTTERY entry + unread `🔴` dot driven by `localStorage.lottery.lastSeenDraw`
   - LobbyPage gains lottery tile
   - Reduced-motion handling throughout
   - Estimated +30 tests
5. **PR E — History slide + per-line settle → rounds + Admin lottery page (cards + frequency charts)**
   - `HistorySlide` renders past 30 draws with infinite scroll and per-line expand
   - Verify `settleMissedDraws` writes `rounds` rows + integration test confirms /stats and /leaderboard pick them up
   - `AdminLotteryPage` with 4 stat cards + 2 `NumberFrequencyBar` charts + recent-draws table
   - `getLotteryAdminStats`, `getNumberFrequency` queries
   - StatsLeftRail / LeaderboardLeftRail / GAME_LABELS / Sidebar all gain a `Lottery` entry
   - Estimated +35 tests
6. **PR F — Release v0.10-lottery**
   - BUILD_GUIDE.md adds lottery section + §12 phase row marked ✅
   - Tag `v0.10-lottery`
   - GitHub Release notes
   - Update `[[project_masquer_status]]` memory

Total estimated new tests: **~123**.

## 14. Definition of done (phase-level)

- All 6 PRs merged on `main` with CI green
- Manual smoke walkthrough:
  - Fresh user → `/lottery` → HERO shows countdown to today's 20:00 draw
  - Pick 5+1 → Save as favorite → reload favorite → tweak → add line → add 3 lucky dips → Buy Ticket
  - Purchase reveal: lucky-dip lines flip and reveal numbers
  - Try to add a duplicate line manually → blocked with inline error
  - Buy a second ticket later in the day → distinct purchase, succeeds with duplicates allowed across tickets
  - Sleep / wait until 20:01 local → reopen app → DrawAnimationModal fires showing today's draw + your line results
  - Win at match-2 → free re-entry ticket auto-created for tomorrow
  - Big win at match-4 → wallet credited + `/stats` and `/leaderboard` show the line
  - Log in as admin → `/admin/lottery` → frequency charts populate, profit card shows correct R−P, recent-draws table includes today
- Bundle: main bundle stays ≤ 800 kB (+50 kB headroom from Phase 7's 745 kB; `/lottery` page lazy-loaded; `NumberFrequencyBar` rides existing Recharts chunk)
- `prefers-reduced-motion`: every animation has a reduced-motion short-circuit verified by `useReducedMotion` mock pattern
- `[[project_masquer_status]]` updated; `[[masquer-deferred-features]]` retained for Phase 15 evaluation

## 15. Risks + edge cases

- **DST boundary**: `nextDrawAt(now)` must handle spring-forward and fall-back local-time transitions. If today's 20:00 doesn't exist (spring forward to 21:00 in some zones), use the local 20:00 equivalent (i.e., the first valid 20:00+). Test specifically.
- **Date-string timezone**: `drawId` uses local date. If the user travels timezones, dates may seem to repeat or skip. Acceptable for an offline local app; document in ADR-0040.
- **Clock tampering**: If the user sets their system clock back, missed draws backfill correctly. If the user sets the clock forward by 1 year, they will fast-backfill 365 draws on next open. This is acceptable (don't punish clock changes), but the modal should be tolerant of long backfill sequences (skippable per-draw, not just "Done" at the very end).
- **localStorage `lastSeenDraw` corruption**: if the value is garbage, treat as "haven't seen anything"; backfill walks from earliest unsettled draw.
- **Unlimited-ticket purchase abuse**: a user with 10,000 chips could buy a ticket with 1,000 lines. Within-ticket uniqueness generation slows down as we approach C(50,5)×10 = 21M, but practically capped by wallet. Generator must time-out gracefully (cap retry attempts per slot at 500; throw if exhausted — should be impossible at sane line counts).
- **Free re-entry timing edge case**: if a match-2 line settles in a back-to-back backfill (e.g., user offline for 3 days), the re-entry is for "the next draw after the line's draw". This means a 3-day backfill could yield a chain: Day 1 match-2 → re-entry Day 2 → win → no new re-entry. Settle in date order to preserve this.

## 16. Test catalogue (estimated)

- **systems/lottery.test.ts** (~50 tests)
  - `drawForDate` determinism across reruns; different dates → different numbers
  - `evaluateLine` — 16 cases (each tier × bonus combo + non-winners)
  - `payoutFor` — every tier
  - `generateLuckyDipLine` — uniqueness against varying existing-line counts; retry budget
  - `lineKey` — canonical sort
  - `nextDrawAt` — pre-cutoff, post-cutoff, DST transitions
  - `buyTicket` integration — manual-only, mixed manual + lucky-dip, duplicate manual rejection, wallet integration, transactional atomicity
  - `settleMissedDraws` integration — single-day, multi-day backfill, match-2 generates re-entry, re-entry wins on next backfill, rounds rows written
- **UI tests** (~70 tests across pages and components)
  - HERO countdown / winning-balls swap
  - NumberGrid selection, valid-selection state, save-favorite affordance
  - TicketCart line listing, count, cost, lucky-dip placeholder
  - FavoritesDropdown save / load / rename / delete with confirmation
  - DrawAnimationModal sequencing, resume-from-localStorage, reduced-motion
  - HistorySlide scrolling, per-line expand
  - AdminLotteryPage stat cards (profit red/green), frequency chart rendering, recent-draws table
  - Sidebar `🔴` dot show/clear
  - LobbyPage lottery tile status states
- **Integration / end-to-end** (~3 tests)
  - Full buy → backfill → settle → /stats + /leaderboard update flow
  - Free re-entry chain across two days
  - Admin profit card sign transitions (positive → negative when a big win lands)
