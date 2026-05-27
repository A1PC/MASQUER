# Phase 15 sub-project #12.v1 — Texas Hold'em upgrade

**Status:** Spec
**Author:** Adam + Claude (assistant)
**Date:** 2026-05-27
**Phase:** 15 (Polish & Overhaul) · MASQUER per-game upgrade · poker trio #12.v1 of 3
**Game:** Texas Hold'em (`src/games/poker/holdem/`) + shared poker chrome (`src/games/poker/_shared/`)
**Prior shipped phase:** Phase 13a (`v0.13a-texas-holdem`) — gameplay complete, ADR-0041 (poker session wallet model)

---

## 1. Goal

Apply the standard Phase 15 polish recipe (per [`docs/PHASE_15_PATTERNS.md`](../../PHASE_15_PATTERNS.md)) to Texas Hold'em as the lead variant of the poker trio. Because the variants share `poker/_shared/`, **#12.v1 ships ALL shared chrome and Hold'em-specific polish in one batch**; #12.v2 Five-Card Draw and #12.v3 Omaha inherit the shared work for free and ship only variant-specific bits.

The four user-locked decisions for this sub-project (see §3):

1. **Migrate poker to the unified MASQUER `PlayingCard`** from `@/components/brand/PlayingCard` (shipped in #5 Blackjack).
2. **Ship `/admin/poker` scaffold + Hold'em tab now** with placeholder tabs for Draw / Omaha that fill as those variants polish.
3. **Hide archetype labels behind Venetian masquerade names** — the player can't tell at a glance whether they're up against a Rock or a Maniac.
4. **Dramatic showdown stagger + gold-glow winner highlight** matching the cross-game reveal pattern.

## 2. Non-goals

Out of scope for this sub-project (deferred per `localgamble-deferred-features.md`):

- Multi-table / tournament mode (blind escalation, sit-and-go)
- Hand-history viewer (per-hand log table is its own schema migration)
- Run-it-twice / rabbit-hunt / time-bank / sit-out poker-room niceties
- Adaptive AI that models player tendencies — current `decide()` is stateless per turn
- Table chat / AI tells / verbal flavour
- Insurance / side bets / bad-beat jackpot
- Admin tunability of `decide()` constants — `/admin/poker` is read-only for v1
- Pot-Limit / Fixed-Limit variants — still No-Limit only

Pure game logic in `holdem/holdemLogic.ts`, `holdem/machine.ts`, `_shared/handEvaluator.ts`, `_shared/sidePots.ts`, `_shared/deck.ts`, `_shared/ai/{archetypes,decide}.ts` is **byte-stable**. Polish is presentational + additive only.

## 3. Locked design decisions

1. **Card visuals → MASQUER `PlayingCard`.** Migrate every poker import of `_shared/PlayingCard` to `@/components/brand/PlayingCard`. Delete (or thin-shim) the poker-local file. Touches Seat / CommunityBoard / ShowdownReveal in all three variants — but Draw + Omaha pages keep working unchanged because they consume the migrated shared components.
2. **`/admin/poker` ships in v1** as a scaffold + Hold'em tab. Draw + Omaha tabs render "Coming in v2 / v3" placeholders until those sub-projects extend `getPokerAllTimeStats('variant')`.
3. **Venetian masquerade names.** New `_shared/maskNames.ts` exports a 12-name pool (`Bauta`, `Colombina`, `Volto`, `Moretta`, `Arlecchino`, `Pantalone`, `Pulcinella`, `Brighella`, `Pierrot`, `Dottore`, `Capitano`, `Zanni`) and `assignMaskName(sessionRng, tableSize)` — deterministic per session, no repeats within a table. Archetype is **hidden** from the UI but still drives `decide()`.
4. **Dramatic showdown stagger** — left-to-right seat reveal, 250 ms per seat, gold-glow on winning seat for 600 ms, `win.{tier}` stinger. Reduced-motion → instant flip + static gold border + single batched sound.

## 4. Architecture

### 4.1 PR decomposition

| PR                              | Scope                                                                 | Touches                                                                                                                                                                                                                                               |
| ------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — chrome + Hold'em polish** | Shared chrome usable by all 3 variants + Hold'em-specific page polish | `poker/_shared/**`, `poker/holdem/**`, `poker/PokerLobbyPage.tsx`, `poker/five-card-draw/{DrawSeat,DrawTable,FiveCardDrawPage}.tsx` (import updates only), `poker/omaha/{OmahaSeat,OmahaTable,OmahaPage}.tsx` (import updates only), `BUILD_GUIDE.md` |
| **B — `/admin/poker`**          | New admin page scaffolding for the poker trio                         | `src/pages/admin/AdminPokerPage.tsx` (new), `src/pages/admin/AdminLayout.tsx`, `src/router.tsx`, `src/systems/stats.ts`, new chart wrapper `src/components/charts/PokerSessionsByVariantBar.tsx`                                                      |

PR A is the heavy one; PR B is the standard admin-pattern (4 StatCards + hero chart + recent table + per-game variant tabs).

### 4.2 Shared chrome — what lands in PR A

New files in `src/games/poker/_shared/`:

- **`maskNames.ts`** — pool + `assignMaskName(sessionRng, tableSize): string[]` (Fisher-Yates shuffle seeded by the session RNG, slice `tableSize - 1`). Pure function. Tested.
- **`PokerOddsHeader.tsx`** — takes `variant: 'holdem' | 'five-card-draw' | 'omaha'`, renders the variant's `<OddsInfoBox>` content. Hold'em content: `No-Limit Hold'em · 2-6 players · 80 BB buy-in · Rebuy on bust`. Draw / Omaha get placeholder strings that the v2 / v3 sub-projects flesh out.
- **`PokerRulesModal.tsx`** — takes `variant`, renders the variant's rules block inside a shared `<RulesModal>`. Hold'em rules: Object / Hand rankings / Betting rounds / Blinds / Showdown / Tabletop variants table. Draw + Omaha content is "Rules coming in v2 / v3" placeholders for v1.
- **`MaskAvatar.tsx`** — visual: first letter of the mask name centred in a Velvet Deco brass-ringed circle. Used by all three variants' Seat components. Active-to-act seat gets `ring-2 ring-brass shadow-[0_0_8px_rgba(232,189,109,0.6)]`.

Modified files in `src/games/poker/_shared/`:

- **`PlayingCard.tsx`** → delete after migrating all imports to `@/components/brand/PlayingCard`. (If type re-exports are needed for AI code that references `Card`, keep a 5-line shim that re-exports the type only.)
- **`PokerVariantModal.tsx`** → brand-token pass (replace `bg-felt-deep` / `text-white` / `text-casino-red` etc. with `bg-velvet-deep` / `text-ivory` / standard tokens). Use `<MaskMark>` brand mark in the modal header.
- **`PokerLobbyPage.tsx`** → MASQUER · Poker title; LobbyButton top-left.

### 4.3 Hold'em variant polish — what lands in PR A

In `src/games/poker/holdem/`:

- **`HoldemPage.tsx`** — full rewrite of the page chrome:
  - Root: `flex h-full flex-col bg-felt-table text-ivory` (drops `min-h-screen` — see [memory `localgamble-min-h-screen-in-pages`](../../../.claude/projects/-Users-adam/memory/feedback_localgamble_min_h_screen_in_pages.md)).
  - Title block: `MASQUER · Hold'em` (gold-bright, `font-display tracking-[0.18em] text-2xl`) + variant subtitle `Texas · No-Limit · Cash` (small, ivory/55).
  - `<LobbyButton />` absolute top-left, `<PokerOddsHeader variant="holdem" />` absolute top-right, `<RulesButton />` bottom-left.
  - Bust prompt screen + session-over screen restyled with brand tokens, `bg-velvet-deep` panel, brass-bordered, ivory body text, gold-bright headings.
  - Replace `useReducedMotion` (from `framer-motion`) with `useEffectiveReducedMotion` (project hook).
  - `useSound` wired per §4.4. AI seat names come from `assignMaskName(rng, tableSize)` at session creation; `Archetype` still set internally on each seat for `decide()` but never displayed.
- **`PokerTable.tsx`** — brand-token pass; reposition seats around an oval-felt brass-edged background; central pot display in `font-mono tabular-nums text-gold-bright`.
- **`Seat.tsx`** — adopt `<MaskAvatar />` + display the mask name (no archetype label). Show stack count + committed-this-street chip stack + status badges (Folded / All-In / Active). Cards rendered via `@/components/brand/PlayingCard` face-down with the Colombina back when concealed; face-up at showdown.
- **`CommunityBoard.tsx`** — render the 5 board slots via `@/components/brand/PlayingCard`. Slot fills as `street` advances; each new card uses the dramatic reveal variant (scale 0.6 → 1.05 → 1, gold-glow on landing, ~250 ms stagger between flop cards).
- **`BettingControls.tsx`** — brand-token pass; raise slider with brass thumb + brass track; fold / check / call / raise buttons styled per the standard pairing.
- **`SessionBar.tsx`** — brand pass; hands played / pot / blind level / leave-table button.
- **`ShowdownReveal.tsx`** — implements the stagger: orchestrates a sequence of card flips at 250 ms intervals from leftmost seat to rightmost; the winning seat gets a 600 ms gold glow + win-tier stinger. Final invokes `onRevealComplete` so the parent can advance.
- **`SetupPanel.tsx`** — brand-token pass (panel matches Plinko #11 setup look + felt-table backdrop + brass border + `w-full max-w-3xl`).

### 4.4 Sound taxonomy

| Trigger                                                     | Event         | Cadence                                   |
| ----------------------------------------------------------- | ------------- | ----------------------------------------- |
| Player or AI bet / raise / call commits chips               | `chip.place`  | One per action                            |
| Blinds posted at hand start                                 | `chip.place`  | One for SB + one for BB                   |
| Each hole card dealt                                        | `card.deal`   | Stagger 80 ms; max ~12/sec                |
| Each board card revealed (flop / turn / river)              | `card.deal`   | Flop = 3 staggered; turn / river = 1 each |
| Showdown card flip per AI seat                              | `card.deal`   | Once per seat reveal during stagger       |
| Player wins pot — `wonAmount / totalCommittedThisHand` < 2× | `win.small`   | One per win                               |
| Player wins pot — 2-20×                                     | `win.medium`  | —                                         |
| Player wins pot — ≥ 20×                                     | `win.jackpot` | —                                         |
| Player loses showdown OR busts                              | `loss`        | One per loss event                        |

All gated on `useEffectiveReducedMotion`. Under reduced motion: a multi-card stagger collapses to a single batched `card.deal` play; no win/loss sound for non-player events.

### 4.5 Showdown stagger animation (`PHASE_15_PATTERNS.md §1.7`)

`ShowdownReveal` orchestration:

```ts
const reduce = useEffectiveReducedMotion();
const STAGGER_MS = 250;
const WINNER_GLOW_MS = 600;

useEffect(
  () => {
    if (reduce) {
      // Instant flip + static gold border on winner + single batched sound
      onRevealComplete();
      return;
    }
    const seatsLtR = [...seatsAtShowdown].sort((a, b) => a.seatId - b.seatId);
    const timers: ReturnType<typeof setTimeout>[] = [];
    seatsLtR.forEach((seat, i) => {
      timers.push(
        setTimeout(() => {
          setRevealedSeatIds((prev) => new Set(prev).add(seat.seatId));
          play('card.deal');
        }, i * STAGGER_MS),
      );
    });
    timers.push(
      setTimeout(() => {
        setWinnerGlow(true);
        play(winTierEvent);
      }, seatsLtR.length * STAGGER_MS),
    );
    timers.push(
      setTimeout(
        () => {
          setWinnerGlow(false);
          onRevealComplete();
        },
        seatsLtR.length * STAGGER_MS + WINNER_GLOW_MS,
      ),
    );
    return () => timers.forEach(clearTimeout);
  },
  [
    /* deps */
  ],
);
```

Total reveal time ≤ `N * 250 ms + 600 ms` (≤ 2.1 s for 6-max).

### 4.6 Venetian masquerade names

`src/games/poker/_shared/maskNames.ts`:

```ts
export const MASK_NAME_POOL = [
  'Bauta',
  'Colombina',
  'Volto',
  'Moretta',
  'Arlecchino',
  'Pantalone',
  'Pulcinella',
  'Brighella',
  'Pierrot',
  'Dottore',
  'Capitano',
  'Zanni',
] as const;

export type MaskName = (typeof MASK_NAME_POOL)[number];

export function assignMaskName(sessionRng: () => number, tableSize: number): MaskName[] {
  if (tableSize - 1 > MASK_NAME_POOL.length) {
    throw new RangeError(`tableSize ${tableSize} exceeds pool of ${MASK_NAME_POOL.length}`);
  }
  // Fisher-Yates shuffle a copy seeded by sessionRng
  const shuffled = [...MASK_NAME_POOL];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(sessionRng() * (i + 1));
    [shuffled[i]!, shuffled[j]!] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, tableSize - 1);
}
```

`HoldemPage.buildMachineInput` calls `assignMaskName(rng, tableSize)` and threads the returned names into `aiArchetypes[i].name`. Archetype is still picked per-seat by `pickArchetype(rng)` but never displayed.

## 5. `/admin/poker` (PR B)

### 5.1 Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ /admin/poker                                                              │
│                                                                            │
│  Variant tabs: [ All | Hold'em | Five-Card Draw | Omaha ]                 │
│                                                                            │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌──────────┐│
│  │ Sessions Played │ │ Hands Played    │ │ House Net Chips │ │ Actual RTP││
│  │       123       │ │      4,512      │ │  +12,400 (red)  │ │   97.4%   ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └──────────┘│
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ PokerSessionsByVariantBar (stacked bars, last 30 days)             │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────┐                                         │
│  │ Biggest Pots Won (top 10)    │                                         │
│  │ #1  4,800  Hold'em  2 days   │                                         │
│  │ ...                          │                                         │
│  └──────────────────────────────┘                                         │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Recent Sessions (last 20)                                           │  │
│  │ Time · Variant · Table · Stakes · Bought In · Final · Net · Hands  │  │
│  │ ...                                                                 │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

Selected variant tab filters: StatCards, hero chart, biggest-pots panel, recent table.

For `Five-Card Draw` and `Omaha` tabs in v1, all four StatCards render with a "Coming in v2 / v3" overlay because `getPokerAllTimeStats('five-card-draw')` returns `null` until those variants persist data (which they already do via the existing `details.variant` field on the `rounds` row — so really the panels CAN populate today; the placeholder copy is only there if `sessions === 0`).

### 5.2 Aggregations (`src/systems/stats.ts`)

Additive only — do NOT modify existing functions.

```ts
type PokerVariant = 'holdem' | 'five-card-draw' | 'omaha';

interface PersistedPokerDetails {
  readonly variant: PokerVariant;
  readonly tableSize: number;
  readonly stakes: { sb: number; bb: number };
  readonly handsPlayed: number;
  readonly rebuys: number;
  readonly biggestPotWon: number;
  readonly sessionId: string;
}

export interface PokerAllTimeStats {
  sessions: number;
  hands: number;
  totalWagered: number;
  totalPaid: number;
  netHouseChips: number;
  netPlayerChips: number;
  actualRtp: number | null;
  biggestPotEver: number;
}

export interface PokerSessionsByVariantDay {
  date: string; // YYYY-MM-DD
  holdem: number;
  fiveCardDraw: number;
  omaha: number;
}

export interface PokerBiggestPot {
  playedAt: number;
  variant: PokerVariant;
  amount: number;
}

export async function getPokerAllTimeStats(variant?: PokerVariant): Promise<PokerAllTimeStats>;
export async function getPokerSessionsByVariant(days: number): Promise<PokerSessionsByVariantDay[]>;
export async function getPokerBiggestPots(
  limit: number,
  variant?: PokerVariant,
): Promise<PokerBiggestPot[]>;
```

Tests: seed a ~12-row poker fixture (mix of all 3 variants × win/loss/push across past 30 days). Pin each aggregation's output.

### 5.3 Chart wrapper (`src/components/charts/PokerSessionsByVariantBar.tsx`)

Recharts stacked bar — one stack per day, 3 stacked segments (Hold'em gold / Draw brass / Omaha velvet). Uses `ChartTooltipShell` per [#251 pattern](../../PHASE_15_PATTERNS.md#110-chart-tooltip-consistency). Smoke test renders without crashing.

### 5.4 Router + nav

- `src/router.tsx` — `const AdminPokerPage = lazy(() => import('@/pages/admin/AdminPokerPage'));` + lazy route `/admin/poker`.
- `src/pages/admin/AdminLayout.tsx` — insert "Poker" nav entry between "Slots" and "Plinko". Update test.

## 6. Standing rules (recap from `PHASE_15_PATTERNS.md §2`)

1. **Pure logic untouched** — `holdemLogic.ts`, `machine.ts`, `_shared/handEvaluator.ts`, `_shared/sidePots.ts`, `_shared/deck.ts`, `_shared/ai/{archetypes,decide}.ts` byte-stable.
2. **Games sandbox preserved** — no `@/db` or `@/store` imports from `src/games/poker/**`.
3. **One `rounds` row per session** (ADR-0041 — poker exception). PR A doesn't change the wallet model.
4. **Integer money. No `Math.random()`.** ESLint enforces.
5. **Spec-first** — this doc + BUILD_GUIDE amendment land before any code.
6. **No CLAUDE.md edits.**
7. **TS strict + exactOptionalPropertyTypes.**
8. **Commit subject ≤ 100 chars.**
9. **Scopes:** `poker` for game-side, `admin` for `/admin/poker`, `stats` for aggregations, `routing` for router/nav, `ui` for shared primitives, `docs` for spec/plan/ADR/BUILD_GUIDE.
10. **No `--no-verify`, no `--amend`.**
11. **DoD:** `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`
12. **Tokens-only Tailwind** in rebuilt files.

## 7. Risks + watch-outs

- **Card migration breaks Draw / Omaha imports.** Mitigation: PR A first greps for every `_shared/PlayingCard` import; updates all 3 variants' references; runs full `vitest run` to catch regressions.
- **`Card` type re-export.** `_shared/handEvaluator.ts` and `_shared/ai/decide.ts` consume a `Card` type. If MasquerCard's type shape differs, keep `_shared/PlayingCard.tsx` as a 5-line type-only shim re-exporting from `@/components/brand/PlayingCard`. Verify type compatibility before deleting.
- **Reduced-motion swap.** Replacing `useReducedMotion` (framer-motion) with `useEffectiveReducedMotion` (project) changes return semantics (boolean vs `boolean | null`). Update truthy checks accordingly.
- **Showdown stagger collides with auto-next-hand timer.** Current `HoldemPage` schedules `START_HAND` 1.2 s after entering `idle` (post hand-complete). New stagger reveal can take up to 2.1 s. Mitigation: extend the auto-next-hand delay to `max(1200, revealDurationMs + 400)`, OR fire the next hand only after `ShowdownReveal.onRevealComplete`.
- **Setup panel sizing** — apply the [`localgamble-screenshot-before-pushing-ui`](../../../.claude/projects/-Users-adam/memory/feedback_localgamble_screenshot_before_pushing_ui.md) lesson — verify visually before pushing if any layout sizing is uncertain.
- **Existing PlayerCard test pins.** Hold'em / Draw / Omaha component tests likely assert against poker's local `PlayingCard` data-attrs or `aria-label` shape. Migration may force test updates; treat that as part of PR A scope.

## 8. Definition of done

- PR A merged + PR B merged.
- Hold'em looks + sounds + feels like a peer of Plinko / Slots / Blackjack / etc. — same MASQUER chrome, same Velvet Deco palette, same shell affordances.
- Five-Card Draw + Omaha visually inherit card art and brand tokens (no regression on their pages even though their sub-projects are pending).
- `/admin/poker` accessible from the sidebar with Hold'em data populated; Draw / Omaha tabs show their placeholder until v2 / v3 land.
- All Phase 15 standing rules respected; full DoD green per PR.
- Tag candidate: `v0.15.12.v1-holdem` after manual smoke.

## 9. Open questions

None at spec-write time. All four decision points were locked during brainstorming.

## 10. Workflow

Per [`PHASE_15_PATTERNS.md §3`](../../PHASE_15_PATTERNS.md#3-sub-project-workflow):

1. **Spec PR** (this doc).
2. **Plan PR** with task breakdown + inline code stubs (per `feedback-planning-depth`).
3. **PR A** dispatched in parallel with plan-merge.
4. **PR B** dispatched after PR A merges (controller verifies scope, monitors CI, merges).
5. User says "start next" → controller starts #12.v2 Five-Card Draw (per `feedback-phase15-game-sub-project-order`).

---
