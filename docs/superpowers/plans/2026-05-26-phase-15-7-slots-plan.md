# Phase 15 sub-project #7 — Slots upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 15 sub-project #7 — re-skin the 3-reel single-payline slot machine on the MASQUER / Velvet Deco design system, replace CSS-only symbol art with proper inline-SVG drawings, restructure the page into a two-column layout (paytable left rail / reels right column with larger symbols), implement sticky-bet behaviour (bet persists across spins, CLEAR BET is the only reset, single-step SPIN), wire `useSound` for chip / spin / reel-stop / win-tier audio, adopt the shared `LobbyButton` + `OddsInfoBox` + scrollable rules pattern, and rewrite the rules.

**Architecture:** Single PR. Pure logic (`logic.ts` / `symbols.ts` / `types.ts` / `config.ts` + their tests) is byte-stable — RNG, weights, paytable, win tiers all locked by ADR-0032 + ADR-0033. The XState machine (`machine.ts`) is also byte-stable (no rule changes). The work is all UI / shell / audio / sticky-bet, plus a small additive prop on the shared `BettingPanel` to enable sticky-bet without breaking Blackjack / Coin-flip / Roulette.

**Tech Stack:** TypeScript 5 strict + exactOptionalPropertyTypes · React 18 · Vite 5 · Tailwind 3 · XState v5 + @xstate/react · Framer Motion 12 + `useEffectiveReducedMotion` · Vitest 2 + RTL · Storybook 8 · pnpm 9.12 · alias `@/* → src/*`.

**Spec:** `docs/superpowers/specs/2026-05-25-phase-15-7-slots-design.md` (merged at #239). Read it before each task batch — especially §4.3.1 (symbols), §4.3.2 (layout), §4.8 (sticky-bet), §4.9 (header).

---

## Shared rules (apply to every task)

1. **Pure logic untouched.** Do NOT modify `src/games/slots/logic.ts`, `symbols.ts`, `types.ts`, `machine.ts`, or their `*.test.ts`. `config.ts` constants stay byte-stable too — max-bet is already 1000.
2. **Games sandbox** preserved. No `@/db` or `@/store` imports from `src/games/slots/**`. Wallet via `@/systems/**` / `@/store/walletStore` only (existing pattern in `SlotsPage.tsx`).
3. **One `rounds` row per spin** (ADR-0016). Sticky-bet does NOT change this — each SPIN still calls `placeBet` + `settleRound` independently. There's no shared handle across spins.
4. **Integer money. No `Math.random()`.** ESLint enforces.
5. **Spec-first.** This plan + spec are merged before code. No new ADRs expected; if sound samples need an asset note, append a small section to ADR-0033.
6. **No CLAUDE.md edits.**
7. **Commit subject ≤ 100 chars** — commitlint Meta files fails otherwise (captured in `feedback-masquer-commit-subject-limit`).
8. **No skipping git hooks.** Husky + lint-staged + prettier must run on every commit. No `--no-verify`. No `--amend` — soft-reset + new commit if you need to rewrite.
9. **DoD before opening the PR:**
   ```
   pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
   ```
10. **TS strict + exactOptionalPropertyTypes.** Optional fields via `{...(cond ? {key: val} : {})}` spread, never `key: undefined`.
11. **Tokens-only Tailwind** in the rebuilt files. The exceptions are intrinsically colour-bearing brand surfaces (e.g. magenta jackpot tubing) — codify those as tokens (`jewel-magenta` etc.) in `tailwind.config.ts` + `src/theme/tokens.ts` if missing.

---

## File structure

| File                                                          | Action  | Responsibility                                                                                                                                                                                          |
| ------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/games/_shared/BettingPanel.tsx`                          | Modify  | Add `persistBetAcrossCommit?: boolean` AND `singleStepCommit?: boolean` props. Default both `false` → no behaviour change for existing callers.                                                         |
| `src/games/_shared/BettingPanel.test.tsx`                     | Modify  | New tests for both props (sticky bet across multiple commits; single-step skips the PLACE BET intermediate state).                                                                                      |
| `src/games/slots/SymbolView.tsx`                              | Rewrite | Replace CSS-only art with inline SVG for cherry / lemon / bell / BAR / seven. MasquerCard RoyalArt quality bar. Seven uses real `feGaussianBlur` neon-tubing.                                           |
| `src/games/slots/SymbolView.test.tsx`                         | Modify  | Update DOM assertions to match the new SVG shape; per-symbol aria-label preserved.                                                                                                                      |
| `src/games/slots/ReelView.tsx`                                | Modify  | Tokenize colours; enlarge the per-symbol cell to ~110-120 px to match the new layout; brass frame styling.                                                                                              |
| `src/games/slots/ReelView.test.tsx`                           | Modify  | Update class-name assertions if any moved.                                                                                                                                                              |
| `src/games/slots/Paytable.tsx`                                | Modify  | Tokenize; layout for the new left-rail position (narrow column, ~280-320 px wide, vertical list).                                                                                                       |
| `src/games/slots/Paytable.test.tsx`                           | Modify  | Update class-name assertions if any.                                                                                                                                                                    |
| `src/games/slots/SlotsPage.tsx`                               | Rewrite | Title `MASQUER · Slots`; remove `meta`; add LobbyButton + OddsInfoBox; two-column grid; sticky-bet wiring (drop `bettingPanelKey` remount); single-step SPIN; `useSound` integration; tokenize colours. |
| `src/games/slots/SlotsPage.test.tsx`                          | Rewrite | New assertions: title, LobbyButton + OddsInfoBox presence, two-column structure, sticky-bet across two spins, single-step SPIN flow, sound mocks fire correctly.                                        |
| `src/games/slots/rules.tsx`                                   | Rewrite | New rules content per spec §4.5: object, paytable, how spins resolve, win tiers, bet limits, RTP.                                                                                                       |
| `scripts/gen-audio.mjs`                                       | Modify  | Add `reel.stop` (short percussive thunk) and optionally `win.jackpot` (longer / brighter than `win.medium`). Commit generated WAV files.                                                                |
| `src/systems/sound/ids.ts` (or wherever sample-key map lives) | Modify  | Register new sample key(s).                                                                                                                                                                             |
| `src/systems/sound/engine.ts`                                 | Modify  | Map new keys to URLs.                                                                                                                                                                                   |
| `src/assets/audio/reel-stop.wav`                              | Create  | Generated by gen-audio.                                                                                                                                                                                 |
| `src/assets/audio/win-jackpot.wav`                            | Create  | Generated by gen-audio (only if NEW; else reuse `win.medium`).                                                                                                                                          |
| `tailwind.config.ts`                                          | Modify  | Add `jewel-magenta` and any new `slots-symbol-*` tokens if needed.                                                                                                                                      |
| `src/theme/tokens.ts`                                         | Modify  | Mirror new tokens.                                                                                                                                                                                      |
| `docs/adr/0033-slots-tiered-win-celebration.md`               | Modify  | Append a small "Phase 15 #7 amendment" note: jackpot magenta promoted to `jewel-magenta` token; sound stingers wired (`win.small` / `win.medium` / `win.jackpot`); tier semantics unchanged.            |

---

## Branch

`git checkout main && git pull origin main && git checkout -b phase-15-7-pr-a`

## Task A.0 — Read context (10 min)

- [ ] **Step 1: Read the spec.** Open `docs/superpowers/specs/2026-05-25-phase-15-7-slots-design.md`. Skim §3 invariants, §4.1–4.9 scope, §7 risks, §8 self-review.
- [ ] **Step 2: Read the current slots files** you'll be touching (`SlotsPage.tsx`, `SymbolView.tsx`, `ReelView.tsx`, `Paytable.tsx`, `rules.tsx`, `config.ts`). Internalise the current shape.
- [ ] **Step 3: Read the shared BettingPanel.** Open `src/games/_shared/BettingPanel.tsx`. Note the current `committed` state machine: chip clicks accumulate `amount`, PLACE BET click fires `onCommit(amount)` and sets `committed = amount`, after which the panel renders `callButtons(committed)` and hides PLACE BET. The new sticky-bet behaviour replaces this two-step flow with a single-step flow for slots.
- [ ] **Step 4: Read the reference pages.** `BlackjackPage.tsx`, `CoinFlipPage.tsx`, `RoulettePage.tsx` — confirm how LobbyButton / OddsInfoBox / useSound are wired. Mirror the wiring style.
- [ ] **Step 5: Read existing symbol art in `SymbolView.tsx`.** Note each symbol's current visual (cherry: two divs + stem; lemon: ellipse + nubs; bell: shaped div + glow; BAR: text in a frame; seven: text with magenta shadow). This is what you're replacing with proper SVG.

## Task A.1 — Sound assets + sample-key registration

**Files:** `scripts/gen-audio.mjs`, `src/systems/sound/ids.ts` (or equivalent), `src/systems/sound/engine.ts`, `src/assets/audio/reel-stop.wav`, optionally `src/assets/audio/win-jackpot.wav`.

- [ ] **Step 1: Read `scripts/gen-audio.mjs`** to understand the existing sample-generation helper style. Recent additions (Phase 15 #4 coin-flip, #6 roulette `wheel.spin` / `ball.drop`) are good references.
- [ ] **Step 2: Add `reel.stop`.** A short (~80 ms) percussive thunk — a single attack envelope on a low (~140 Hz) sine + a slight click transient. The shape: 0 → peak in 5 ms, decay to silence over 75 ms. Should sound like a slot reel mechanically catching at its stop position.
- [ ] **Step 3: Decide on `win.jackpot`.** Audit existing `win.medium`. If it's already triumphant enough to do double duty, **skip** generating a new sample (use `win.medium` in slots' jackpot tier and document the reuse in your PR description). Otherwise generate a brighter, longer (~1 s) variant with a higher-frequency arpeggio sweep. Implementer's call.
- [ ] **Step 4: Register the key(s).** Add `'reel.stop'` (and `'win.jackpot'` if generated) to the sample-key map. Mirror the existing entries' shape.
- [ ] **Step 5: Run the generator.** `node scripts/gen-audio.mjs`. Commit the generated `.wav` file(s) alongside.
- [ ] **Step 6: Typecheck + targeted test.**
  ```bash
  pnpm typecheck
  pnpm exec vitest run src/systems/sound
  ```
- [ ] **Step 7: Commit.**
  ```bash
  git add scripts/gen-audio.mjs src/systems/sound/ src/assets/audio/reel-stop.wav
  # (and win-jackpot.wav if generated)
  git commit -m "feat(slots): reel.stop sound sample + (optional) win.jackpot variant"
  ```

## Task A.2 — `BettingPanel` sticky-bet + single-step API

**Files:** `src/games/_shared/BettingPanel.tsx`, `src/games/_shared/BettingPanel.test.tsx`.

The current panel has a two-step flow (chips → PLACE BET → callButtons). Slots needs a one-step flow (chips → SPIN, where SPIN IS the commit) AND wants the bet amount to persist across spins. Both behaviours are opt-in props so Blackjack / Coin-flip / Roulette keep their existing flow.

- [ ] **Step 1: Add the new props.** Update the `Props` interface:

  ```ts
  /** When true, the bet `amount` is NOT cleared after the caller's onCommit
   *  fires. Used by Slots so the player can spin again with the same bet
   *  without re-selecting chips. CLEAR BET still resets explicitly. */
  persistBetAcrossCommit?: boolean;

  /** When true, the panel does NOT render an intermediate PLACE BET button
   *  and does NOT track an internal `committed` state. The caller's
   *  `callButtons` always receives the current `amount` (or null when 0),
   *  and the caller is responsible for both placing the bet and triggering
   *  the action in one event. Slots uses this so SPIN is the commit. */
  singleStepCommit?: boolean;
  ```

  Defaults: both `false` → no behaviour change for existing callers.

- [ ] **Step 2: Wire `singleStepCommit`.** When `true`:
  - Don't render the PLACE BET button at all.
  - Don't track the `committed` state.
  - Pass `amount` (or `amount > 0 ? amount : null`) to `callButtons`.
  - `callButtons` is always rendered (not gated on `committed !== null`).
  - The caller's handler in `callButtons` is responsible for calling `onCommit(amount)` AND running the action.

- [ ] **Step 3: Wire `persistBetAcrossCommit`.** When `true`, do NOT reset `amount` after `onCommit` fires. (Today the panel only resets `amount` if the caller remounts via key. With this prop, the caller is signalling "don't depend on remount.")

  Note: `persistBetAcrossCommit` and `singleStepCommit` are independent but commonly co-used. Slots will pass both. Blackjack/Coin-flip/Roulette pass neither (default `false`).

- [ ] **Step 4: Test the new props.**

  ```ts
  // BettingPanel.test.tsx — additions
  it('singleStepCommit: renders no PLACE BET button; callButtons sees current amount', () => {
    const onCommit = vi.fn();
    render(
      <BettingPanel
        min={5} max={1000} balance={1000}
        onCommit={onCommit}
        singleStepCommit
        callButtons={(amount) => (
          <button data-testid="action" onClick={() => amount !== null && onCommit(amount)}>
            ACT
          </button>
        )}
      />
    );
    // No PLACE BET
    expect(screen.queryByRole('button', { name: /place bet/i })).toBeNull();
    // Add a 25 chip
    fireEvent.click(screen.getByRole('button', { name: /Add 25 chips to bet/i }));
    fireEvent.click(screen.getByTestId('action'));
    expect(onCommit).toHaveBeenCalledWith(25);
  });

  it('persistBetAcrossCommit: amount stays after onCommit; CLEAR resets', async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(
      <BettingPanel
        min={5} max={1000} balance={1000}
        onCommit={onCommit}
        singleStepCommit
        persistBetAcrossCommit
        callButtons={(amount) => (
          <button data-testid="action" onClick={() => amount !== null && onCommit(amount)}>
            ACT
          </button>
        )}
      />
    );
    await user.click(screen.getByRole('button', { name: /Add 25 chips to bet/i }));
    await user.click(screen.getByTestId('action'));
    await user.click(screen.getByTestId('action'));
    // Both commits fire with 25 — amount persisted across the first.
    expect(onCommit).toHaveBeenNthCalledWith(1, 25);
    expect(onCommit).toHaveBeenNthCalledWith(2, 25);
    // CLEAR resets to 0
    await user.click(screen.getByRole('button', { name: /clear/i }));
    // Action with amount=0 won't fire onCommit per the test's gate
    await user.click(screen.getByTestId('action'));
    expect(onCommit).toHaveBeenCalledTimes(2);
  });
  ```

- [ ] **Step 5: Run.**

  ```bash
  pnpm exec vitest run src/games/_shared/BettingPanel.test.tsx
  ```

- [ ] **Step 6: Commit.**
  ```bash
  git add src/games/_shared/BettingPanel.tsx src/games/_shared/BettingPanel.test.tsx
  git commit -m "feat(theme): BettingPanel singleStepCommit + persistBetAcrossCommit props"
  ```

## Task A.3 — Symbol art rewrite (inline SVG)

**Files:** `src/games/slots/SymbolView.tsx`, `src/games/slots/SymbolView.test.tsx`.

Replace each CSS-only symbol with an inline SVG that has proper depth and lighting. Use the spec §4.3.1 descriptions as the visual target.

- [ ] **Step 1: Rewrite the file structure.** Keep the `SymbolProps` interface, the `SYMBOL_DISPLAY` import, the per-symbol switch, and the aria-label / data-attributes. Replace the five `*Art` components with SVG versions.

- [ ] **Step 2: Cherry SVG.** Two cherries with stems + a leaf. Use:
  - A leaf path with veining stroke (`stroke-width="0.3"`)
  - Stem `<path>` in muted green (`stroke="#4a7c2d"`, `stroke-width="2"`)
  - Two cherry `<circle>`s with `<radialGradient>` fills (highlight at 30% 30%, deeper red at edge). Suggested gradient IDs: `cherry-fill-l`, `cherry-fill-r` (unique per render so don't collide).
  - Small white highlight `<ellipse>` on each cherry for the gloss spot.

- [ ] **Step 3: Lemon SVG.** Ellipse with peel texture:
  - Base `<ellipse>` with `<radialGradient>` (light yellow center → deeper yellow edge)
  - 8-12 small `<circle r="0.6">` for peel stipple, lightly randomized positions, fill `#d4a300`
  - Two small leaf-stem nubs at ends (`<ellipse>`)
  - Subtle outer drop-shadow via `<filter id="lemon-shadow">` `<feDropShadow>`.

- [ ] **Step 4: Bell SVG.** Gold bell:
  - Bell body as a `<path>` (the classic bell silhouette: rounded top, flaring bottom, slight base)
  - Brushed-brass gradient (use a `<linearGradient>` from `#ffe066` at top to `#a07a00` at bottom)
  - Small `<circle>` clapper at the bottom centre (darker gold, with a highlight ellipse)
  - Thin `<rect>` crown / hanger at top
  - Optional: 2-3 tiny `<line>` motion-flourish strokes on either side at low opacity — skip if cluttered.

- [ ] **Step 5: BAR SVG.** Chrome plate:
  - Rounded `<rect>` with a brushed-brass `<linearGradient>`
  - `<text x="50%" y="55%" text-anchor="middle" font-family="Bungee" font-size="14" font-weight="bold" fill="#06120c">BAR</text>` for the embossed look
  - A thin highlight `<line>` across the top inner edge
  - Bevels via subtle darker `<line>` strokes on the bottom/right edges
  - A separate `<text>` clone for the embossed-shadow effect (offset by 1px, darker fill, lower opacity).

- [ ] **Step 6: Seven SVG.** Magenta neon-tubing 7:
  - SVG `<filter id="seven-glow">` with `<feGaussianBlur stdDeviation="2">` + `<feMerge>` for a true glow effect.
  - Outer tube: thick `<path>` (or styled `<text>`) at width 6, semi-transparent magenta (`stroke="#ff5cf2"`, `stroke-opacity="0.4"`).
  - Inner tube: same path at width 2.5, solid bright magenta.
  - Optional pure-white inner highlight `<path>` at width 0.8.
  - Apply the glow filter to the whole group.

- [ ] **Step 7: Update tests.** `SymbolView.test.tsx` likely asserts presence + aria-label per symbol. Update any assertions that check class names or inline styles that have moved. Add a smoke that the SVG has a `<svg>` root with the expected viewBox.

- [ ] **Step 8: Run.**

  ```bash
  pnpm exec vitest run src/games/slots/SymbolView.test.tsx
  ```

- [ ] **Step 9: Commit.**
  ```bash
  git add src/games/slots/SymbolView.tsx src/games/slots/SymbolView.test.tsx
  git commit -m "feat(slots): inline SVG art for cherry / lemon / bell / BAR / seven"
  ```

## Task A.4 — Tokenize ReelView / Paytable + enlarge reels

**Files:** `src/games/slots/ReelView.tsx`, `src/games/slots/ReelView.test.tsx`, `src/games/slots/Paytable.tsx`, `src/games/slots/Paytable.test.tsx`.

- [ ] **Step 1: Tokenize ReelView colours.** Replace any raw hex / dark `bg-*` with brand tokens. The reel frame uses `border-brass` + `bg-velvet-deep`. Symbol cells use `bg-felt-table-deep` background with `border-brass/40` separators.

- [ ] **Step 2: Enlarge the reel cells.** Today's cells are likely ~64-80 px tall. Bump to **~110 px** to match the larger layout. Symbol passed `size={96}` (or whatever fits with cell padding). Visual goal: each reel is taller, more prominent.

- [ ] **Step 3: Tokenize Paytable.** Replace raw hex. Use a vertical list format (one row per paytable entry) suitable for a left-rail narrow column. Each row: `[symbol art at size 24] [name] [payout]`. The current row layout can stay if it's already vertical; just colour-token swap.

- [ ] **Step 4: Update tests** for any class-name assertions that moved.

- [ ] **Step 5: Run.**

  ```bash
  pnpm exec vitest run src/games/slots/ReelView.test.tsx src/games/slots/Paytable.test.tsx
  ```

- [ ] **Step 6: Commit.**
  ```bash
  git add src/games/slots/ReelView.tsx src/games/slots/ReelView.test.tsx src/games/slots/Paytable.tsx src/games/slots/Paytable.test.tsx
  git commit -m "feat(slots): tokenize ReelView + Paytable; enlarge reel cells to 110px"
  ```

## Task A.5 — Rules rewrite

**File:** `src/games/slots/rules.tsx`.

- [ ] **Step 1: Rewrite per spec §4.5.** Mirror the section structure used in `src/games/blackjack/rules.tsx` (sectioned `<h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">` headings, body `text-ivory/85`, tight sections).

  Sections:
  - **Object** — Match three symbols on the centre payline. Two cherries pays too.
  - **Symbols & paytable** — Table with the 6 paytable rows. Lead with 7-7-7 = 50×.
  - **How spins resolve** — RNG per reel; spin animation is cosmetic; the third reel has a deliberate suspense gap.
  - **Win tiers** — Small / Medium / Jackpot per ADR-0033.
  - **Bet limits** — 5–1000 per spin. Sticky bet: tap SPIN repeatedly with the same chips.
  - **RTP** — ~86%, weights locked.

- [ ] **Step 2: Commit.**
  ```bash
  git add src/games/slots/rules.tsx
  git commit -m "docs(slots): rewrite rules — tiers + sticky bet + RTP"
  ```

## Task A.6 — `SlotsPage` rewrite (the big one)

**Files:** `src/games/slots/SlotsPage.tsx`, `src/games/slots/SlotsPage.test.tsx`.

This is the largest task in the plan. Bundles: title change, meta removal, LobbyButton + OddsInfoBox adoption, two-column layout, sticky-bet wiring, single-step SPIN, sound integration, colour tokenization.

- [ ] **Step 1: Read the current `SlotsPage.tsx` end to end** to internalise the existing flow (handlePlaceAndSpin, handleSpinClick, the BettingPanel + SPIN button placement, the WinCelebration component, the `bettingPanelKey` remount).

- [ ] **Step 2: Update imports.** Add:

  ```ts
  import LobbyButton from '@/games/_shared/LobbyButton';
  import OddsInfoBox from '@/games/_shared/OddsInfoBox';
  import { useSound } from '@/systems/sound/useSound';
  import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
  ```

  Replace `useReducedMotion` from framer-motion with `useEffectiveReducedMotion` for consistency.

- [ ] **Step 3: Title + meta.**

  ```tsx
  <GameShell
    title="MASQUER · Slots"
    game="slots"
    lobbyButton={<LobbyButton />}
    oddsInfo={
      <OddsInfoBox>
        3× 7 50:1 · 3× BAR 20:1 · 3× Bell 12:1 · 3× Lemon 8:1 · 3× Cherry 5:1 · 2× Cherry 2:1
      </OddsInfoBox>
    }
    recentItems={recentItems}
    rules={<SlotsRules />}
    bettingPanel={...}
  >
  ```

  Remove the `meta=` prop entirely.

- [ ] **Step 4: BettingPanel sticky-bet + single-step.**

  Drop the `bettingPanelKey = state.context.spinCount` remount entirely — sticky-bet means the panel persists across spins. Pass `persistBetAcrossCommit` and `singleStepCommit` to the panel:

  ```tsx
  <BettingPanel
    min={SLOTS_CONFIG.MIN_BET}
    max={SLOTS_CONFIG.MAX_BET}
    balance={balance}
    persistBetAcrossCommit
    singleStepCommit
    onCommit={(amount) => {
      // No-op — Slots fires placeBet inside the SPIN button's onClick
      // because we need access to the async wallet result before sending
      // to the machine. The amount is captured by callButtons via `amount`
      // (currentAmount below).
    }}
    callButtons={(currentAmount) => {
      const amount = currentAmount ?? 0;
      const canSpin = amount >= SLOTS_CONFIG.MIN_BET && amount <= balance && !inSpinning;
      return (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void handlePlaceAndSpin(amount)}
            disabled={!canSpin}
            className="..."
          >
            SPIN
          </button>
        </div>
      );
    }}
  />
  ```

  `handlePlaceAndSpin` already exists in the current page — it's the right function. It takes an amount, calls `placeBet`, sends `PLACE_BET` + `SPIN` to the machine. No changes needed.

  Play `chip.place` sound on chip click via a `BettingPanel` callback if available, or wire inside `ChipDenominationButton` for global behaviour. Implementer's call. (Note: today the chip-place sound is wired in Blackjack/Coin-flip/Roulette via `useSound().play('chip.place')` on chip click — verify pattern and apply.)

- [ ] **Step 5: Sound wiring.**

  ```ts
  const { play } = useSound();
  ```

  - `play('chip.place')` on each chip click. Hook through whichever mechanism your other games use (likely a `onChipClick` callback added to `BettingPanel` if not already present, OR a callback on `ChipDenominationButton` — implementer matches the pattern).
  - `play('wheel.spin')` when the machine enters `spinning` (gate on `inSpinning` state transition via a `useEffect`).
  - `play('reel.stop')` × 3 at the configured reel-stop times. Easiest: a `useEffect` that schedules three `setTimeout` callbacks when entering `spinning`, each firing `play('reel.stop')` at `SLOTS_CONFIG.REEL_STOP_TIMES_MS[i]`. Clear on unmount or on transition out of spinning.
  - `play('win.small' | 'win.medium' | 'win.jackpot')` on settle, gated on `roundResult.details.winTier`.
  - `play('loss')` on settle if `netChange < 0` and tier is `none`.
  - All gated on `useEffectiveReducedMotion()` returning false (reduced-motion skips audio).

- [ ] **Step 6: Two-column layout.** The current play area is `<div className="relative grid flex-1 grid-cols-[auto_1fr] items-center gap-6 px-4 py-6">`. The grid already exists; verify it produces the desired layout with the enlarged reels. Tweak gaps + padding to suit the new symbol size.

  Confirm responsive behaviour: on small viewports, stack via `flex flex-col md:grid md:grid-cols-[auto_1fr]` (or similar). Implementer judges.

- [ ] **Step 7: Tokenize remaining colours.** The `<style>` block has `slotsJackpotTint`, `slotsMediumBurst`, `slotsCoinFall` keyframes — those reference `rgba(255,92,242,...)` and `rgba(212,175,55,...)`. These are intrinsic brand colours; keep them but promote to the new `jewel-magenta` / `gold` token CSS variables if Tailwind exposes them. Otherwise inline-token reference via CSS custom properties.

  `WinCelebration` component (defined in the same file): tokenize the `borderColor`, `background`, `color`, `textShadow` inline styles. Use `#06120c` (the existing background) via token if it exists (it might be `bg-felt-table-deep`).

- [ ] **Step 8: Rewrite the tests.** `SlotsPage.test.tsx` needs:
  - Title `MASQUER · Slots` assertion.
  - LobbyButton + OddsInfoBox presence.
  - Sticky-bet across two spins: add 25 chips → SPIN → wait → SPIN again → assert 2 placeBet calls with amount 25.
  - CLEAR BET resets and disables SPIN.
  - Sound mocks: `useSound` mocked; assert `play('chip.place')` fires on chip click, `play('wheel.spin')` on SPIN, `play('reel.stop')` × 3 during the spin (with fake timers, advance through the 3/5/8s schedule), `play('win.*')` on settle.

- [ ] **Step 9: Run.**

  ```bash
  pnpm exec vitest run src/games/slots/SlotsPage.test.tsx
  ```

- [ ] **Step 10: Commit.**
  ```bash
  git add src/games/slots/SlotsPage.tsx src/games/slots/SlotsPage.test.tsx
  git commit -m "feat(slots): MASQUER · Slots page rebuild — sticky bet + sound + layout"
  ```

## Task A.7 — Token additions + ADR-0033 amendment

**Files:** `tailwind.config.ts`, `src/theme/tokens.ts`, `docs/adr/0033-slots-tiered-win-celebration.md`.

- [ ] **Step 1: Add `jewel-magenta` token** if missing (likely missing — roulette didn't need it):

  ```ts
  // src/theme/tokens.ts and tailwind.config.ts
  'jewel-magenta': '#ff5cf2',
  ```

- [ ] **Step 2: Append the amendment to ADR-0033.**

  ```markdown
  ## Amendment (2026-05-26, Phase 15 #7)

  Phase 15 #7 promotes the jackpot magenta `#ff5cf2` to a brand token
  (`jewel-magenta`). The tier-celebration semantics (small / medium /
  jackpot duration + visuals) are unchanged. Sound stingers (`win.small`
  / `win.medium` / `win.jackpot`) are wired through `useSound` per the
  Phase-2 hook. Reduced-motion users hear no stingers (matches the
  existing visual short-circuit).
  ```

- [ ] **Step 3: Commit.**
  ```bash
  git add tailwind.config.ts src/theme/tokens.ts docs/adr/0033-slots-tiered-win-celebration.md
  git commit -m "feat(theme): add jewel-magenta token; amend ADR-0033 for #7"
  ```

## Task A.8 — Full DoD + open PR

- [ ] **Step 1: Run the full DoD.**

  ```bash
  pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
  ```

  All six must pass.

- [ ] **Step 2: Push + open PR.**

  ```bash
  git push -u origin phase-15-7-pr-a
  gh pr create --title "phase-15(#7): slots reskin — SVG symbols + sticky bet + layout + sound" --body "$(...)"
  ```

  Subject is 84 chars (under 100). Body should summarise: tasks done, ADRs amended, key behaviours verified, scope confirmation (no other games touched, pure logic byte-stable, sandbox preserved), test count delta.

- [ ] **Step 3: Report DoD + PR URL.** Do NOT merge — controller reviews + merges on green.

---

## Self-review

**Spec coverage:**

- §4.1 (title + meta) → A.6 Step 3
- §4.2 (shared shell) → A.6 Step 3
- §4.3 (brand pass) → A.4 + A.6 Step 7
- §4.3.1 (SVG symbols) → A.3
- §4.3.2 (layout) → A.4 + A.6 Step 6
- §4.4 (sound) → A.1 + A.6 Step 5
- §4.5 (rules) → A.5
- §4.6 (animation polish) → carried through A.6 Step 7 (existing animations preserved, tokenized)
- §4.7 (bet preset) → verified pre-existing in A.0 Step 4
- §4.8 (sticky bet) → A.2 + A.6 Step 4
- §4.9 (header layout) → A.6 Step 3

**Placeholder scan:** None — every code block is complete or has clear implementer-choice guardrails.

**Type consistency:** `persistBetAcrossCommit?: boolean`, `singleStepCommit?: boolean` used consistently. `useSound`, `useEffectiveReducedMotion`, `SLOTS_CONFIG` all referenced with the existing project shapes.

**Risks already flagged in spec §7 are carried forward:**

- Reel-stop sound cadence — 3 sounds in 8s — flagged in A.1 Step 2 / A.6 Step 5.
- Magenta-vs-Velvet-Deco — locked: magenta stays as the signature, promoted to token (A.7).
- Sample generation commit — explicit in A.1 Step 5.
- SVG art time-box — if A.3 takes disproportionate time, the symbol rewrite can split into a follow-up PR per spec §8.

---
