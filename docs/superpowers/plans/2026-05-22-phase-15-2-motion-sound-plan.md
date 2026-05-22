# Phase 15 #2 — Motion & Sound Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship MASQUER's motion + sound layer — `useSound` (hybrid synth + bundled samples), per-user Dexie prefs, a shared Framer Motion variant library + page transitions, and a Settings page (+ account deletion) — all honoring an effective reduced-motion signal.

**Architecture:** Three sequential PRs — **A** Sound (Dexie v5 prefs + `prefsStore` + `soundEngine` + `useSound` + samples + Button/Toast wiring), **B** Motion (variants + `useEffectiveReducedMotion` + `<PageTransition>` + overlay adoption), **C** Settings page + account deletion. Additive — no game logic touched; per-game adoption is each game's own sub-project. **Sample assets are self-synthesized offline** by a committed `scripts/gen-audio.mjs` (deterministic, license-clean, no network), so the whole feature is reproducible and offline — recorded samples can replace them later (deferred polish).

**Tech Stack:** TypeScript 5 (strict, exactOptionalPropertyTypes), React 18, Vite 5, Tailwind 3, Dexie 4, Zustand 5, Framer Motion 12, Web Audio API, Vitest 2 + RTL + fake-indexeddb. pnpm 9.12, alias `@/* → src/*`. Next ADR: **0044** (sound engine).

**Spec:** `docs/superpowers/specs/2026-05-22-phase-15-2-motion-sound-design.md`. Existing patterns to mirror: `src/store/walletStore.ts` (per-user hydrate/clear), `src/db/schema.ts` (additive Dexie versions), `src/components/AppLayout.tsx`, `src/components/ProfileDropdown.tsx`.

**Branches:** `phase-15-2-pr-a`, `phase-15-2-pr-b`, `phase-15-2-pr-c`. DoD per PR: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook`. Conventional commits, scopes `db`/`wallet`/`theme`/`session`/`ui`/`shell` as fitting (use `feat(sound)`? No — `sound` is NOT in the commitlint enum; **add `sound` + `motion` + `settings` to `commitlint.config.js` scope-enum in PR A Task A.0**, or reuse existing scopes. To minimise risk, reuse existing scopes: `theme` for sound/motion infra, `db` for the migration, `session`/`ui` for stores/components.).

---

## PR A — Sound

**Branch:** `phase-15-2-pr-a`. Dexie v5 `prefs` + `prefsStore`; the audio asset generator + samples; `soundEngine`; `useSound`; wire into #1 `Button`/`Toast`; ADR-0044.

### Task A.1: Dexie v5 `prefs` table + `Prefs` type

**Files:** Modify `src/db/schema.ts`; Create `src/db/schema.prefs.test.ts`

- [ ] **Step 1: Branch.**

```bash
git checkout main && git pull origin main && git checkout -b phase-15-2-pr-a
```

- [ ] **Step 2: Add the `Prefs` interface** to `src/db/schema.ts` (near the other interfaces):

```typescript
export interface Prefs {
  userId: string; // PK
  soundEnabled: boolean;
  masterVolume: number; // 0..1
  muteUi: boolean;
  muteGame: boolean;
  muteAmbience: boolean;
  motionPref: 'system' | 'full' | 'reduced';
}
```

- [ ] **Step 3: Add the table field + v5 migration.** Add the field declaration alongside the others (e.g. after `bingoConfig!`):

```typescript
  prefs!: Dexie.Table<Prefs, string>;
```

Then append a `version(5)` repeating all v4 stores plus `prefs: 'userId'` (copy the v4 `.stores({...})` object verbatim and add the `prefs` line). Additive — no existing table definition changes.

- [ ] **Step 4: Test** `src/db/schema.prefs.test.ts` (fake-indexeddb): a `prefs` row round-trips and existing tables still open:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { LocalGambleDB } from './schema';

describe('prefs table (v5)', () => {
  let db: LocalGambleDB;
  beforeEach(() => {
    db = new LocalGambleDB(`t-${Math.random()}`);
  });
  it('round-trips a prefs row', async () => {
    await db.prefs.put({
      userId: 'u1',
      soundEnabled: true,
      masterVolume: 0.7,
      muteUi: false,
      muteGame: false,
      muteAmbience: true,
      motionPref: 'system',
    });
    expect((await db.prefs.get('u1'))?.masterVolume).toBe(0.7);
  });
});
```

(Use the actual exported db class name — confirm it's `LocalGambleDB`; adjust import if different.)

- [ ] **Step 5: Run + commit.** `pnpm exec vitest run src/db/schema.prefs.test.ts`; `git commit -m "feat(db): add per-user prefs table (Dexie v5, additive)"`

### Task A.2: `prefsStore` (zustand, per-user)

**Files:** Create `src/store/prefsStore.ts`, `src/store/prefsStore.test.ts`; Create `src/systems/prefs.ts`

- [ ] **Step 1:** Create `src/systems/prefs.ts` — the side-effecting data layer:

```typescript
import { db } from '@/db/schema';
import type { Prefs } from '@/db/schema';

export const DEFAULT_PREFS: Omit<Prefs, 'userId'> = {
  soundEnabled: true,
  masterVolume: 0.7,
  muteUi: false,
  muteGame: false,
  muteAmbience: true,
  motionPref: 'system',
};

export async function getOrCreatePrefs(userId: string): Promise<Prefs> {
  const existing = await db.prefs.get(userId);
  if (existing) return existing;
  const created: Prefs = { userId, ...DEFAULT_PREFS };
  await db.prefs.put(created);
  return created;
}

export async function savePrefs(prefs: Prefs): Promise<void> {
  await db.prefs.put(prefs);
}
```

(Confirm `db` is exported from `@/db/schema` — adjust if the singleton lives elsewhere.)

- [ ] **Step 2:** Create `src/store/prefsStore.ts` (mirror `walletStore`'s hydrate/clear):

```typescript
import { create } from 'zustand';
import type { Prefs } from '@/db/schema';
import { getOrCreatePrefs, savePrefs, DEFAULT_PREFS } from '@/systems/prefs';

interface PrefsState {
  prefs: Prefs | null;
  hydrate: (userId: string) => Promise<void>;
  clear: () => void;
  update: (patch: Partial<Omit<Prefs, 'userId'>>) => Promise<void>;
}

export const usePrefsStore = create<PrefsState>((set, get) => ({
  prefs: null,
  hydrate: async (userId) => set({ prefs: await getOrCreatePrefs(userId) }),
  clear: () => set({ prefs: null }),
  update: async (patch) => {
    const cur = get().prefs;
    if (!cur) return;
    const next = { ...cur, ...patch };
    set({ prefs: next });
    await savePrefs(next);
  },
}));

/** Effective prefs with defaults applied (safe before hydrate). */
export const effectivePrefs = (p: Prefs | null) => ({
  userId: p?.userId ?? '',
  ...DEFAULT_PREFS,
  ...(p ?? {}),
});
```

- [ ] **Step 3:** Wire hydrate/clear into the session lifecycle — in `sessionStore` login/restore call `usePrefsStore.getState().hydrate(user.id)`, and logout calls `clear()` (mirror where `walletStore.hydrate`/`clear` is invoked; grep for `walletStore` usage in `sessionStore.ts` / bootstrap and add the prefs equivalents next to it).
- [ ] **Step 4: Test** `prefsStore.test.ts` (fake-indexeddb): hydrate seeds defaults; update persists + reflects in a fresh `getOrCreatePrefs`. Commit `feat(session): add per-user prefsStore`.

### Task A.3: Audio sample generator + assets

**Files:** Create `scripts/gen-audio.mjs`; generate `src/assets/audio/*.wav`; Create `src/assets/audio/CREDITS.md`

- [ ] **Step 1:** Create `scripts/gen-audio.mjs` — a zero-dep Node script that synthesizes the sample set to mono 16-bit WAV (offline, deterministic). It writes: `chip-place.wav`, `card-deal.wav`, `dice-roll.wav`, `reel-spin.wav`, `reel-stop.wav`, `win-small.wav`, `win-medium.wav`, `win-jackpot.wav`, `loss.wav`, `ambience-lounge.wav`. Use simple DSP (sine/triangle partials, noise bursts shaped by an envelope; the win stingers are short major-triad arpeggios; `dice-roll` = filtered noise clatter; `chip-place` = short click + click). Provide the full script (a `writeWav(path, samples, sampleRate)` helper + per-sound generator functions + a loop writing all files). Keep each file short (≤1.5s; ambience ≤4s loop) to stay under the ~150KB budget.
- [ ] **Step 2:** Add a package.json script `"gen-audio": "node scripts/gen-audio.mjs"` and run it (`pnpm gen-audio`) to produce the committed `.wav` files.
- [ ] **Step 3:** Create `src/assets/audio/CREDITS.md` noting the samples are self-synthesized (CC0 / project-authored, no third-party license) and regenerable via `pnpm gen-audio`.
- [ ] **Step 4: Commit** `feat(theme): add self-synthesized audio sample set + generator`.

> Note: `.wav` is universally decodable by Web Audio; no `.mp3` fallback needed. If bundle size is a concern, the generator can emit shorter buffers — keep it simple.

### Task A.4: `soundEngine`

**Files:** Create `src/systems/sound/engine.ts`, `engine.test.ts`, `src/systems/sound/ids.ts`

- [ ] **Step 1:** Create `src/systems/sound/ids.ts` (the taxonomy + category map):

```typescript
export type SoundId =
  | 'ui.click'
  | 'ui.toggle'
  | 'ui.hover'
  | 'ui.error'
  | 'chip.place'
  | 'card.deal'
  | 'dice.roll'
  | 'reel.spin'
  | 'reel.stop'
  | 'win.small'
  | 'win.medium'
  | 'win.jackpot'
  | 'loss'
  | 'ambience.lounge';

export type SoundCategory = 'ui' | 'game' | 'ambience';

export const SOUND_CATEGORY: Record<SoundId, SoundCategory> = {
  'ui.click': 'ui',
  'ui.toggle': 'ui',
  'ui.hover': 'ui',
  'ui.error': 'ui',
  'chip.place': 'game',
  'card.deal': 'game',
  'dice.roll': 'game',
  'reel.spin': 'game',
  'reel.stop': 'game',
  'win.small': 'game',
  'win.medium': 'game',
  'win.jackpot': 'game',
  loss: 'game',
  'ambience.lounge': 'ambience',
};

/** ui.* are runtime-synthesized; the rest are bundled samples. */
export const SYNTH_IDS = new Set<SoundId>(['ui.click', 'ui.toggle', 'ui.hover', 'ui.error']);
```

- [ ] **Step 2:** Create `engine.ts` — the singleton (full code): lazy `AudioContext` (guard `typeof AudioContext` / `webkitAudioContext`; if absent, every method is a safe no-op for tests/SSR); `unlock()` resumes the context + registers a one-time `pointerdown`/`keydown` listener; a master `GainNode`; sample registry importing the `.wav` URLs (`import chipPlace from '@/assets/audio/chip-place.wav'` — Vite returns a URL string), lazily `fetch`+`decodeAudioContext.decodeAudioData` cached in a `Map<SoundId, AudioBuffer>`; `synth(id)` plays a parameterised oscillator blip; `play(id, gain)` routes synth-vs-sample through the master gain and a per-call gain node. Expose `setMasterGain(value)`. All methods guard on context presence and unlock state (pre-unlock = no-op). Provide the complete implementation.
- [ ] **Step 3: Test** `engine.test.ts`: with `AudioContext` undefined (jsdom default), `play`/`unlock`/`setMasterGain` are safe no-ops (no throw); the sample registry maps every non-synth `SoundId` to a defined URL; `SOUND_CATEGORY` covers every `SoundId`. Commit `feat(theme): add Web Audio sound engine (synth + samples + unlock gate)`.

### Task A.5: `useSound` hook + ADR-0044

**Files:** Create `src/systems/sound/useSound.ts`, `useSound.test.ts`; Create `docs/adr/0044-sound-engine.md`

- [ ] **Step 1:** Create `useSound.ts`:

```typescript
import { useCallback } from 'react';
import { usePrefsStore, effectivePrefs } from '@/store/prefsStore';
import { soundEngine } from './engine';
import { SOUND_CATEGORY, type SoundId } from './ids';

export function useSound(): { play: (id: SoundId, opts?: { volume?: number }) => void } {
  const prefs = usePrefsStore((s) => s.prefs);
  const play = useCallback(
    (id: SoundId, opts?: { volume?: number }) => {
      const p = effectivePrefs(prefs);
      if (!p.soundEnabled) return;
      const cat = SOUND_CATEGORY[id];
      if (
        (cat === 'ui' && p.muteUi) ||
        (cat === 'game' && p.muteGame) ||
        (cat === 'ambience' && p.muteAmbience)
      )
        return;
      soundEngine.play(id, (opts?.volume ?? 1) * p.masterVolume);
    },
    [prefs],
  );
  return { play };
}
```

- [ ] **Step 2: Test** `useSound.test.ts` (RTL `renderHook` + mocked `soundEngine` + a seeded `usePrefsStore`): plays when enabled; no-ops when `soundEnabled` false or the id's category is muted; multiplies by masterVolume.
- [ ] **Step 3:** Write `docs/adr/0044-sound-engine.md` (hybrid synth+sample architecture, autoplay-unlock gate, per-user prefs gating, self-synthesized samples). Commit `feat(theme): add useSound hook` + `docs(theme): ADR-0044 sound engine`.

### Task A.6: Wire sound into #1 Button + Toast + app-root unlock

**Files:** Modify `src/components/ui/Button.tsx`, `src/components/ui/Toast.tsx` (or `toast-context.ts`); Modify the app root (`src/App.tsx`/`src/main.tsx`)

- [ ] **Step 1:** In `Button`, call `useSound().play('ui.click')` inside `onClick` (wrap the consumer's handler; skip when `asChild` since Slot forwards). Keep it behind the hook (prefs-gated). Update `Button.test.tsx` to assert the consumer `onClick` still fires (mock `useSound`).
- [ ] **Step 2:** In the Toast layer, when a toast with `tone` shows, play `win.medium` (win), `loss` (loss), or `ui.toggle` (info). Add a test.
- [ ] **Step 3:** Mount the unlock listener at the app root: call `soundEngine.unlock()` setup once on mount (a tiny `useEffect` in `App`/root). Ensure `ToastProvider` (from #1) wraps the app if not already.
- [ ] **Step 4: DoD + PR A.** `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook`. Push, open PR `phase-15(#2) PR A: sound infrastructure (prefs, engine, useSound)`.

---

## PR B — Motion

**Branch:** `phase-15-2-pr-b` (off main after PR A). Shared variant library + effective-reduced-motion hook + page transitions; #1 overlays adopt the variants.

### Task B.1: Motion variant library

**Files:** Create `src/motion/variants.ts`, `src/motion/variants.test.ts`

- [ ] **Step 1:** Create `variants.ts` — named Framer Motion `Variants` objects per the #0 principles (transform/opacity only; 150–300ms; ease-out enter / ease-in exit ~70%):

```typescript
import type { Variants, Transition } from 'framer-motion';

export const EASE_OUT: Transition = { duration: 0.2, ease: [0.16, 1, 0.3, 1] };
export const EASE_IN: Transition = { duration: 0.14, ease: [0.7, 0, 0.84, 0] };

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: EASE_OUT },
  exit: { opacity: 0, transition: EASE_IN },
};
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: EASE_OUT },
  exit: { opacity: 0, scale: 0.97, transition: EASE_IN },
};
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: EASE_OUT },
  exit: { opacity: 0, y: -8, transition: EASE_IN },
};
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: EASE_OUT },
  exit: { opacity: 0, x: 24, transition: EASE_IN },
};
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};
export const staggerItem: Variants = slideUp;
```

- [ ] **Step 2: Test** `variants.test.ts` — assert each variant exposes `hidden`/`visible` keys and exit durations are shorter than enter (the "exit faster" rule). Commit `feat(theme): add shared Framer Motion variant library`.

### Task B.2: `useEffectiveReducedMotion`

**Files:** Create `src/motion/useEffectiveReducedMotion.ts`, `useEffectiveReducedMotion.test.ts`

- [ ] **Step 1:** Implement (OS `prefers-reduced-motion` OR pref):

```typescript
import { useReducedMotion } from 'framer-motion';
import { usePrefsStore, effectivePrefs } from '@/store/prefsStore';

/** true = reduce. motionPref 'reduced' forces reduce; 'full' forces full; 'system' follows OS. */
export function useEffectiveReducedMotion(): boolean {
  const osReduce = useReducedMotion() ?? false;
  const pref = effectivePrefs(usePrefsStore((s) => s.prefs)).motionPref;
  if (pref === 'reduced') return true;
  if (pref === 'full') return false;
  return osReduce;
}
```

- [ ] **Step 2: Test** — truth table over (osReduce ∈ {true,false}) × (motionPref ∈ {system,full,reduced}); mock `useReducedMotion` (via `vi.mock('framer-motion', ...)`) + a seeded `usePrefsStore`. Expected: reduced→true; full→false; system→osReduce. Commit `feat(theme): add useEffectiveReducedMotion`.

### Task B.3: `<PageTransition>` in AppLayout

**Files:** Create `src/motion/PageTransition.tsx`, `PageTransition.test.tsx`; Modify `src/components/AppLayout.tsx`

- [ ] **Step 1:** Implement `PageTransition.tsx` — wraps children in `AnimatePresence mode="wait"` + a `motion.div` keyed by `useLocation().pathname`, using `slideUp` variants; when `useEffectiveReducedMotion()` is true, render children directly (no motion wrapper).

```tsx
import type { JSX, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router';
import { slideUp } from './variants';
import { useEffectiveReducedMotion } from './useEffectiveReducedMotion';

export function PageTransition({ children }: { children: ReactNode }): JSX.Element {
  const reduce = useEffectiveReducedMotion();
  const { pathname } = useLocation();
  if (reduce) return <>{children}</>;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={slideUp}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2:** In `AppLayout.tsx`, wrap the `<Outlet/>`: `<main className="flex-1 overflow-auto"><PageTransition><Outlet /></PageTransition></main>`.
- [ ] **Step 3: Test** `PageTransition.test.tsx`: renders children; with `useEffectiveReducedMotion` mocked true, renders children with no `motion` wrapper (assert no extra animated div / just the content). Update `AppLayout.test.tsx` if it asserts outlet structure. Commit `feat(theme): page transitions in AppLayout`.

### Task B.4: #1 overlays adopt the shared variants (reference integration)

**Files:** Modify `src/components/ui/Modal.tsx` (+ Drawer/Tooltip if they animate)

- [ ] **Step 1:** Replace the bespoke keyframe animations in `Modal`/`Drawer` content with the shared `scaleIn`/`slideInRight` variants via `motion.div`, gated by `useEffectiveReducedMotion()` (instant when reduced). Keep Radix behavior (focus trap/escape) intact — wrap Radix `Content` children, or use Radix's `forceMount` + Framer where needed. Keep the existing tests green (adjust assertions that targeted the old keyframe classes to assert presence of content + reduced-motion fallback).
- [ ] **Step 2: DoD + PR B.** Full DoD + `build-storybook`. Push, open PR `phase-15(#2) PR B: motion variants + page transitions`.

---

## PR C — Settings page + account deletion

**Branch:** `phase-15-2-pr-c` (off main after PR B). The Settings page + `clearHistory`/`deleteAccount` system helpers + `ProfileDropdown` Delete-account item.

### Task C.1: System helpers

**Files:** Create `src/systems/account.ts`, `src/systems/account.test.ts`

- [ ] **Step 1:** Implement `clearHistory` + `deleteAccount`:

```typescript
import { db } from '@/db/schema';

/** Delete this user's play history (rounds). Stats/leaderboard reflect the clear. */
export async function clearHistory(userId: string): Promise<void> {
  await db.rounds.where('userId').equals(userId).delete();
}

/** Permanently delete the account + all user-keyed data in one transaction. */
export async function deleteAccount(userId: string): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.users,
      db.balances,
      db.rounds,
      db.sessions,
      db.gameVisits,
      db.adjustments,
      db.lotteryTickets,
      db.lotteryLines,
      db.lotteryFavorites,
      db.prefs,
    ],
    async () => {
      await Promise.all([
        db.users.delete(userId),
        db.balances.delete(userId),
        db.rounds.where('userId').equals(userId).delete(),
        db.sessions.where('userId').equals(userId).delete(),
        db.gameVisits.where('userId').equals(userId).delete(),
        db.adjustments.where('userId').equals(userId).delete(),
        db.lotteryTickets.where('userId').equals(userId).delete(),
        db.lotteryLines.where('userId').equals(userId).delete(),
        db.lotteryFavorites.where('userId').equals(userId).delete(),
        db.prefs.delete(userId),
      ]);
    },
  );
}
```

(Confirm exact table field names against `src/db/schema.ts`; `balances`/`prefs` are keyed by `userId` directly so `.delete(userId)`.)

- [ ] **Step 2: Test** `account.test.ts` (fake-indexeddb): seed a user across tables + a second user; `clearHistory(u1)` removes only u1 rounds; `deleteAccount(u1)` removes all u1 rows, leaves u2 + global `lotteryDraws` intact. Commit `feat(wallet): add clearHistory + deleteAccount helpers`.

### Task C.2: Settings page

**Files:** Create `src/pages/SettingsPage.tsx`, `SettingsPage.test.tsx`; Modify `src/router.tsx`, `src/components/Sidebar.tsx`

- [ ] **Step 1:** Build `SettingsPage.tsx` from #1 primitives (`Card`/`CardHeader/Body`, `Switch`, `Slider`, `Select`, `Button`, `Modal`, `Icon`) + `usePrefsStore` + `useSound`:
  - **Sound** `Card`: master `Switch` (soundEnabled → `update({soundEnabled})`); master-volume `Slider` 0–100 (→ `update({masterVolume: v/100})`, plays `ui.click` on change); category `Switch`es (muteUi/muteGame/muteAmbience). Controls disabled when `!soundEnabled`.
  - **Motion** `Card`: `Select` motionPref (System/Full/Reduced → `update({motionPref})`) + helper text.
  - **Account** `Card`: **Clear play history** `Button` (danger ghost) → confirm `Modal` → `clearHistory(userId)` + a success `Toast`; a read-only **Daily top-up** line (from `useNextDailyEligibleAt`).
- [ ] **Step 2:** Add the `/settings` route in `src/router.tsx` (inside the `RequireAuth`/`AppLayout` tree; eager or lazy like neighbors) and a Sidebar entry (`{ to: '/settings', icon: '⚙️'/lucide 'Settings', label: 'Settings' }` — use the #1 `Icon`).
- [ ] **Step 3: Test** `SettingsPage.test.tsx` (fake-indexeddb + seeded prefsStore): toggling sound calls `update`; moving volume calls `update` with `/100`; selecting motion calls `update`; Clear-history opens the Modal and on confirm calls `clearHistory` (assert rows gone). Commit `feat(ui): Settings page (sound/motion/account)`.

### Task C.3: Account deletion in ProfileDropdown

**Files:** Modify `src/components/ProfileDropdown.tsx`, `ProfileDropdown.test.tsx`

- [ ] **Step 1:** Add a destructive **Delete account** item (set apart, danger styling) that opens a confirm `Modal` (explicit "Delete forever" `Button`); on confirm call `deleteAccount(currentUser.id)`, then run the existing logout flow (clear session + prefs + wallet stores, navigate to `/login`). Reuse the session logout action.
- [ ] **Step 2: Test** `ProfileDropdown.test.tsx`: the Delete-account item opens the confirm Modal; confirming calls `deleteAccount` (mocked) + the logout action; cancelling does neither.
- [ ] **Step 3: DoD + PR C.** Full DoD + `build-storybook`. Push, open PR `phase-15(#2) PR C: Settings page + account deletion`. This completes sub-project #2.

---

## Self-review

- **Spec coverage:** hybrid sound engine + taxonomy + unlock (§3 → A.3/A.4/A.5) · per-user Dexie v5 prefs + store (§4 → A.1/A.2) · motion variants + effective-reduced-motion + PageTransition + overlay adoption (§5 → B.1–B.4) · Settings page sound/motion/account (§6 → C.2) · account deletion in ProfileDropdown (§6.1 → C.1/C.3) · proof-of-life Button/Toast wiring + app-root unlock (§7 → A.6) · testing (§8 → per-task tests) · 3-PR split (§9 → PR A/B/C). ✓
- **Placeholder scan:** core pieces (prefs, prefsStore, engine ids, useSound, variants, useEffectiveReducedMotion, PageTransition, clearHistory/deleteAccount) have full code; `gen-audio.mjs` + `engine.ts` bodies + Settings/ProfileDropdown UI are specified precisely (exact files, APIs, props, test checklists) — implementable, no "TBD"/"handle edge cases".
- **Type/name consistency:** `Prefs` fields used identically across schema/prefs/prefsStore/useSound/Settings; `SoundId`/`SOUND_CATEGORY`/`SYNTH_IDS` consistent across ids/engine/useSound; `effectivePrefs`/`usePrefsStore`/`update` consistent; `clearHistory`/`deleteAccount` signatures match between helper + callers; `useEffectiveReducedMotion` used by PageTransition + overlays. ✓
- **Additive / invariants:** Dexie v5 repeats v4 tables + adds `prefs` only; no game logic touched; `useSound`/motion are `src/systems`/`src/motion` hooks (games may import; no `@/db`/`@/store` inside `src/games`); clearHistory/deleteAccount delete rows (never fabricate); samples self-synthesized (offline, license-clean). ✓
- **Risk notes:** confirm the db singleton export name + table field names against `src/db/schema.ts` (flagged inline in A.1/A.2/C.1); commitlint — reuse existing scopes (`db`/`session`/`theme`/`wallet`/`ui`/`shell`) rather than adding new ones; `pnpm gen-audio` must run before `pnpm build` so the `.wav` imports resolve (committed assets satisfy this).
