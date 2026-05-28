# Phase 15 sub-project #10.v2 — Bingo (American) upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the American 75-ball variant with B-I-N-G-O column headers + free-centre signature. Shared chrome already shipped in #10.v1; this PR ships only American-only variant bits.

**Architecture:** Single small PR. Touches `BingoCard.tsx` (header row + free-centre polish) + its test. Optionally `ballPalette.ts` if the US palette can cleanly tokenise. CpuCardMini skipped (too small to render legible headers). Logic / machine / chrome / admin / British variant all byte-stable.

**Tech Stack:** TypeScript 5 strict + exactOptionalPropertyTypes · React 18 · Vite 5 · Tailwind 3 · Vitest 2 + RTL · pnpm 9.12.

**Spec:** `docs/superpowers/specs/2026-05-26-phase-15-10-v2-bingo-american-design.md` (merging shortly).

---

## Shared rules

1. **Pure logic untouched.** `logic.ts`, `machine.ts`, `useBingoBallCaller.ts` byte-stable.
2. **`VARIANTS.american` config untouched.**
3. **British variant visually unchanged** — headers gated on `variant === 'american'`.
4. **Games sandbox** preserved.
5. **No `Math.random()`. Integer money.**
6. **Commit subject ≤ 100 chars** (`feedback-masquer-commit-subject-limit`).
7. **No `--no-verify`. No `--amend`.**
8. **DoD:**
   ```
   pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
   ```

---

## File structure

| File                                  | Action | Responsibility                                                                                                    |
| ------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| `src/games/bingo/BingoCard.tsx`       | Modify | Add B-I-N-G-O header row above grid when variant=american AND size=large. Polish free-centre (brass ring + glow). |
| `src/games/bingo/BingoCard.test.tsx`  | Modify | Assert headers present for american-large, absent for british, absent for american-small (CpuCardMini case).      |
| `src/games/bingo/ballPalette.ts`      | Modify | OPTIONAL — promote US 5-column hex to brand tokens if a clean mapping exists. Otherwise leave + add comment.      |
| `src/games/bingo/ballPalette.test.ts` | Modify | Update assertions only if §4.3 tokenisation lands.                                                                |

---

## Branch

`git checkout main && git pull origin main && git checkout -b phase-15-10-v2-pr-a`

## Task A.0 — Read context

- [ ] **Step 1: Read the spec** end-to-end.
- [ ] **Step 2: Read `BingoCard.tsx`** to understand the current grid render + free-centre branch.
- [ ] **Step 3: Read `ballPalette.ts`** — note the `americanBallStyle` 5-column hex values for the header colour mapping.
- [ ] **Step 4: Read `src/theme/tokens.ts` + `tailwind.config.ts`** to check whether brand tokens `roulette-pocket-red` / `jewel-sapphire` / `jewel-emerald` / `gold-bright` / `jewel-magenta` exist + which match the 5-column palette closely enough for §4.3.

## Task A.1 — B-I-N-G-O column headers

**Files:** `src/games/bingo/BingoCard.tsx`, `BingoCard.test.tsx`.

- [ ] **Step 1: Inside the `<div>` that wraps the grid in BingoCard,** add a sibling header row BEFORE the grid cells. Gate on `variant === 'american' && isLarge` — both conditions needed (skip on minicards per spec §7).

- [ ] **Step 2: Header row markup.**

  ```tsx
  {
    variant === 'american' && isLarge && (
      <div
        aria-hidden="true"
        data-bingo-column-headers
        className={`grid ${gap} pb-1 font-display tracking-[0.18em]`}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {(['B', 'I', 'N', 'G', 'O'] as const).map((letter, i) => (
          <div
            key={letter}
            data-column-letter={letter}
            className="flex items-center justify-center text-base"
            style={{ color: BINGO_LETTER_COLORS[i] }}
          >
            {letter}
          </div>
        ))}
      </div>
    );
  }
  ```

  `BINGO_LETTER_COLORS` is a tuple of 5 strings — either raw hex matching `americanBallStyle` deep colours OR brand tokens via the §4.3 mapping. Define at module-scope above the component:

  ```tsx
  /** Letter colours for the American B-I-N-G-O header row. Each letter
   *  matches the deep colour of its column's ball palette (per
   *  `americanBallStyle` in ballPalette.ts) so the visual stays consistent
   *  with the called balls. */
  const BINGO_LETTER_COLORS = [
    '#a00000', // B — deep red (matches americanBallStyle 1-15)
    '#1a3060', // I — deep blue (16-30)
    '#c8a000', // N — deep yellow (31-45)
    '#208020', // G — deep green (46-60)
    '#4a2070', // O — deep purple (61-75)
  ] as const;
  ```

  Use the SAME `gap` + `gridTemplateColumns` as the cells so the header letter sits centred over its column.

- [ ] **Step 3: Wrap both header + grid in a containing element.** The current code likely renders the grid directly inside the brass-framed wrapper. To keep header + grid as siblings inside ONE brass frame, switch the existing single `<div className="grid ...">` to a `<div className="flex flex-col ...">` containing the optional header row + the existing grid. Keep the brass border / bg-velvet on the outer wrapper.

  Pseudo:

  ```tsx
  <div className={`flex flex-col ${gap} ${padding} rounded-md border-2 bg-velvet ${highlightBorder}`} data-bingo-card ...>
    {variant === 'american' && isLarge && (<HeaderRow ... />)}
    <div className={`grid ${gap}`} style={{ gridTemplateColumns: ... }}>
      {card.cells.map(...)}
    </div>
  </div>
  ```

- [ ] **Step 4: Update tests** in `BingoCard.test.tsx`:
  - "renders B-I-N-G-O column headers for american-large variant" — find `[data-bingo-column-headers]` and assert 5 child `[data-column-letter]` divs with letters B/I/N/G/O in order.
  - "no column headers for british variant" — `queryByTestid`/`querySelector('[data-bingo-column-headers]')` returns null.
  - "no column headers for american minicard (size=small)" — same assertion.

- [ ] **Step 5: Run tests.**

  ```bash
  pnpm exec vitest run src/games/bingo/BingoCard.test.tsx
  ```

- [ ] **Step 6: Commit.**
  ```bash
  git add src/games/bingo/BingoCard.tsx src/games/bingo/BingoCard.test.tsx
  git commit -m "feat(bingo): B-I-N-G-O column headers on American player card"
  ```

## Task A.2 — Free-centre signature polish

**File:** `src/games/bingo/BingoCard.tsx`.

- [ ] **Step 1: Update the `isFree` branch in the cell render.** Today:

  ```ts
  const bg = isFree
    ? 'bg-gold/30 text-gold-bright'
    : ... ;
  ```

  Polish to:

  ```ts
  const bg = isFree
    ? 'bg-gold/25 text-gold-bright ring-2 ring-brass ring-inset shadow-[0_0_8px_rgba(232,189,109,0.45)]'
    : ... ;
  ```

- [ ] **Step 2: Larger star at large size.** Today's `cellSize` = `'w-12 h-12 text-base'` for large. The free-cell content `★` uses the base size. Either:
  - Add a specific size for free-cell content (e.g. `text-xl` when free + isLarge), OR
  - Leave at `text-base` — implementer judges if the polish (ring + glow) is enough to make the cell feel signature. Simpler is fine.

  Suggested: switch content render to:

  ```tsx
  const content = isFree ? (
    isLarge ? (
      <span className="text-xl leading-none">★</span>
    ) : (
      ''
    )
  ) : (
    cell.value
  );
  ```

- [ ] **Step 3: Optional "FREE" microcopy** — implementer judgment. Skip unless it visibly improves the cell at large size.

- [ ] **Step 4: Update test** — assert centre cell has `ring-brass` class (or `ring-2` if it's already present from elsewhere; pick a specific assertion that's unique to the free-cell branch).

- [ ] **Step 5: Run tests + commit.**

## Task A.3 — US palette tokenisation (OPTIONAL)

**Files:** `ballPalette.ts`, `ballPalette.test.ts`, possibly `BingoCard.tsx` (for `BINGO_LETTER_COLORS` syncing).

- [ ] **Step 1: Read `src/theme/tokens.ts`** to confirm the brand tokens (`jewel-sapphire`, `jewel-emerald`, etc.) match the 5-column intent. Probable verdict: brand tokens DON'T cleanly match (the brand palette has felt-green / velvet / gold / brass / ivory primary + jewel-magenta/sapphire/emerald accents, not the literal red/blue/yellow/green/purple of the BINGO columns).

- [ ] **Step 2: If skip — add an explanatory comment block** above `americanBallStyle` explaining why the hex stays inline:

  ```ts
  /** US 5-column BINGO palette — kept as raw hex because the variant-
   *  intrinsic colours (red B / blue I / yellow N / green G / purple O)
   *  don't have clean brand-token equivalents. The Velvet Deco palette
   *  is felt/velvet/gold/brass-centric; forcing tokens here would dilute
   *  the brand without improving the variant's visual signature. */
  function americanBallStyle(value: number): BallStyle { ... }
  ```

  And mirror the same comment over `BINGO_LETTER_COLORS` in `BingoCard.tsx`.

- [ ] **Step 3: If tokenise — promote the 5 hex values to tokens** in `src/theme/tokens.ts` (likely under a new `bingoColumn` namespace) + update both `americanBallStyle` and `BINGO_LETTER_COLORS` to use them. Update the palette test for the new token shape.

- [ ] **Step 4: Commit (either choice).**

## Task A.4 — Full DoD + open PR

- [ ] **Step 1: Run the full DoD.**
- [ ] **Step 2: Open PR** titled `phase-15(#10.v2): American bingo — B-I-N-G-O headers + free-centre polish` (≤ 100 chars).
- [ ] **Step 3: Report DoD + PR URL.** Do NOT merge.

---

## Self-review

**Spec coverage:**

- §4.1 column headers → A.1
- §4.2 free-centre polish → A.2
- §4.3 palette tokenisation (optional) → A.3
- §4.4 out of scope → respected via §4.5 allowed-paths
- §4.5 scope guardrails → applied per-task

**Placeholder scan:** None.

**Type consistency:** `BINGO_LETTER_COLORS` typed as `const` tuple of 5 strings.

**Risks already flagged in spec §7** carried forward:

- CpuCardMini skipped (gate on `isLarge` in A.1 step 1).
- US palette token mapping subjective → A.3 has the "comment + skip" default.

---
