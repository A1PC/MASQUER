# Phase 15 — Polish & Overhaul: Umbrella Roadmap

**Status:** Roadmap / master plan. This document is NOT a single implementation spec — it decomposes Phase 15 into independent sub-projects and locks the shared principles every sub-project must obey. Each sub-project gets its OWN `spec → plan → subagent PRs → release` cycle. Update the "Progress" table here as sub-projects ship.

**Date:** 2026-05-22
**Supersedes:** the single-row "Phase 15 — Polish" entry in `BUILD_GUIDE.md` §12 and `project_localgamble_status.md`.

---

## 1. Goal

Bring localGamble to a finished, cohesive, genuinely-fun state: a complete UI/UX overhaul across every screen, real animation and sound, a final brand, a triaged set of feature additions per game, an expanded + re-skinned admin area, and a closing integration/QA pass. The end state: the app feels like one designed product, not 14 phases of independently-built games.

## 2. Why decomposed

Phase 15 touches ~143 non-test components across 10 games (incl. the poker trio), 5 page areas, the shell, and the admin area. It spans multiple genuinely independent subsystems (brand, design system, motion/sound infra, shell, each game, admin). A single spec would be unbuildable and unreviewable. Decomposition lets each piece ship independently, keeps reviews tractable, and lets the foundation stabilize before dependents build on it.

## 3. Sub-projects (ordered by dependency)

Sub-projects 0–3 are the **foundation** and are strictly sequential — each gates the next. Sub-projects 4+ (games, admin) consume the foundation and can be sequenced flexibly. The final integration pass is last.

| #   | Sub-project                           | Scope (one-liner)                                                                                                                                                                                                                        | Depends on |
| --- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 0   | **Brand + Design Language**           | Final product name, logo, color palette, typography & spacing scale, and the documented motion + sound _principles_ (decisions, not code). The "old-school Vegas content × modern-web execution" language made concrete.                 | —          |
| 1   | **Design-system component library**   | Shared, tested UI primitives built on the #0 tokens: Button, Card, Panel, Modal, Chip, Badge, Tabs, Toast, EmptyState, Field/Input, etc. The vocabulary every screen is rebuilt from.                                                    | 0          |
| 2   | **Motion & Sound infrastructure**     | `useSound` hook + audio asset pipeline + volume/mute settings; a shared Framer-Motion variant library + route/page transitions; a **Settings page** (sound volume, reduced-motion override, etc.). All respect `prefers-reduced-motion`. | 1          |
| 3   | **Shell & navigation overhaul**       | TopBar, Sidebar, Lobby, Login/Register, Profile, daily top-up surfacing, and the global empty/zero-balance states — rebuilt on the design system. Validates the system on real screens before the games.                                 | 1, 2       |
| 4   | **Blackjack** upgrade                 | Re-skin + animation + sound + triaged feature adds.                                                                                                                                                                                      | 1, 2       |
| 5   | **Roulette** upgrade                  | "                                                                                                                                                                                                                                        | 1, 2       |
| 6   | **Slots** upgrade                     | "                                                                                                                                                                                                                                        | 1, 2       |
| 7   | **Baccarat** upgrade                  | "                                                                                                                                                                                                                                        | 1, 2       |
| 8   | **Coin-flip** upgrade                 | "                                                                                                                                                                                                                                        | 1, 2       |
| 9   | **Craps** upgrade                     | " (and the deferred craps items: put/buy/lay, working-on-come-out, etc.)                                                                                                                                                                 | 1, 2       |
| 10  | **Bingo** upgrade                     | "                                                                                                                                                                                                                                        | 1, 2       |
| 11  | **Plinko** upgrade                    | " (sound/jackpot celebration are strong candidates here)                                                                                                                                                                                 | 1, 2       |
| 12  | **Lottery** upgrade                   | "                                                                                                                                                                                                                                        | 1, 2       |
| 13  | **Poker — Hold'em** upgrade           | Re-skins the shared `poker/_shared/` core + Hold'em UI; **establishes the poker-table visual language** the other two variants adopt.                                                                                                    | 1, 2       |
| 14  | **Poker — Five-Card Draw** upgrade    | Adopts the #13 poker visual language for consistency; variant-specific feature adds.                                                                                                                                                     | 1, 2, 13   |
| 15  | **Poker — Omaha** upgrade             | Adopts the #13 poker visual language for consistency; variant-specific feature adds.                                                                                                                                                     | 1, 2, 13   |
| 16  | **Admin overhaul + expansion**        | Re-skin ALL `/admin/*` pages (incl. admin login) to the design system; expand capabilities — per-game tuning consoles (building on the `/admin/bingo` precedent), richer analytics, any new admin tooling triaged from the docket.       | 1, 2       |
| 17  | **Final integration & launch polish** | Cross-screen consistency audit, per-game `React.lazy` bundle splitting, full manual-smoke sweep across every game + admin, zero/empty-state QA, and the closing pass.                                                                    | all        |

**Sequencing notes:**

- The three poker sub-projects (#13–15) share consistency by construction: #13 re-skins `poker/_shared/` and locks the table visual language; #14 and #15 are near-mechanical adopters plus their own feature adds.
- Games #4–12 are independent of each other and of poker — they can be reordered freely (e.g. tackle the most-played first, or the simplest first to validate the system).
- Admin (#16) is independent of the games and could run early to re-skin admin once the design system exists.

## 4. Shared principles (every sub-project MUST obey)

These are the cross-cutting contracts. Each sub-project's own spec inherits them by reference.

### 4.1 Brand & design language

- North star: **old-school Vegas content, modern-web execution** (see `project_localgamble_design_philosophy`). Authentic casino vocabulary (felt, neon, gold, chips, classic card faces) rendered with crisp modern layout, centered scaling, smooth transitions, no jank.
- Final name/logo/palette/type/spacing scale are decided in **#0** and consumed everywhere via `src/theme/tokens.ts` + the tailwind config + the #1 component library. **No hard-coded hex** in components after the overhaul — tokens only (this is already a CLAUDE.md rule; the overhaul makes it real).

### 4.2 Motion

- One shared Framer-Motion variant library (defined in #2). Games reuse named variants rather than bespoke transitions.
- **`prefers-reduced-motion` is honored everywhere** via `useReducedMotion()` — every animated surface has an instant/eased-down fallback. (Established pattern across all current games.)
- No layout jank; centered scaling for responsive game surfaces.

### 4.3 Sound

- One `useSound` hook (defined in #2) is the ONLY sound integration point — games call it, never embed `<audio>` directly. Volume + mute live in the Settings page and persist (localStorage or Dexie).
- Sound respects a global mute and reduced-motion-adjacent preferences. Sensible defaults; never autoplay-blocked-noise on load.

### 4.4 Invariants that must survive the overhaul (do NOT regress)

- **Game logic is untouched by UI work.** The overhaul is presentational + additive features. Pure logic (`*.ts` in `src/games/**`), resolvers, machines, and their tests stay green. Feature adds get their own logic + tests.
- **Games sandbox** (CLAUDE.md rule 4): `src/games/**` never imports `@/db/*` or `@/store/*`; wallet access goes through `useGameRound` / `src/systems/**`.
- **One rounds row per game** (ADR-0016; session exception ADR-0041). Feature adds must not fragment or duplicate rounds rows.
- **Money is integers; no `Math.random()`** (seeded RNG only). All existing ADRs (0001–0042) remain authoritative.
- **CLAUDE.md is owned by the user** — never edit it. `BUILD_GUIDE.md` is updated spec-first.

### 4.5 Testing & DoD

- Every PR: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build` all green.
- UI work adds/updates component + integration tests; feature adds are TDD'd (logic test before UI).
- **Manual smoke is explicit:** because implementer subagents run headless, every game/admin sub-project ends with a written manual-smoke checklist for the user; the final pass (#17) is a full sweep.

### 4.6 Performance

- Per-game `React.lazy` bundle splitting (deferred from Phase 9) is folded into the overhaul — either per game sub-project or consolidated in #17. Main bundle should not balloon; audio assets are lazy/on-demand.

## 5. Deferred-features docket triage

The `localgamble-deferred-features` memory catalogs per-game + admin feature candidates. It is NOT auto-included. When designing each game/admin sub-project, run that game's docket items through the docket's own evaluation framework (player impact / cost / polish synergy / maintenance burden) and decide ship-now / fold-in / defer. The chosen feature adds become part of that sub-project's spec.

## 6. Per-sub-project workflow

Each sub-project (0–17) follows the established cycle:

1. **brainstorming** → its own design spec at `docs/superpowers/specs/YYYY-MM-DD-phase-15-<n>-<name>-design.md` → commit → docs PR → merge.
2. **writing-plans** → implementation plan at `docs/superpowers/plans/...` → docs PR → merge.
3. **subagent-driven-development** → one subagent per PR, controller monitors CI + merges squash/delete on green.
4. Release/checkpoint as appropriate (the foundation sub-projects may share a tag; each is at least a clean merged increment).

This umbrella's **Progress** table is updated as each sub-project completes.

## 7. Open decisions (resolved in sub-project #0)

- **Product name** — "localGamble" is a working title; the real name is chosen in #0.
- **Logo** — wordmark/mark direction.
- **Palette** — keep/evolve the current felt-green + casino-red + gold + cyan/magenta-neon, or re-pitch.
- **Type scale** — current display (Bungee/Anton) + body (Inter) + mono (JetBrains) — confirm or revise.
- **Motion + sound principle docs** — the named-variant catalog and the sound taxonomy (which events get sound).

## 8. Progress

| #     | Sub-project                                                                                 | Status                          |
| ----- | ------------------------------------------------------------------------------------------- | ------------------------------- |
| 0     | Brand + Design Language                                                                     | ✅ Done (merged)                |
| 1     | Design-system component library                                                             | ✅ Done (25 primitives, merged) |
| 2     | Motion & Sound infrastructure                                                               | ✅ Done (3 PRs, merged)         |
| 3     | Shell & navigation overhaul                                                                 | In progress (spec)              |
| 4–12  | Per-game upgrades (BJ, roulette, slots, baccarat, coin-flip, craps, bingo, plinko, lottery) | Not started                     |
| 13–15 | Poker upgrades (Hold'em, Five-Card Draw, Omaha)                                             | Not started                     |
| 16    | Admin overhaul + expansion                                                                  | Not started                     |
| 17    | Final integration & launch polish                                                           | Not started                     |
