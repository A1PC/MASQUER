# Phase 15 #3 — Shell & Navigation Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the MASQUER shell (TopBar, Sidebar, Lobby, Login/Register, Profile) on the #1 design system + #2 motion/sound — daily-top-up surfacing, zero-balance states, lucide icons, and a real Profile page.

**Architecture:** Three sequential PRs — **A** Chrome (TopBar `DailyClaimChip` + CreditsDropdown re-skin + Sidebar re-skin + `GAME_ICON` lucide migration), **B** Lobby (`LobbyHero` + `GameGrid`/`GameCabinet` + recent activity + zero-balance `EmptyState` + daily CTA — Option A layout), **C** Auth + Profile (Login/Register re-skin + real `ProfilePage` view/edit + `auth.updateProfile`, replacing the stub). Built from `@/components/ui` primitives + the #2 motion/sound hooks; shell-only, no game logic.

**Tech Stack:** TypeScript 5 (strict, exactOptionalPropertyTypes), React 18, Vite 5, Tailwind 3, react-router 7, Dexie 4, Zustand 5, lucide-react, Framer Motion 12, Vitest 2 + RTL + fake-indexeddb. pnpm 9.12, alias `@/* → src/*`.

**Spec:** `docs/superpowers/specs/2026-05-22-phase-15-3-shell-design.md`. **Lobby reference:** `.superpowers/brainstorm/96290-1779487121/content/lobby-layouts.html` (Option A). Existing files: `src/components/Sidebar.tsx` (already has `NavItemDef.iconName`), `src/components/CreditsDropdown.tsx`, `src/components/TopBar.tsx`, `src/store/walletStore.ts` (`claimDaily(userId)`, `useNextDailyEligibleAt`, `useBalance`), `src/systems/auth.ts`, `src/pages/LobbyPage.tsx` + `lobby/CabinetCarousel.tsx` + `lobby/RecentActivityStrip.tsx`, `src/pages/ProfileStubPage.tsx`, `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`.

**Branches:** `phase-15-3-pr-a/b/c`. DoD per PR: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .` (run prettier --check — the lint-staged glob misses some extensions). Conventional commits, scope `shell`/`ui`/`auth`/`wallet`.

---

## PR A — Chrome (TopBar + Sidebar)

**Branch:** `phase-15-3-pr-a`. `GAME_ICON` map; `DailyClaimChip`; CreditsDropdown + Sidebar re-skin on lucide icons + design system.

### Task A.1: `GAME_ICON` map (single source of truth)

**Files:** Create `src/components/nav/gameIcons.ts`, `gameIcons.test.ts`

- [ ] **Step 1: Write the test** `gameIcons.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { icons } from 'lucide-react';
import { NAV_ICON } from './gameIcons';

describe('NAV_ICON', () => {
  it('maps every nav key to a real lucide icon', () => {
    for (const [key, name] of Object.entries(NAV_ICON)) {
      expect(icons[name], `${key} → ${name}`).toBeDefined();
    }
  });
  it('covers the games + you-section routes', () => {
    for (const k of [
      'lobby',
      'coin-flip',
      'blackjack',
      'roulette',
      'slots',
      'baccarat',
      'bingo',
      'plinko',
      'poker',
      'craps',
      'lottery',
      'stats',
      'leaderboard',
      'settings',
    ])
      expect(NAV_ICON[k]).toBeDefined();
  });
});
```

- [ ] **Step 2: Run — FAIL. Step 3: Implement** `gameIcons.ts`:

```typescript
import type { IconName } from '@/components/ui';

/** One source of truth for nav + lobby icons. Keys = game/route slugs.
 *  Values are lucide icon names; pick the closest available glyph. */
export const NAV_ICON: Record<string, IconName> = {
  lobby: 'LayoutGrid',
  'coin-flip': 'CircleDollarSign',
  blackjack: 'Spade',
  roulette: 'CircleDot',
  slots: 'Cherry',
  baccarat: 'Diamond',
  bingo: 'Grid3x3',
  plinko: 'ChevronsDown',
  poker: 'Club',
  craps: 'Dices',
  lottery: 'Ticket',
  stats: 'ChartColumn',
  leaderboard: 'Trophy',
  settings: 'Settings',
};
```

(If any name isn't in `lucide-react@latest`, the test fails — swap for the nearest real glyph, e.g. `ChartColumn`→`BarChart3`, `Dices`→`Dice5`.)

- [ ] **Step 4: Run — PASS. Commit** `feat(shell): add NAV_ICON lucide map`.

### Task A.2: `DailyClaimChip`

**Files:** Create `src/components/DailyClaimChip.tsx`, `DailyClaimChip.test.tsx`

- [ ] **Step 1: Test** — chip renders only when eligible; click claims + plays sound:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/components/ui';
import DailyClaimChip from './DailyClaimChip';
import { useWalletStore } from '@/store/walletStore';
import { useSessionStore } from '@/store/sessionStore';

const play = vi.fn();
vi.mock('@/systems/sound/useSound', () => ({ useSound: () => ({ play }) }));

function setup(eligibleAt: number | null) {
  useSessionStore.setState({ currentUser: { id: 'u' } as never, bootstrapping: false });
  useWalletStore.setState({ balance: 0, nextDailyEligibleAt: eligibleAt, hydrating: false });
  return render(
    <ToastProvider>
      <DailyClaimChip />
    </ToastProvider>,
  );
}

describe('DailyClaimChip', () => {
  beforeEach(() => vi.clearAllMocks());
  it('hides when not eligible', () => {
    setup(Date.now() + 60_000);
    expect(screen.queryByRole('button', { name: /claim/i })).not.toBeInTheDocument();
  });
  it('claims + plays a sound when eligible', async () => {
    const claimDaily = vi.fn(() =>
      Promise.resolve({ ok: true, newBalance: 500, nextEligibleAt: Date.now() + 86_400_000 }),
    );
    useWalletStore.setState({ claimDaily } as never);
    setup(null);
    await userEvent.click(screen.getByRole('button', { name: /claim/i }));
    await waitFor(() => expect(claimDaily).toHaveBeenCalledWith('u'));
    expect(play).toHaveBeenCalledWith('win.small');
  });
});
```

- [ ] **Step 2: FAIL. Step 3: Implement** `DailyClaimChip.tsx`:

```tsx
import type { JSX } from 'react';
import { Button, Icon, useToast } from '@/components/ui';
import { useNextDailyEligibleAt, useWalletStore } from '@/store/walletStore';
import { useCurrentUser } from '@/store/sessionStore';
import { useSound } from '@/systems/sound/useSound';
import { WALLET_CONFIG } from '@/systems/wallet';

export default function DailyClaimChip(): JSX.Element | null {
  const eligibleAt = useNextDailyEligibleAt();
  const claimDaily = useWalletStore((s) => s.claimDaily);
  const user = useCurrentUser();
  const { toast } = useToast();
  const { play } = useSound();

  const eligible = (eligibleAt ?? 0) <= Date.now();
  if (!user || !eligible) return null;

  const onClaim = async (): Promise<void> => {
    const res = await claimDaily(user.id);
    if (res.ok) {
      play('win.small');
      toast({
        title: `+${WALLET_CONFIG.DAILY_CLAIM_AMOUNT} chips`,
        description: 'Daily top-up claimed.',
        tone: 'win',
      });
    }
  };

  return (
    <Button variant="primary" size="sm" onClick={() => void onClaim()}>
      <Icon name="Gift" size={14} /> Claim +{WALLET_CONFIG.DAILY_CLAIM_AMOUNT}
    </Button>
  );
}
```

(Confirm `claimDaily`'s result shape (`ok`/`newBalance`/`nextEligibleAt`) against `walletStore`; adjust if different. Confirm `Gift` is a real lucide name.)

- [ ] **Step 4: PASS. Commit** `feat(shell): add DailyClaimChip`.

### Task A.3: TopBar + CreditsDropdown re-skin

**Files:** Modify `src/components/TopBar.tsx`, `src/components/CreditsDropdown.tsx` (+ tests)

- [ ] **Step 1:** Mount `<DailyClaimChip />` in `TopBar` between the Wordmark group and the credits/profile group. Re-skin `CreditsDropdown` to use design-system tokens (balance in `font-numeral` tabular gold, deco-framed dropdown panel, `Button` for the claim action inside, `Icon` chevrons) — keep its existing `claimDaily`/countdown logic, just restyle. Keep `useReducedMotion`→`useEffectiveReducedMotion` where it gates animation.
- [ ] **Step 2:** Update `CreditsDropdown.test.tsx` / `AppLayout.test.tsx` assertions that targeted old markup. Run DoD-lite (`pnpm typecheck && pnpm exec vitest run src/components`). Commit `feat(shell): re-skin TopBar + CreditsDropdown + mount DailyClaimChip`.

### Task A.4: Sidebar re-skin + icon migration

**Files:** Modify `src/components/Sidebar.tsx`, `Sidebar.test.tsx`

- [ ] **Step 1:** Replace the emoji `icon` strings in the `GAMES`/`YOU` nav configs with `iconName` values from `NAV_ICON` (e.g. `{ to: '/play/blackjack', iconName: NAV_ICON.blackjack, label: 'Blackjack' }`); render via the existing `<Icon name={iconName}>` path (the `NavItemDef.iconName` field already exists). Re-skin: active route → gold text + a gold left-rail indicator (`motion.span` layoutId for a sliding indicator, gated by `useEffectiveReducedMotion`); section labels in Cinzel; hover states. Keep the lottery unread-dot logic + collapse behaviour.
- [ ] **Step 2:** Update `Sidebar.test.tsx` (assert items render with accessible names; active highlight). Commit `feat(shell): re-skin Sidebar + migrate nav icons to lucide`.

### Task A.5: DoD + PR A

- [ ] Full DoD (`pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`). Push, open PR `phase-15(#3) PR A: chrome — TopBar + Sidebar + daily claim`.

---

## PR B — Lobby (Option A: marquee hero + even grid)

**Branch:** `phase-15-3-pr-b` (off main after PR A). Rebuild the lobby from #1 primitives + the `NAV_ICON` map.

### Task B.1: `GameCabinet` + `GameGrid`

**Files:** Create `src/pages/lobby/GameCabinet.tsx`, `GameGrid.tsx` (+ tests). Reference the existing `lobby/CabinetCarousel.tsx` for the game list + poker variant-modal behaviour.

- [ ] **Step 1:** `GameCabinet` — a deco `Card` (variant `deco`) rendering the game `Icon` (from `NAV_ICON`), name (Cinzel), and an optional status; the whole card is a router `Link` (poker routes to the variant modal/lobby like today). cva-free; props `{ to, iconKey, label, status? }`. `GameGrid` — an even responsive grid (`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3`) of `GameCabinet`s built from a `GAMES` list (reuse the list shape from `CabinetCarousel`). Tests: GameGrid renders one cabinet per game; each cabinet links to its route + shows its icon (svg) + label.
- [ ] **Step 2: Commit** `feat(shell): lobby GameCabinet + GameGrid`.

### Task B.2: `LobbyHero` + daily CTA + zero-balance EmptyState

**Files:** Create `src/pages/lobby/LobbyHero.tsx` (+ test)

- [ ] **Step 1:** `LobbyHero` — a deco `Panel` with `MaskMark`, "Welcome back, {username}" (Cinzel), the balance in `font-numeral` tabular, and the daily CTA: if eligible, a primary `Button` "Claim +N daily" (calls `walletStore.claimDaily` → Toast + `win.small` sound, same flow as `DailyClaimChip` — extract a shared `useDailyClaim()` hook in `src/components/useDailyClaim.ts` so the chip + hero + zero-state share one implementation; refactor `DailyClaimChip` to use it); if not eligible, a muted "Next top-up {time}" line (reuse `formatNextDaily`).
- [ ] **Step 2:** When `balance === 0`, render the #1 `EmptyState` (mask + "You're out of chips" + the daily claim CTA if eligible, else the next-eligible time + a note that chips refill daily) in place of / above the grid. Test: eligible vs not shows the right CTA; balance>0 shows the normal hero.
- [ ] **Step 3: Commit** `feat(shell): LobbyHero + daily claim + zero-balance state`.

### Task B.3: Assemble `LobbyPage` + re-skin RecentActivityStrip

**Files:** Modify `src/pages/LobbyPage.tsx`, `src/pages/lobby/RecentActivityStrip.tsx` (+ `LobbyPage.test.tsx`)

- [ ] **Step 1:** Compose `LobbyPage` = `LobbyHero` + `GameGrid` + re-skinned `RecentActivityStrip` (design-system tokens; lucide icons; staggered reveal via #2 `staggerContainer`/`staggerItem`, reduced-motion aware). Retire `CabinetCarousel` (replaced by `GameGrid`) — delete it + its references/tests, or keep if still imported elsewhere (grep first).
- [ ] **Step 2:** Update `LobbyPage.test.tsx`: renders hero (welcome + balance), a cabinet per game, the activity strip; zero-balance path shows the EmptyState. Commit `feat(shell): assemble Lobby (hero + grid + activity)`.
- [ ] **Step 3: DoD + PR B.** Full DoD + prettier --check. Push, open PR `phase-15(#3) PR B: lobby overhaul`.

---

## PR C — Auth + Profile

**Branch:** `phase-15-3-pr-c` (off main after PR B). Login/Register re-skin + the real Profile page + `auth.updateProfile`.

### Task C.1: `auth.updateProfile`

**Files:** Modify `src/systems/auth.ts`; Create `src/systems/auth.updateProfile.test.ts`

- [ ] **Step 1: Test** (fake-indexeddb): updates username + avatarColor; rejects a username whose `usernameLower` is taken by another user; leaves omitted fields unchanged:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '@/db';
import { register, updateProfile } from './auth';

describe('updateProfile', () => {
  beforeEach(async () => {
    await db.users.clear();
  });
  it('updates username + avatarColor', async () => {
    const { user } = await register({ username: 'Adam', password: 'pw123456' });
    const res = await updateProfile(user.id, { username: 'Ace', avatarColor: '#123456' });
    expect(res.ok).toBe(true);
    const row = await db.users.get(user.id);
    expect(row?.username).toBe('Ace');
    expect(row?.usernameLower).toBe('ace');
    expect(row?.avatarColor).toBe('#123456');
  });
  it('rejects a taken username', async () => {
    await register({ username: 'Taken', password: 'pw123456' });
    const { user } = await register({ username: 'Me', password: 'pw123456' });
    const res = await updateProfile(user.id, { username: 'taken' });
    expect(res).toEqual({ ok: false, error: 'username_taken' });
  });
});
```

(Match `register`'s actual return shape — adjust the destructure if it returns `{ ok, user }`.)

- [ ] **Step 2: Implement** `updateProfile` in `auth.ts`:

```typescript
export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; error: 'username_taken' | 'not_found' };

export async function updateProfile(
  userId: string,
  patch: { username?: string; avatarColor?: string },
): Promise<UpdateProfileResult> {
  const user = await db.users.get(userId);
  if (!user) return { ok: false, error: 'not_found' };
  const next: Partial<typeof user> = {};
  if (patch.username !== undefined) {
    const username = patch.username.trim();
    const usernameLower = username.toLowerCase();
    const clash = await db.users.where('usernameLower').equals(usernameLower).first();
    if (clash && clash.id !== userId) return { ok: false, error: 'username_taken' };
    next.username = username;
    next.usernameLower = usernameLower;
  }
  if (patch.avatarColor !== undefined) next.avatarColor = patch.avatarColor;
  await db.users.update(userId, next);
  return { ok: true };
}
```

- [ ] **Step 3: PASS. Commit** `feat(auth): add updateProfile (username uniqueness + avatar)`.

### Task C.2: Login + Register re-skin

**Files:** Modify `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx` (+ tests)

- [ ] **Step 1:** Re-skin both on a centered deco `Card` with the `MaskMark` + Wordmark header, `Field`+`Input` (username/password), a primary `Button` submit, and `Field` error display for auth failures; keep the existing `auth.login`/`register` calls + the `DevWipeButton`. Keep tests green (adjust selectors to the new labelled fields; assert error rendering via the Field). Commit `feat(shell): re-skin Login + Register`.

### Task C.3: Real Profile page (view + edit)

**Files:** Create `src/pages/ProfilePage.tsx`, `ProfilePage.test.tsx`; Modify `src/router.tsx`; delete `src/pages/ProfileStubPage.tsx`

- [ ] **Step 1:** `ProfilePage` — **view:** a deco `Card` with the avatar swatch (`user.avatarColor`), username (Cinzel), "Joined {date}", balance (`font-numeral`), and a compact stats summary (total rounds / net / biggest win via `systems/stats` `getUserMetrics` or equivalent — grep the available fn). **Edit** (toggle in-page or the `/profile/edit` route): a `Field`+`Input` for username + an avatar-colour picker (a small row of `tokens` swatch buttons or a native `<input type="color">` styled), Save → `auth.updateProfile(user.id, {...})` → on `username_taken` show a `Field` error; on success refresh `sessionStore.currentUser` (re-fetch the user) + Toast. Cancel reverts.
- [ ] **Step 2:** In `src/router.tsx`, replace the two `ProfileStubPage` routes with `<ProfilePage />` (`/profile`) and `<ProfilePage edit />` (`/profile/edit`), lazy or eager like neighbours; remove the `ProfileStubPage` import + delete the file.
- [ ] **Step 3: Test** `ProfilePage.test.tsx` (fake-indexeddb + seeded session): view shows username/joined/balance/stats; edit + Save calls `updateProfile` and reflects the new username; a taken username surfaces the error; cancel reverts. Commit `feat(shell): real Profile page (view + edit)`.
- [ ] **Step 4: DoD + PR C.** Full DoD + prettier --check. Push, open PR `phase-15(#3) PR C: auth + profile`. Completes #3.

---

## Self-review

- **Spec coverage:** TopBar+DailyClaimChip+CreditsDropdown (§3 → A.2/A.3) · Sidebar re-skin + icon migration (§3/3.1 → A.1/A.4) · Lobby Option A: hero+grid+activity+zero-state (§3 → B.1–B.3) · daily-top-up flow shared across chip/hero/zero-state via `useDailyClaim` (§4 → A.2/B.2) · Login/Register re-skin (§3 → C.2) · real Profile view+edit + `auth.updateProfile` replacing the stub (§3 → C.1/C.3) · testing (§6 → per-task) · 3-PR split (§5 → A/B/C). ✓
- **Placeholder scan:** full code for `NAV_ICON`, `DailyClaimChip`, `updateProfile`; re-skin assemblies (CreditsDropdown/Sidebar/Lobby/Login/Profile) specified by exact files + primitives + props + test checklists — implementable, no "TBD"/"handle edge cases". The `useDailyClaim` shared hook is introduced in A.2 and reused in B.2 (noted both places).
- **Type/name consistency:** `NAV_ICON` keys/`IconName` consistent across gameIcons/Sidebar/GameCabinet; `claimDaily(userId)` + result shape consistent (flagged "confirm" in A.2); `updateProfile` signature + `UpdateProfileResult` consistent between helper + ProfilePage; `useDailyClaim` shared by chip/hero/zero-state. ✓
- **Risk notes (verify-first, flagged inline):** confirm lucide icon names exist (test catches it — A.1); confirm `walletStore.claimDaily` result fields + `WALLET_CONFIG.DAILY_CLAIM_AMOUNT`; confirm `register`'s return shape + the `systems/stats` per-user metrics fn name; grep `CabinetCarousel` usages before deleting. Run `pnpm exec prettier --check .` every PR (lint-staged misses some globs).
- **Additive/invariants:** shell-only; no `src/games/**`; integer money via `walletStore`/`auth`; one rounds row unaffected; reduced-motion via #2; tokens-only.
