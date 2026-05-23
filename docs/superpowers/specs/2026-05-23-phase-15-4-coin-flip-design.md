# Phase 15 · Sub-project #4 — Coin-flip Upgrade

**Status:** Design spec. First per-game upgrade after the foundation tracks. Part of the [Phase 15 umbrella roadmap](./2026-05-22-phase-15-umbrella-roadmap-design.md); consumes #0 brand (the locked coin treatment), #1 components, #2 motion/sound, #3 shell.

**Date:** 2026-05-23

---

## 1. Goal

Re-skin the **Coin-flip** game (the first game shipped, in Phase 2) on the MASQUER design system + motion/sound + shell. The signature deliverable is the **brand coin** itself — heads = the porcelain Colombina mask, tails = the Cinzel Decorative "M" monogram, both on a gold-gradient coin (locked in the #0 spec §6, now built). Add a small **win-streak indicator** as the only new feature. **Game logic, RNG, payouts, and the `rounds` row are unchanged.**

## 2. Decisions (from brainstorming)

- **Brand coin** (from #0): build a reusable `BrandCoin` component used by Coin-flip + (eventually) any other place the coin appears.
- **Sound:** add a new **`coin.flip`** sample to the audio taxonomy (extends #2). Plays during the flip; `chip.place` on bet commit; tiered `win.*`/`loss` stinger on settle.
- **Feature add:** a session-local **win-streak indicator** (badge with Flame icon, resets on loss and on page leave/mount). Cosmetic only — no logic change.
- **Single PR**: the game is small.

## 3. Architecture

- **`src/games/coin-flip/BrandCoin.tsx`** — pure presentational SVG/CSS component. Props: `side: 'heads' | 'tails'`, `size?: number`, `flipping?: boolean`. Renders a circular coin (radial gold gradient + bevel + drop shadow). When `side === 'heads'`, renders `<MaskMark variant="simple">` centered; when `tails`, a Cinzel Decorative `M` glyph. When `flipping` is true, wraps the face in a `motion.div` doing a 3D `rotateY` (transform-only, `preserve-3d`, ~600–900ms); when `useEffectiveReducedMotion()` is true, no animation — face changes instantly. Two faces stacked back-to-back with `backface-visibility: hidden` so the visible face crossfades-via-rotate cleanly.
- **`CoinFlipPage.tsx`** (rebuilt) — composed from #1 primitives + `BrandCoin`:
  - A **Call** card with two big `Heads` / `Tails` "chips" (deco-framed buttons, gold-glow when selected); selection persists across rounds via `useState`.
  - The existing shared **`BettingPanel`** for amount (unchanged contract).
  - The centered **`BrandCoin`** (large) with the flip animation; on commit the page calls `placeBet` → triggers `BrandCoin flipping=true` + `useSound('coin.flip')` → after ~700ms calls `playRound` → settles via `useGameRound.settle` → coin lands on `landed` side + outcome `Badge` ("Heads — You won +N" / "Tails — Lost") + tiered stinger.
  - **Win-streak** state: `const [streak, setStreak] = useState(0)`; on win → `setStreak(s => s+1)`; on loss → `setStreak(0)`; reset to 0 on mount (page leave clears it). Display as a `Badge tone="win"` with `<Icon name="Flame">` next to the call card when `streak >= 2`.
  - Reuse `RecentResults` (shared) for last-N rounds.
- **Motion:** signature flip animation defined inline in `BrandCoin` (it's bespoke to the coin); the page enter/exit + card stagger use the #2 shared variants (`fadeIn`/`scaleIn`/`staggerContainer`).
- **Shell integration:** zero-balance handled at the Lobby (#3); the page does not need its own EmptyState. Existing `GameShell` wrapper kept.

## 4. Sound — extending #2

Additive to `src/systems/sound/`:

- **`ids.ts`**: add `'coin.flip'` to `SoundId` and `SOUND_CATEGORY['coin.flip'] = 'game'`.
- **`scripts/gen-audio.mjs`**: add a `coinFlip()` generator producing a short (~300–400 ms) "metallic flip" sample — two stacked sine partials around ~880 Hz + ~1320 Hz with a fast attack + amplitude envelope, ending with a soft tail. Run `pnpm gen-audio` to (re)produce `src/assets/audio/coin-flip.wav` (mono 22.05 kHz; target < 20 KB). Commit the wav.
- **`engine.ts`** sample registry: add the import for `coin-flip.wav` and map `coin.flip` → its URL.
- **`useSound.test.ts`** + `engine.test.ts`: extend assertions to cover the new id (category resolves to `'game'`; sample registry contains it).

## 5. Game logic (unchanged — explicitly)

`logic.ts` / `playRound` / `COIN_FLIP_CONFIG` / RNG seeding stay exactly as-is. `logic.test.ts` untouched. The page calls `playRound` with the same shape. The `rounds` row written by `wallet.settleRound` is unchanged — `game: 'coin-flip'`, `details: { call, landed }`.

## 6. Testing

- **`BrandCoin.test.tsx`**: renders heads = svg with `role="img"` for the mask + the `MaskMark` simple variant present; tails = the "M" glyph text; `flipping` toggles a `data-flipping` attribute; `useEffectiveReducedMotion`-mocked-true renders without the motion wrapper.
- **`CoinFlipPage.test.tsx`** (updated): pick a side → place bet → coin flips → settles → outcome Badge + recent-results row + win-streak increments on win, resets on loss; mounting resets streak to 0; tiered sound called with the right id (mock `useSound`).
- **Sound tests** updated (Task 4 above): new id resolves to a sample + category.
- DoD: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`.

## 7. Invariants & out of scope

Game logic untouched (logic.ts, RNG, payout); games sandbox preserved (page imports `useGameRound`/`useSound` via `@/games/_shared`/`@/systems` — never `@/db`/`@/store` from `src/games/**`); integer money; one `rounds` row per round (ADR-0016); tokens-only; `prefers-reduced-motion` honored (no motion-blocked input); CLAUDE.md not edited; `BUILD_GUIDE.md` updated spec-first only if a rule changes (none here). **Out of scope:** new payouts/odds (this is a re-skin); other games; bundle splitting.

## 8. Single PR

`phase-15-4-coin-flip` (off main). Branch tasks: (1) `coin.flip` sound id + sample + engine; (2) `BrandCoin` component + test; (3) rebuild `CoinFlipPage` from #1 primitives + win-streak; (4) update `CoinFlipPage.test.tsx`. DoD + open PR.

## 9. Open decisions

None. Brand coin treatment locked in #0; sound addition + win-streak agreed in brainstorming. Single PR.
