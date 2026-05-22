# Phase 15 · Sub-project #2 — Motion & Sound Infrastructure

**Status:** Design spec. Part of the [Phase 15 umbrella roadmap](./2026-05-22-phase-15-umbrella-roadmap-design.md); builds on the #0 motion/sound principles and the #1 component library. Produces the cross-cutting motion + sound infrastructure + a Settings page.

**Date:** 2026-05-22

---

## 1. Goal

Give MASQUER a coherent, accessible motion + sound layer: a single `useSound` hook (hybrid Web-Audio-synth + bundled samples), a shared Framer Motion variant library with route transitions, per-user preferences, and a Settings page to control it all — every animation honoring an effective reduced-motion signal. This is **infrastructure**: it provides the hooks/variants/Settings and wires sound into the #1 `Button`/`Toast` so the system is live, but per-game/per-screen adoption happens in those sub-projects.

## 2. Decisions (from brainstorming)

- **Hybrid sound:** Web Audio synthesis for simple UI blips (click/toggle/hover); a small set of bundled, license-clean (CC0) samples for signature sounds (chip place, card deal, dice roll, reel spin, tiered win/loss stingers). Both work fully offline.
- **Per-user preferences in Dexie** (v5 additive `prefs` table keyed by `userId`).
- **Settings page** covers sound + motion + account utilities.

## 3. Sound architecture

### 3.1 `soundEngine` (`src/systems/sound/engine.ts`)

A side-effecting singleton:

- **Synth path:** a lazily-created `AudioContext` + small oscillator/gain helpers producing parameterised blips (`click`, `toggle`, `hover`, `error`). No assets.
- **Sample path:** a registry mapping sample ids → asset URLs (`src/assets/audio/*.{webm,mp3}` imported via Vite so they hash + bundle). Samples are **lazily fetched + decoded on first use** and cached as `AudioBuffer`s.
- **Autoplay gate:** the `AudioContext` starts suspended; a one-time `pointerdown`/`keydown` listener resumes it (browser autoplay policy). Calls before unlock are no-ops (never throw, never queue noise).
- **Output:** all playback routes through a master `GainNode` whose gain = `masterVolume × categoryVolume × (muted ? 0 : 1)`.

### 3.2 `useSound` hook (`src/systems/sound/useSound.ts`)

Returns `play(id: SoundId, opts?: { volume?: number })`. Reads the current prefs from `prefsStore`; resolves the id to synth-or-sample + category; respects `soundEnabled` + category mute + master volume. Never imports `@/db`/`@/store` from within games — games call `useSound` (a sanctioned systems hook).

### 3.3 Sound taxonomy (`SoundId`)

- **UI (synth):** `ui.click`, `ui.toggle`, `ui.hover`, `ui.error`.
- **Game (sample):** `chip.place`, `card.deal`, `dice.roll`, `reel.spin`, `reel.stop`.
- **Outcome (sample):** `win.small`, `win.medium`, `win.jackpot`, `loss` — tiers align with the ADR-0033 celebration tiers.
- **Ambience (sample, optional/looping):** `ambience.lounge` — low jazzy loop, toggleable, off by default.

### 3.4 Policy

Tasteful vintage-lounge palette (not arcade bleeps). Never autoplay before first interaction. Independent of reduced-motion (sound has its own prefs). Total bundled audio kept small (target < ~150 KB, optimised mono `.webm` with `.mp3` fallback).

## 4. Preferences (Dexie v5, additive)

New table `prefs` (additive `version(5)`; does not alter existing tables):

```ts
interface Prefs {
  userId: string; // PK
  soundEnabled: boolean; // master sound on/off (default true)
  masterVolume: number; // 0..1 (default 0.7)
  muteUi: boolean; // category mutes (default false)
  muteGame: boolean;
  muteAmbience: boolean; // default true (ambience off by default)
  motionPref: 'system' | 'full' | 'reduced'; // default 'system'
}
```

- `prefsStore` (zustand, `src/store/prefsStore.ts`): hydrated from Dexie on login (mirrors how `walletStore` loads per-user state); a `getOrCreatePrefs(userId)` seeds defaults on first login; updates write through to Dexie.
- Defaults applied for any user without a row.

## 5. Motion infrastructure

- **`src/motion/variants.ts`** — named Framer Motion variant objects matching the #0 principles: `fadeIn`, `scaleIn` (cards/modals), `slideUp`/`slideInRight`, `staggerContainer` + `staggerItem` (30–50ms), `dealCard`, `chipSlide`. Durations 150–300ms; ease-out enter / ease-in exit (~70%); transform/opacity only.
- **`useEffectiveReducedMotion()`** (`src/motion/useEffectiveReducedMotion.ts`) — returns `true` when OS `prefers-reduced-motion: reduce` OR `motionPref === 'reduced'`; `false` when `motionPref === 'full'`; otherwise follows OS. The single source components consult (wraps Framer's `useReducedMotion` + the pref).
- **`<PageTransition>`** (`src/motion/PageTransition.tsx`) — wraps the `AppLayout` `<Outlet/>`, keyed by route path; `AnimatePresence` cross-fade/slide on navigation; instant when effective-reduced-motion. Forward = slide up/in, matching the #0 direction rule.
- Existing components keep their current `useReducedMotion()` usage; they migrate to `useEffectiveReducedMotion()` + named variants opportunistically (the `prefs`-aware override is the only behavioural add). #1's `Modal`/overlays adopt the shared variants in this PR as the reference integration.

## 6. Settings page

Route `/settings` (inside `AppLayout`/`RequireAuth`) + a sidebar/profile-menu entry. Built entirely from #1 primitives (`Card`, `Field`, `Slider`, `Switch`, `Select`, `Button`, `Modal`). Sections:

- **Sound:** master `Switch` (soundEnabled); `Slider` master volume (plays a `ui.click` test blip on change); category `Switch`es (UI / Game / Ambience). Disabled controls greyed when sound off.
- **Motion:** `Select` `motionPref` (System / Full / Reduced) with a helper noting the OS setting is respected under "System".
- **Account utilities:** **Clear play history** (deletes this user's `rounds` rows — confirm `Modal`; stats/leaderboard reflect the cleared data) and a read-only **Daily top-up** info line (next top-up amount/time). Calls a new `clearHistory(userId)` helper; never bypasses the wallet/round invariants. **Profile _reset_ is intentionally NOT offered.**

### 6.1 Account deletion (profile menu, not Settings)

A **Delete account** action lives in the **profile menu** (`ProfileDropdown`), set apart (destructive styling). It opens a confirm `Modal` (type-to-confirm or explicit "Delete forever" button) and calls a new `deleteAccount(userId)` helper that removes the user row **and all their data** (`balances`, `rounds`, `sessions`, `gameVisits`, `adjustments`, lottery tickets/lines/favorites, `prefs`) in one Dexie transaction, then logs the user out to the login screen. Global rows (e.g. `lotteryDraws`) are untouched.

## 7. Integration in #2 (proof-of-life)

- Wire `useSound` into the #1 `Button` (plays `ui.click` on press unless `asChild`) and `Toast` (tier → `win.*`/`loss`/`ui.*`), behind prefs. This proves the pipeline end-to-end; per-game sounds come later.
- Mount `<PageTransition>` in `AppLayout`; mount `ToastProvider` (from #1) + a sound-unlock listener at the app root.
- Add the bundled sample assets + their license attribution (`src/assets/audio/CREDITS.md`).

## 8. Testing

- **engine:** synth helpers callable without throwing when `AudioContext` is mocked; sample registry resolves ids; master-gain math (`masterVolume × category × mute`) unit-tested; pre-unlock calls are no-ops.
- **useSound:** respects `soundEnabled`/category mute/volume from a mocked `prefsStore`; unknown id is a safe no-op.
- **prefsStore + Dexie:** `getOrCreatePrefs` seeds defaults; updates persist (fake-indexeddb); v5 migration is additive (existing data intact).
- **useEffectiveReducedMotion:** truth table over (OS reduce?, motionPref) — mock `matchMedia`.
- **Settings page:** renders all controls; volume/mute/motion changes call the store; Clear history opens a confirm Modal and calls `clearHistory` (fake-indexeddb asserts the user's `rounds` rows are gone).
- **Account deletion:** `deleteAccount(userId)` removes the user + all user-keyed rows in one transaction and leaves global rows intact (fake-indexeddb); the `ProfileDropdown` Delete-account item opens a confirm Modal and logs out on confirm.
- **PageTransition:** renders children; collapses to instant under effective-reduced-motion.
- DoD per PR: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build` (+ `pnpm build-storybook`).

## 9. PR split

- **PR A — Sound:** Dexie v5 `prefs` table + `prefsStore`; `soundEngine` (synth + sample + unlock + master gain); `useSound`; bundled samples + CREDITS; tests. (No UI yet beyond wiring `Button`/`Toast`.)
- **PR B — Motion:** `variants.ts`, `useEffectiveReducedMotion`, `<PageTransition>` mounted in `AppLayout`; #1 Modal/overlays adopt the shared variants; tests.
- **PR C — Settings page + account deletion:** `/settings` route + nav entry + the page (sound/motion/Clear-history/top-up info) + the `clearHistory(userId)` helper; plus the `deleteAccount(userId)` helper and the **Delete account** item in `ProfileDropdown` (confirm Modal + logout); tests.

## 10. Invariants & out of scope

Game logic untouched; games sandbox preserved (`useSound`/motion are `src/systems`/`src/motion` hooks games may import; no `@/db`/`@/store` imports inside `src/games`); one rounds row per game (clear-history + account-deletion delete rows, never fabricate them); integer money; seeded RNG unaffected; all ADRs intact; tokens-only; CLAUDE.md not edited; `BUILD_GUIDE.md` updated spec-first. **Out of scope:** per-game sound/motion wiring (each game's sub-project); new games; theme switching.

## 11. Open decisions

None outstanding — hybrid sound, per-user Dexie prefs, and the broad Settings scope are locked. An ADR may record the sound-engine architecture (hybrid synth+sample, autoplay gate) — decide in planning.
