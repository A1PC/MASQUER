# ADR-0043: Design-system stack

- Status: Accepted
- Date: 2026-05-22
- Deciders: @adamzspare

## Context

The app accreted ~91 distinct ad-hoc button class-strings and 7 separate modal
implementations across its screens. There is no shared, accessible UI vocabulary,
so every screen reinvents buttons, panels, fields, and dialogs — causing visual
drift, duplicated focus/keyboard handling, and inconsistent accessibility.

Phase 15 #1 builds a cohesive MASQUER (Velvet Deco) primitive library in
`src/components/ui/` so the per-screen rebuilds (sub-projects #3+) compose from one
vocabulary. The brand tokens land in #0 (`src/theme/tokens.ts`). We must pick a
stack that delivers accessible behavior, typed/consistent styling, swappable icons,
and a visual-QA surface — all while preserving the offline-first guarantee (no
runtime network dependency).

## Decision

Adopt the following stack for the design system, all under `src/components/ui/`:

- **Radix UI primitives** (`@radix-ui/react-*`) — unstyled, accessible behavior
  (focus trap, escape, ARIA roles, keyboard nav) for Dialog, Tabs, Tooltip,
  DropdownMenu, Toast, Select, Switch, Slider, Checkbox, RadioGroup. We style them
  in Velvet Deco. PR A uses `@radix-ui/react-slot` (for `Button asChild`); the
  remaining parts install in PR B/C as their components land.
- **lucide-react** — SVG icon set, wrapped in our own `<Icon name=… />` so the rest
  of the app never imports lucide directly (consistent sizing/stroke, swappable).
- **class-variance-authority + clsx + tailwind-merge** — `cva` for typed
  `variant`/`size` APIs; a single `cn()` helper (`src/components/ui/cn.ts`) merges
  `clsx` semantics with `tailwind-merge` conflict resolution so `className`
  passthrough never duplicates/conflicts.
- **Storybook** (`@storybook/react-vite` + `@storybook/addon-essentials` +
  `@storybook/addon-a11y`) — one story per primitive (all variants/states +
  controls + the a11y addon) as the showcase + visual-QA surface. Dev-only;
  not in the app bundle. Storybook build is **not** a CI gate — the four DoD
  commands (`lint`, `typecheck`, `vitest run`, `build`) remain authoritative.

All primitives follow shared conventions: cva variants, `cn()` className merge,
`forwardRef` on interactive primitives, Radix `asChild`/`Slot` for polymorphism,
controlled + uncontrolled where Radix supports it, **tokens-only styling** (no raw
hex except inside intrinsically-colour-bearing SVG art and the documented dark-ink
`#241702` text on gold-gradient buttons), visible gold `:focus-visible` ring, and
`prefers-reduced-motion` honored on every animation. See spec §2/§4.

## Alternatives considered

- **Headless UI** — fewer primitives than Radix (no Slider/Toast/DropdownMenu of
  comparable maturity), weaker composition story. Radix's part-based API and
  `asChild` fit the cva pattern better.
- **A full component kit (MUI / Chakra / shadcn-as-dep)** — heavy runtime, opinionated
  theming that fights the bespoke Velvet Deco look, larger bundle. We want unstyled
  behavior + our own styling, which Radix + cva gives directly. (shadcn's _patterns_
  — Radix + cva + `cn()` — are adopted; we vendor our own components, not a dep.)
- **Hand-rolled accessibility** — re-implementing focus traps, roving tabindex, and
  ARIA per component is error-prone and exactly the duplication we are removing.
- **No Storybook** — lose the variant matrix + a11y addon visual-QA surface; harder
  to review the locked visual language. Kept dev-only so it adds no bundle cost.

## Consequences

- One typed, accessible vocabulary; screens later rebuild from `@/components/ui`
  instead of ad-hoc markup, killing the ~91-button / 7-modal drift.
- New deps: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`,
  `@radix-ui/react-slot` (PR A) + further Radix parts (PR B/C) at runtime, and
  Storybook + addons as devDeps. All bundle at build or are dev-only — **offline-safe**;
  the offline-first guarantee holds.
- `*.stories.tsx` files live alongside components; an ESLint override disables
  `react-refresh/only-export-components` for `**/*.stories.tsx` (stories export a
  default `meta` + named stories by design).
- The library is **additive**: existing screens keep their current markup until
  their own sub-projects adopt these primitives — nothing is force-migrated in #1.
- We lock into Radix's behavior model and cva's variant model; swapping either later
  would touch every primitive. Both are stable, widely-used, and tree-shakeable.

## References

- `docs/superpowers/specs/2026-05-22-phase-15-1-design-system-design.md` §2 (stack),
  §4 (API conventions), §5 (locked visual language)
- `docs/superpowers/plans/2026-05-22-phase-15-1-design-system-plan.md` — PR A/B/C tasks
- `src/components/ui/cn.ts` — the `cn()` helper
- ADR-0027 — blackjack card style (prior brand/visual decision)
- BUILD_GUIDE.md — Phase 15 design-system foundation
