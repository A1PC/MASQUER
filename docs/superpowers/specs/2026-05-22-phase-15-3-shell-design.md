# Phase 15 · Sub-project #3 — Shell & Navigation Overhaul

**Status:** Design spec. Part of the [Phase 15 umbrella roadmap](./2026-05-22-phase-15-umbrella-roadmap-design.md); builds on #0 brand, #1 components, #2 motion/sound. Rebuilds the app frame on the design system — the last foundation track before per-game upgrades.

**Date:** 2026-05-22

---

## 1. Goal

Rebuild MASQUER's shell — TopBar, Sidebar, Lobby, Login/Register, Profile — on the #1 primitives + #2 motion/sound, so the frame around the games feels like one designed product. Surface the daily top-up prominently, add global empty/zero-balance states, migrate shell icons from emoji to proper SVGs, and replace the Profile stub with a real view + edit page. This validates the whole system on real, high-traffic screens before the per-game work.

## 2. Decisions (from brainstorming)

- **Lobby layout:** "Marquee hero + even game grid" (Option A) — a hero bar (mask + welcome + balance + daily-claim chip) over an even, scannable grid of game cabinets, then the recent-activity strip.
- **Profile:** a real **view + edit** page (avatar, username, joined date, stats/balance summary; edit username + avatar color), replacing the stub.
- **Icons:** migrate Sidebar nav **and** lobby game-cabinet icons from emoji to lucide/brand SVGs via the #1 `Icon`.
- **Daily top-up:** a **TopBar claim chip** (when eligible) **plus** a lobby claim CTA + a zero-balance empty-state prompt.

## 3. Architecture & components

All screens rebuilt from `@/components/ui` primitives (Card/Panel/Button/Field/Input/Select/Icon/EmptyState/Toast/Modal), the #0 tokens, and #2 motion (`useEffectiveReducedMotion`, shared variants, `useSound`). No new state model — read `walletStore` (balance, daily eligibility), `sessionStore` (currentUser), `prefsStore`.

- **TopBar** — Wordmark (from #0) + a re-skinned **CreditsDropdown** (balance in Poiret One tabular) + a **DailyClaimChip** (shows "Claim +N" when `nextDailyEligibleAt <= now`; calls `walletStore.claimDaily`; success Toast + `win.small` sound) + ProfileDropdown.
- **Sidebar** — re-skinned nav built from a `NAV_ITEMS` config (route, `iconName` (lucide), label); active state = gold text + gold left-rail indicator; respects collapse (`uiStore`). A `GAME_ICON` map provides each game's icon.
- **Lobby** — `LobbyHero` (mask + "Welcome back, {name}" + balance + DailyClaim CTA) + `GameGrid` (even responsive grid of `GameCabinet` cards — deco Card + game `Icon` + name + status; click → route or variant modal for poker) + the existing `RecentActivityStrip` re-skinned. Zero-balance → an `EmptyState` (claim-daily CTA if eligible, else next-eligible time).
- **Login / Register** — re-skinned with `Card` + `Field`/`Input` + `Button`; keep the existing `auth` flow + `DevWipeButton`; error states via `Field` error.
- **Profile** — `ProfilePage` (view): avatar swatch, username (Cinzel), joined date, a compact stats summary (total played / net / biggest win from `systems/stats`) + balance; an **Edit** mode (or `/profile/edit`): `Field` username + an avatar-color picker; Save calls a new `auth.updateProfile(userId, { username?, avatarColor? })` (validates username uniqueness via `usernameLower`); success Toast. Replaces `ProfileStubPage`.

### 3.1 `GAME_ICON` map

A single `src/components/nav/gameIcons.ts` mapping each `Round['game']` (+ poker variants + lottery) to a lucide `IconName` (or `MaskMark` for the brand): e.g. blackjack→`Spade`, roulette→`CircleDot`, slots→`Cherry`, baccarat→`Diamond`, coin-flip→`CircleDollarSign`, craps→`Dices`, bingo→`Grid3x3`, plinko→`ChevronsDown`, poker→`Club`, lottery→`Ticket`, stats→`ChartBar`, leaderboard→`Trophy`, settings→`Settings`. (Confirm exact lucide names at build; pick the closest available.) Sidebar + lobby both consume this map — one source of truth.

## 4. Daily top-up flow

`DailyClaimChip` (TopBar) + lobby CTA + zero-state CTA all call `walletStore.claimDaily(userId)`; on success show a Toast ("+N chips") + play `win.small`; when not eligible, show the next-eligible time (reuse the Settings page's `formatNextDaily`). The chip only renders when eligible (no clutter otherwise).

## 5. PR split

- **PR A — Chrome:** TopBar (CreditsDropdown re-skin + `DailyClaimChip`) + Sidebar re-skin + `NAV_ITEMS`/`GAME_ICON` config + lucide nav icons. Tests + stories for new shell bits where sensible.
- **PR B — Lobby:** `LobbyHero` + `GameGrid`/`GameCabinet` (brand icons) + re-skinned `RecentActivityStrip` + zero-balance `EmptyState` + daily CTA. Tests.
- **PR C — Auth + Profile:** Login/Register re-skin + the real `ProfilePage` (view+edit) + `auth.updateProfile` helper + routes (replace the two `ProfileStubPage` routes). Tests. Completes #3.

## 6. Testing

- **TopBar/DailyClaimChip:** chip renders only when eligible; clicking claims (mock `walletStore.claimDaily`) + fires Toast; balance shown.
- **Sidebar:** renders all nav items with icons + labels; active route highlighted; collapse hides labels. Update existing Sidebar tests (icon assertions).
- **Lobby:** renders the hero (name + balance), a cabinet per game, the activity strip; zero-balance shows the EmptyState with the right CTA (eligible vs not). Update `LobbyPage.test`.
- **Login/Register:** form renders, validation errors via Field, successful submit calls `auth`.
- **Profile:** view renders the user's data + stats; edit saves via `auth.updateProfile`; duplicate username shows an error; cancel reverts.
- **`auth.updateProfile`:** updates username + avatarColor; rejects a taken `usernameLower`; no-op fields left unchanged (unit, fake-indexeddb).
- DoD per PR: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`.

## 7. Invariants & out of scope

Game logic untouched (shell only); games sandbox preserved; integer money (claim/profile go through `walletStore`/`auth`, never bypass); one rounds row per game unaffected; seeded RNG unaffected; all ADRs intact; tokens-only; `prefers-reduced-motion` honored (via #2); CLAUDE.md not edited; `BUILD_GUIDE.md` updated spec-first. **Out of scope:** the games themselves (their own sub-projects); admin (#16); the stats/leaderboard _page internals_ (only their sidebar nav entries get the new icons — full re-skin of stats/leaderboard pages is folded into #17 polish or a follow-up); new games.

## 8. Open decisions

None outstanding — lobby layout (A), profile depth (view+edit), icon migration (sidebar+lobby), and daily-top-up surfacing (TopBar chip + lobby/zero-state) are locked. Editing username is allowed (uniqueness-checked); avatar is the existing color swatch (no image upload — YAGNI for a local app).
