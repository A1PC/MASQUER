# ADR-0047: Plinko peg geometry + RTP retune

- Status: Accepted
- Date: 2026-05-27
- Deciders: Developer
- Amends: BUILD_GUIDE.md §10.7 (board size + bet ceilings) — retunes
  `MULTIPLIER_CURVES` for the larger board. Refines ADR-0016 (one
  `rounds` row per ball — unchanged) and the original Phase 12
  Plinko design (`docs/superpowers/specs/2026-05-20-phase-12-plinko-design.md`).

## Context

Phase 15 #11 Plinko upgrade — the user flagged three blocking issues
with the shipped (`v0.12-plinko`) implementation:

1. The bucket row sat well below the bottom peg row, with the edge
   buckets visually disconnected from any peg above them.
2. The ball trajectory used independent `±2%` percent math that didn't
   share geometry with the static peg grid — visually the ball "looked
   like" bin X while the resolved outcome was bin Y for many drops.
3. Bet ceiling (5,000 / ball) and auto-session cap (100 balls / session)
   were too tight for the modern-casino feel the user wanted.

Plus a directional ask for a bigger pyramid (more rows, more bins) so
the board reads as the focal piece of the screen.

## Decision

**Rebuild the peg field as a true triangular pyramid + retune the
multiplier curves for the new bin count.**

### Geometry (`src/games/plinko/geometry.ts` — pure)

- Row R has R+1 pegs. Row 0 = 1 peg at the apex (x=50%); row 25 = 26
  pegs spanning the full width. Constant horizontal step between
  adjacent pegs: `stepX = 100 / (ROW_COUNT - 1) = 4%`. Row width =
  `row × stepX`, centred. Y is linear from 0 (apex) to 100% (base).
- 27 buckets sit immediately below the bottom peg row, each centred on
  a peg gap. Bin B's centre is at `(B - 0.5) × stepX`; bin 0 sits half
  a step left of the leftmost bottom peg (`x = -2`), bin 26 mirrors
  (`x = 102`). Centre bin (13) sits at `x = 50`.
- `pegPosition(row, col)` returns `{x, y}` percentages; `binCentreX(bin)`
  returns the x-percent for bucket centres; `pathColumns(path)` resolves
  a drop's L/R sequence to the per-row peg column.
- **Critical invariant** (pinned by `geometry.test.ts`): for every drop,
  the ball's final-frame x equals `binCentreX(bin)`. The trajectory
  builder (`FallingBall.tsx`) and the bucket renderer (`BinRow.tsx`)
  both consume the same geometry helpers, so the visible bounce path
  always matches the resolved outcome.

### Board size bump (20 → 26 rows; 21 → 27 bins)

`ROW_COUNT = 26`, `BIN_COUNT = 27`. The pyramid is rendered at
`h-[78vh]` so it dominates the screen. Pegs render as small brass discs.

### `MULTIPLIER_CURVES` retune

Doubling the row count makes edge events ~64× rarer (`1 / 2^20 ≈ 9.5e-7`
→ `1 / 2^26 ≈ 1.5e-8`), so the curves have to scale up at the edges to
keep RTP in a play-money-fair band. Each curve is a 27-element
symmetric array, monotonically non-increasing from edge (bin 0) to
centre (bin 13). Each risk's RTP under `Binomial(26, 0.5)` lands in
`[0.95, 0.98]`:

| Risk   | Edge × | Centre × | RTP    |
| ------ | ------ | -------- | ------ |
| Safe   | 45     | 0.94     | ~0.978 |
| Low    | 700    | 0.89     | ~0.966 |
| Medium | 6,000  | 0.80     | ~0.958 |
| High   | 60,000 | 0.71     | ~0.954 |

Verified by `MULTIPLIER_CURVES RTP` test in `logic.test.ts`.

### Bet ceilings

- `MAX_BET = 1_000_000` chips / ball (was 5,000).
- `MAX_AUTO_BALLS = 1_000` balls / auto session (was 100).
- Chip ladder unchanged (10–1000 chip denominations); player can stack
  to 1M / ball via the bet input.

## Consequences

- **Visible-outcome alignment locked.** The trajectory now traces the
  exact RNG path; the test pin `final-frame x === binCentreX(bin)` is
  load-bearing — if it ever fails, the player sees the wrong bucket
  "win" and the system is broken. CI catches drift immediately.
- **House net swings are wider.** A single 1M-stake ball at High risk
  edge = 60B-chip payout. For play money this is fine, but the admin
  page's House Net stat (PR B) needs to handle large negative numbers.
- **Edge events are ~64× rarer.** A High-risk centre-bin landing
  (probability ~15.5%) pays 0.71× stake — still loss territory, just
  slightly steeper than before. The 60,000× edge probability is
  ~3e-8, i.e. ~3 in 100 million drops. Auto-session of 1,000 balls
  has effective edge-hit probability ~3e-5, so jackpot moments stay
  scarce.
- **`dropBall` and `payoutFor` shape preserved** — only constants and
  curve values changed. All RNG seeding, machine state, settle
  accounting, and `rounds`-row writes are unchanged. The Phase 12
  ADR-0016 contract (one row per ball) still holds.
- **Auto sessions can run ~4 minutes** at fast interval (1000 × 250 ms
  = 250 s). Performance budget: existing `inFlightBalls[]` already
  supports many balls; visual smoke-tested during A.8.

## References

- Plan: `docs/superpowers/plans/2026-05-27-phase-15-11-plinko-plan.md` §A.1
- Spec: `docs/superpowers/specs/2026-05-27-phase-15-11-plinko-design.md` §4.3, §4.4
- BUILD_GUIDE §10.7 (amended).
- Phase 12 release notes: `v0.12-plinko`.
