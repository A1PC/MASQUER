# Phase 15 sub-project #13 — Craps upgrade

**Status:** Spec
**Author:** Adam + Claude (assistant)
**Date:** 2026-05-27
**Phase:** 15 (Polish & Overhaul) · MASQUER per-game upgrade · last gameplay game in the polish pass
**Game:** Craps (`src/games/craps/`) — self-contained; no shared infra
**Prior shipped phase:** Phase 14 (`v0.14-craps`, ADR-0042 per-bet resolver registry + ADR-0041 table-session wallet reused)

---

## 1. Goal

Apply the MASQUER polish recipe to Craps, the last gameplay game in the Phase 15 pass. Craps is heaviest of the remaining sub-projects — 8 visual files need brand pass, dice tumble + ON/OFF puck animations + ChipTray + PropositionDrawer all need brand chrome, plus a NEW `/admin/craps` page (none exists yet because Craps shipped after the per-game admin pattern locked in).

Craps is structurally unlike the other games: it's a **continuous-play table session** (per ADR-0041), not a discrete-round game. The "between-hands grace" pattern from poker doesn't apply — instead the polish centres on **per-roll feedback** (bet-spot flash) plus **big-event banners** for moments like POINT MADE / SEVEN-OUT / JACKPOT.

After this sub-project ships, only **#14 Admin overhaul** + **#15 Final integration** remain.

## 2. Non-goals

Out of scope (deferred per `localgamble-deferred-features.md`):

- Multi-shooter / online multiplayer
- Live dealer voice calls ("FIVE, NO FIELD!")
- Crapless Craps / Bonus Craps / additional variants
- "Run-it-twice" / "rabbit hunt" Craps equivalents
- Schema additions to capture per-roll bet data (covered under §7 risks — fallback if bet-type frequency chart needs it)

Pure game logic in `craps/bets.ts`, `dice.ts`, `resolveRoll.ts`, `machine.ts`, `stakes.ts` is **byte-stable**. Polish is presentational + additive only.

## 3. Locked design decisions

1. **Hybrid feedback** — per-roll bet-spot flash (always) + 3s outcome banner only for big events (POINT MADE / SEVEN-OUT / JACKPOT / 2-in-a-row NATURALS).
2. **Two PRs** — PR A game-side polish + sound + animations + chrome, PR B `/admin/craps` page. Matches the #12.v1 Hold'em pattern.
3. **Dice tumble sound reuses `reel.stop`** (slots sample), 2 staggered plays per die. No new sound sample / no enum changes.

## 4. Architecture

### 4.1 PR decomposition

| PR                       | Scope                                                                                                | Touches                                                                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A — game-side polish** | Chrome retrofit + brand pass on 8 visual files + sound + hybrid feedback + bust/session-over screens | `craps/*.tsx` (8 files) + 2 NEW shared chrome files + `BUILD_GUIDE.md`                                                                                                         |
| **B — `/admin/craps`**   | NEW admin page with 4 StatCards + chart + biggest-roll-wins panel + recent sessions table            | `pages/admin/AdminCrapsPage.{tsx,test.tsx}` (NEW), `components/charts/Craps*.{tsx,test.tsx}` (NEW), `systems/stats.ts` (additive), `pages/admin/AdminLayout.tsx`, `router.tsx` |

### 4.2 PR A — game-side polish

**Chrome rewrite — `CrapsPage.tsx`:**

- Root: `<div className="relative flex h-full flex-col bg-felt-table text-ivory">` (drops `min-h-screen` per [[localgamble-min-h-screen-in-pages]]).
- Title block: `MASQUER · Craps` (font-display text-2xl tracking-[0.18em] text-gold-bright) + subtitle showing tier + phase + bankroll (text-xs ivory/55).
- Top-left absolute: `<LobbyButton />`.
- Top-right absolute: `<CrapsOddsHeader />` (NEW shared chrome — see §4.3).
- Bottom-left absolute: `<RulesButton />` + `<CrapsRulesModal>` (NEW shared chrome).
- `<main className="flex flex-1 flex-col overflow-hidden p-3 pt-14">`.
- Replace `useReducedMotion` (framer-motion) with `useEffectiveReducedMotion` (project).
- `useSound` wiring per §4.5.
- Hybrid feedback state per §4.6: `flashedSpots` (Set of bet-keys, auto-clears) + `outcomeBanner` (tier + auto-dismiss 3s).
- Bust prompt + session-over screens restyled with brand tokens: `bg-velvet-deep` panel, brass border, ivory body, gold-bright headings.

**Brand-token pass — 8 visual files:**

| File                    | Brand-token swaps                                                                                                                                                                 | Animation behaviour                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `CrapsTable.tsx`        | oval-felt brass-edged backdrop (`bg-felt-table-deep rounded-[3rem] border border-brass/60`); brass hairlines on COME / FIELD / Pass / Don't / Place row; gold-bright pot/bankroll | preserved                                                                                          |
| `BetSpot.tsx`           | bg-velvet-deep/40 hover; brand chip-stack rendering                                                                                                                               | NEW `flashTone?: 'win' \| 'loss'` prop + `payoutChips?: number`; gold ring on win, red dim on loss |
| `ChipTray.tsx`          | brass-edged tray; gold-bright denomination highlight; ivory chip labels                                                                                                           | preserved                                                                                          |
| `DiceDisplay.tsx`       | porcelain die face (ivory linear-gradient + gold-bright pip dots + brass border)                                                                                                  | tumble preserved; reduced-motion → instant snap                                                    |
| `PointPuck.tsx`         | gold-bright ON face + casino-red OFF face + brass border                                                                                                                          | flip preserved; reduced-motion → instant swap                                                      |
| `PropositionDrawer.tsx` | collapsible velvet-deep panel + brass border + gold-bright section header                                                                                                         | preserved                                                                                          |
| `SessionBar.tsx`        | brand tokens; gold-bright bankroll; ivory rolls + point status                                                                                                                    | preserved                                                                                          |
| `SetupPanel.tsx`        | `mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-lg border border-brass/60 bg-velvet-deep p-6` (mirror poker SetupPanel)                                                     | preserved                                                                                          |

### 4.3 New shared Craps chrome (in PR A)

Two new co-located files (NOT in `_shared/` since Craps is self-contained):

- **`src/games/craps/CrapsOddsHeader.tsx`** — thin wrapper around `OddsInfoBox` with the content:
  ```
  Pass/Don't 1:1 · Field 1:1 (2× on 2, 3× on 12) · Place 4-10 (varies) · Hardways 7-9:1 · Props 4-30:1
  ```
- **`src/games/craps/CrapsRulesModal.tsx`** — thin wrapper around `RulesModal` with the Craps rules body. Sections: Object · Pass/Don't (come-out vs point) · Come/Don't Come (travelling come-points) · Place 4-10 · Field · Hardways · Propositions · Table session model (buy-in + rebuy + leave between rolls).

Both are tiny — no need to abstract into shared `poker/_shared/`-style infra since no other game reuses them.

### 4.4 Animation behaviours under reduced motion

| Animation                   | Normal                                     | Reduced motion                            |
| --------------------------- | ------------------------------------------ | ----------------------------------------- |
| Dice tumble (~600 ms)       | Framer Motion 3D-ish flip per die          | Instant snap to final face                |
| PointPuck ON/OFF flip       | 300 ms scale + rotation                    | Instant swap                              |
| BetSpot flash on resolution | 2 s gold ring + payout badge animate-in    | Static gold border for 2 s (no animation) |
| Outcome banner              | Fade + scale enter; auto-dismiss after 3 s | Instant render; auto-dismiss after 3 s    |

All gated on `useEffectiveReducedMotion`.

### 4.5 Sound taxonomy

| Trigger                                              | Event                                           | Cadence                                                                                          |
| ---------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Bet placed on a spot                                 | `chip.place`                                    | One per click                                                                                    |
| BUY-IN / REBUY commit                                | `chip.place`                                    | One per commit                                                                                   |
| Each die landing on ROLL                             | `reel.stop`                                     | 2 staggered plays (80 ms apart) — slots sample reused                                            |
| Roll resolves any winning bets (player net positive) | `win.small` / `.medium` / `.jackpot`            | Tier gated on `totalNetThisRoll / totalCommittedThisRoll`: <2× small, 2-20× medium, ≥20× jackpot |
| Roll resolves losing bets only (player net negative) | `loss`                                          | One per roll where player net < 0                                                                |
| Point established (puck flips ON)                    | `chip.place`                                    | One — subtle reuse since no `puck.flip` sample                                                   |
| Point made / seven-out (puck flips OFF)              | `win.jackpot` (point made) / `loss` (seven-out) | The tier stinger doubles as puck-flip cue                                                        |

All gated on `useEffectiveReducedMotion`. Multi-die stagger collapses to single batched sound under reduced motion.

### 4.6 Hybrid per-roll feedback

**Per-roll bet-spot flash (always):**

Each roll resolves N bets. For each resolved bet:

- **Win**: `BetSpot` flashes gold ring for 2 s; small gold chip badge appears near the spot showing the payout.
- **Loss**: `BetSpot` dims red for 1.5 s + a brief red X overlay.
- **Push / standing**: no flash (silent — bet stays on the table).

Flash auto-clears before the player can ROLL again (or after ~2.5 s, whichever comes first).

**Big-event banner (3 s only):**

| Event                                                  | Banner copy     | Tone                         |
| ------------------------------------------------------ | --------------- | ---------------------------- |
| POINT MADE (Pass bet wins on point)                    | `POINT MADE +N` | gold-bright                  |
| SEVEN-OUT (line bets lose)                             | `SEVEN OUT`     | casino-red                   |
| JACKPOT (single-roll net ≥ 20× committed)              | `JACKPOT +N`    | gold-bright + magenta accent |
| 2-IN-A-ROW NATURALS (two come-out 7/11s consecutively) | `ON A ROLL +N`  | gold-bright                  |

Banner uses the same `data-outcome-banner` shape as poker for visual consistency. Auto-dismiss after 3 s. Multiple back-to-back triggers debounced to 1 banner per ~1 s.

**Detection logic** — runs in a `CrapsPage` effect watching `lastRoll` + `phase` transitions:

```ts
useEffect(() => {
  if (!lastRoll) return;
  // POINT MADE: phase 'point' → 'come-out' with point made on previous phase
  // SEVEN-OUT: phase 'point' → 'come-out' on a 7
  // JACKPOT: lastRollNet / totalCommittedThisRoll >= 20
  // 2-IN-A-ROW NATURALS: 2 consecutive come-out 7/11 hands
  // …trigger setOutcomeBanner with tier; 3s setTimeout clears
}, [lastRoll, phase /* prev refs via useRef */]);
```

### 4.7 LEAVE TABLE flow

Craps has no "between-hands" gate — continuous play. So no 15s leave grace.

- LEAVE TABLE button always visible in SessionBar during play (already present).
- Click → confirm modal (NEW `LeaveConfirmModal.tsx` or inline confirmation) showing current bankroll + net P/L. Confirm → machine fires `LEAVE_TABLE` → settle → SESSION OVER screen.
- Bust-out (bankroll = 0) → same SESSION OVER auto-shown.
- SESSION OVER screen (brand-tokened): gold-bright SESSION OVER + bankroll details + PLAY AGAIN button.

## 5. PR B — `/admin/craps`

### 5.1 Layout

Standard admin pattern (mirrors `/admin/plinko` / `/admin/poker`):

- **4 StatCards row**: Sessions played · Total rolls · House Net Chips (green positive / red negative) · Actual RTP (across all sessions).
- **Hero chart**: `CrapsBetTypeFrequencyBar` — stacked bar of total chips wagered per bet type. **See §7 risks** — depends on per-roll bet data availability. Fallback: `CrapsRollsPerSessionBar` (distribution of session length).
- **Secondary panel**: biggest-roll-wins leaderboard (top 10 single-roll net wins) OR top-10-biggest-bankroll-finishes if per-roll data unavailable.
- **Recent sessions table (last 20)**: timestamp · tier · bought in · final bankroll · net · rolls played. Load-all + sort-by-`playedAt` desc + slice-20 (#250 pattern).

### 5.2 Aggregations (`src/systems/stats.ts`)

Additive only — do NOT modify existing fns.

```ts
interface PersistedCrapsDetails {
  readonly tier: 'low' | 'mid' | 'high';
  readonly buyIn: number;
  readonly rebuys: number;
  readonly rollsPlayed: number;
  readonly sessionId: string;
  // OPTIONAL — only present if per-roll bet log was added (see §7)
  readonly betTypeWagered?: Record<string, number>;
  readonly biggestRollWin?: number;
}

export interface CrapsAllTimeStats {
  sessions: number;
  totalRolls: number;
  totalWagered: number;
  totalPaid: number;
  netHouseChips: number;
  netPlayerChips: number;
  actualRtp: number | null;
  biggestRollWin: number;
}

export interface CrapsBetTypeWagered {
  betType: string;
  totalWagered: number;
}
export interface CrapsRollsPerSessionBucket {
  bucket: string;
  sessions: number;
}
export interface CrapsBiggestSession {
  playedAt: number;
  tier: string;
  net: number;
}

export async function getCrapsAllTimeStats(): Promise<CrapsAllTimeStats>;
// Returns empty array if no session persisted betTypeWagered (graceful fallback)
export async function getCrapsBetTypeFrequency(): Promise<CrapsBetTypeWagered[]>;
export async function getCrapsRollsPerSession(): Promise<CrapsRollsPerSessionBucket[]>;
export async function getCrapsBiggestSessionWins(limit: number): Promise<CrapsBiggestSession[]>;
```

Tests: seed ~12 fake Craps rounds covering low/mid/high tiers + mix of win/loss/push.

### 5.3 Chart wrappers (NEW)

- `src/components/charts/CrapsBetTypeFrequencyBar.tsx` — stacked bar, brand tokens, `ChartTooltipShell`. **Built with empty-state UI** — if `getCrapsBetTypeFrequency()` returns empty array (no per-roll data persisted), render "Bet-type tracking available in future session data" placeholder.
- `src/components/charts/CrapsRollsPerSessionBar.tsx` — fallback distribution chart.

### 5.4 Router + nav

- `src/router.tsx` — `const AdminCrapsPage = lazy(() => import('@/pages/admin/AdminCrapsPage'));` + route `/admin/craps`.
- `src/pages/admin/AdminLayout.tsx` — insert "Craps" nav entry after "Poker".

## 6. Standing rules (recap)

Per `PHASE_15_PATTERNS.md §2`:

1. **Pure logic untouched** — `craps/{bets,dice,resolveRoll,machine,stakes}.ts` byte-stable.
2. **Games sandbox preserved** — no `@/db` or `@/store` imports from `src/games/craps/**`.
3. **One `rounds` row per Craps session** (ADR-0041 — table-session wallet).
4. **Integer money. No `Math.random()`.** ESLint enforces.
5. **Spec-first** — this doc + BUILD_GUIDE §14 amendment land before any code.
6. **No CLAUDE.md edits.**
7. **TS strict + exactOptionalPropertyTypes.**
8. **Commit subject ≤ 100 chars.**
9. **Scopes:** `craps` (game-side), `admin` (NOT `admin-craps`), `stats` (aggregations), `routing` (router/nav), `docs` (spec/BUILD_GUIDE).
10. **No `--no-verify`, no `--amend`.**
11. **DoD per PR:** `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`
12. **Tokens-only Tailwind** in rebuilt files.
13. **Page root MUST be `flex h-full flex-col`, NEVER `min-h-screen`** (per [[localgamble-min-h-screen-in-pages]]).
14. **Visual verification via Playwright at 1440×900 before pushing** (per [[localgamble-screenshot-before-pushing-ui]]).

## 7. Risks + watch-outs

- **Bet-type frequency chart depends on per-roll bet data.** Current persisted shape (per ADR-0041) is session-level only — `betAmount=totalBoughtIn`, `payout=finalBankroll`, `details={tier, rollsPlayed, ...}`. No per-bet log exists. Two options:
  - **(a)** Add `betTypeWagered: Record<betType, totalWagered>` to `details` during PR A's session-end accumulation (additive JSON field; no Dexie migration since `details` is unstructured). New session data starts populating; pre-PR-A sessions return empty bet-type chart.
  - **(b)** Drop the bet-type frequency chart; substitute `CrapsRollsPerSessionBar` (rolls-per-session distribution bucketed 0-25 / 26-50 / 51-100 / 100+).
  - **Default to (a)** — small additive change in `CrapsSession.doSettle`, future-proofs the admin chart. PR A handles the new `details.betTypeWagered` accumulation; PR B's chart consumes it with empty-array tolerance.
- **Hybrid feedback timing vs machine resolution.** The flash needs to fire AFTER the machine resolves the roll. Add a transient state in `CrapsPage` that snapshots `lastResolution` each time `lastRoll` changes, then auto-clears.
- **POINT MADE vs SEVEN-OUT detection.** Both transition the machine from `point` phase → `come-out` phase. Distinguish via `lastRoll.total` (7 = seven-out; else point was made if previous `pointValue === lastRoll.total`).
- **`useReducedMotion` (framer-motion) → `useEffectiveReducedMotion`** semantic shift (boolean | null → boolean). Direct `if (reduce)` usage works the same.
- **`min-h-screen` trap** — applies on CrapsPage root.
- **`reel.stop` reuse for dice** — sample is sharp for slots; might feel intense for dice. Mitigation: lower volume via `useSound`'s play options if supported; otherwise accept and revisit only if user reports.
- **PointPuck animation** — current implementation might use raw timings. Confirm reduced-motion path is honoured; add if missing.
- **Bet-resolution display** — the machine returns `BetOutcome[]` per roll. The flash logic needs to walk each outcome, find the matching `BetSpot` by bet-key, and trigger its flash. Verify bet-key stability before relying on it.

## 8. Definition of done

- PR A + PR B merged.
- Craps looks + sounds + feels like a peer of every other MASQUER game — same chrome (LobbyButton / OddsInfoBox / RulesModal / MASQUER title), same Velvet Deco palette, same sound integration.
- Hybrid feedback works: bet-spot flash on every roll; banners only on POINT MADE / SEVEN-OUT / JACKPOT / 2-in-a-row NATURALS.
- LEAVE TABLE confirms cleanly; SESSION OVER screen brand-tokened.
- `/admin/craps` accessible from sidebar with all 4 StatCards + hero chart + biggest panel + recent sessions table populating.
- Pure logic + machine byte-stable.
- Visually verified at 1440×900 via Playwright.
- All Phase 15 standing rules respected; full DoD green per PR.
- Tag candidate: `v0.15.13-craps` after manual smoke.

## 9. Open questions

None at spec-write time. All three decision points were locked during brainstorming.

## 10. Workflow

Per [`PHASE_15_PATTERNS.md §3`](../../PHASE_15_PATTERNS.md#3-sub-project-workflow):

1. **Spec PR** (this doc).
2. **Plan PR** with task breakdown + inline code stubs.
3. **PR A** dispatched in parallel with plan-merge.
4. **PR B** dispatched after PR A merges.
5. User says "start next" → controller starts **#14 Admin overhaul** (penultimate sub-project of Phase 15).

---
