# Phase 15 sub-project #10.v2 — Bingo (American) upgrade

**Status:** Draft for user review.
**Date:** 2026-05-26.
**Sub-project:** #10.v2 in the Phase 15 umbrella. Follows #10.v1 British ✅ (shared chrome already shipped); precedes #11 Plinko.
**Variant split (from #10.v1 spec):** 10.v1 shipped the shared chrome for both variants + British-only bits. 10.v2 ships only American-only variant bits. Smaller scope.

---

## 1. Goal

Polish the American 75-ball variant with its own visual signature, now that the shared chrome (MASQUER · Bingo title, LobbyButton/OddsInfoBox, RulesModal, sound, dramatic ball-call, scrollable modals, brand tokens, gold daubs, admin stats) is in place from #10.v1.

Three things land here:

1. **B-I-N-G-O column headers** above the 5×5 card grid — the American convention every player expects. British 3×9 has no equivalent.
2. **Free-centre signature polish** — currently a plain `bg-gold/30 text-gold-bright ★`. Add a brass ring + subtle gold-glow + larger star so it reads as the focal anchor of the card.
3. **US palette tokenisation (optional / implementer judgment)** — the 5-column semantic colours (`#ff5050` red B / `#5080d0` blue I / `#fff070` yellow N / `#60d060` green G / `#a060c0` purple O) are currently raw hex in `ballPalette.ts`. If a clear brand-token equivalent exists, promote; otherwise leave inline + comment.

That's it. No chrome, no admin, no sound — all those are already done.

---

## 2. Decomposition

**Single PR.** No spec/plan/PR split.

---

## 3. Standing invariants

1. **Pure logic untouched** — `logic.ts`, `machine.ts`, `useBingoBallCaller.ts` byte-stable.
2. **`VARIANTS.american` config untouched** — `cols: 5`, `rows: 5`, `cellsPerCard: 24`, `hasFreeCenter: true`, column ranges + tier labels all stay.
3. **British variant visually unchanged** — the column-header treatment is variant-gated.
4. **Games sandbox** preserved.
5. **Integer money. No `Math.random()`.**
6. **No CLAUDE.md edits.**
7. **Commitlint header-max-length 100**; `admin` (not `admin-bingo`) for any admin-touching scope (no admin work expected this PR).

---

## 4. Scope (single PR)

### 4.1 B-I-N-G-O column headers (American only)

`BingoCard.tsx` renders a 5×5 (American) or 3×9 (British) grid via `grid-template-columns`. Above the grid for American variants, render a 5-column header row showing "B · I · N · G · O" where each letter is coloured by its corresponding column's ball palette (so B is red, I blue, N yellow, G green, O purple — matching the ball colour scheme).

**Constraints:**

- Headers visible ONLY when `variant === 'american'` (British 3×9 has no letter equivalent).
- Each letter sized proportional to cell size (`isLarge` → ~16-20px; CPU minicards → tiny or hidden if cluttered).
- Header colours mirror the `americanBallStyle` function from `ballPalette.ts` (red / blue / yellow / green / purple).
- Header row sits inside the card's brass-framed velvet panel so the visual reads as one unit.
- `aria-hidden="true"` on the header row — the column headers are decorative; screen readers don't need them (they already read each cell's value).

### 4.2 Free-centre signature polish

Today's free centre: `bg-gold/30 text-gold-bright` with content `★`. Polish to read as the visual anchor:

- **Brass ring** (`ring-2 ring-brass` or `border-2 border-brass`) around the cell.
- **Subtle gold-glow** via `shadow-[0_0_8px_rgba(232,189,109,0.45)]` (or a `shadow-gold-glow` token if one exists).
- **Slightly larger star** — `text-lg` instead of base size (or a custom font-size that fits the cell).
- **Optional**: a small "FREE" microcopy below the star at the largest size — implementer's judgment. Skip if it crowds the cell.

The polish should make the centre cell the unmistakable focal point of every American card.

### 4.3 US palette tokenisation (optional)

The `americanBallStyle` function in `ballPalette.ts` currently hard-codes the 5-column hex values. Per the brand-token rule, these should be tokens if a brand-named equivalent exists. Likely options:

- `roulette-pocket-red` for B
- `jewel-sapphire` for I
- `gold-bright` for N
- `jewel-emerald` for G
- `jewel-magenta` for O (but the brand reserves jewel-magenta for jackpot signature; risk of dilution)

If a clean mapping doesn't exist, leave the raw hex + add a comment block explaining the intent. Don't add new "bingo-column-\*" tokens just for this — the brand palette is rich enough already.

Same goes for the header letter colours in §4.1 — pair them with whatever tokens the palette settles on.

### 4.4 Out of scope

- New gameplay (no Pattern Bingo, no Speed Bingo).
- British variant changes.
- Logic / machine / caller / admin touches.
- `BingoRules` content — already covers both variants from 10.v1.

### 4.5 Scope guardrails

**Allowed:**

- `src/games/bingo/BingoCard.tsx` + test
- `src/games/bingo/CpuCardMini.tsx` + test (if column headers extend down here at minicard size; can skip if too cluttered)
- `src/games/bingo/ballPalette.ts` + test (only for §4.3 tokenisation if pursued)

**Not allowed:**

- `logic.ts`, `machine.ts`, `useBingoBallCaller.ts` — byte-stable.
- Other games or admin pages.
- New tokens (use existing brand palette; raw hex acceptable for the variant-intrinsic colours).

---

## 5. Sub-project workflow

1. **Spec PR** (this doc).
2. **Plan PR** — short, since scope is small.
3. **Implementation PR** — single, small.
4. Then user "start next" → #11 Plinko.

---

## 6. Testing

- BingoCard test: when `variant === 'american'`, assert 5 column headers render with letters B/I/N/G/O in expected order + colour mapping.
- British test: assert headers absent when `variant === 'british'`.
- Free-centre test: assert centre cell has brass-ring class + star content.

---

## 7. Risks

- **CpuCardMini column headers** — minicards are tiny (3-4px per cell from §3.7's `w-3 h-3 text-[0px]`); a header letter row would be unreadable. Implementer should likely SKIP headers on CpuCardMini and only render them on the player's full-size card.
- **US palette token mapping subjective** — if the brand-token equivalents don't read right, keep the raw hex. Don't force a poor visual fit for the sake of the brand-tokens rule.

---

## 8. Self-review

1. Placeholder scan: none.
2. Internal consistency: variant split makes sense (10.v1 chrome + British / 10.v2 American). No overlap.
3. Scope check: small, single-PR.
4. Ambiguity check: §4.3 palette tokenisation is explicitly optional; §7 flags the CpuCardMini header risk.

---
