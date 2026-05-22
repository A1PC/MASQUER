# Phase 15 · Sub-project #1 — Design-System Component Library

**Status:** Design spec. Part of the [Phase 15 umbrella roadmap](./2026-05-22-phase-15-umbrella-roadmap-design.md); consumes the brand foundation from [#0](./2026-05-22-phase-15-0-brand-design-language-design.md). Produces the shared UI primitives every screen is rebuilt from.

**Date:** 2026-05-22

---

## 1. Goal

Build a cohesive, accessible, tested library of MASQUER UI primitives in `src/components/ui/`, styled in Velvet Deco on the #0 tokens, so the per-screen rebuilds (sub-projects #3+) compose screens from one vocabulary instead of ad-hoc markup. Today the app has ~91 distinct button class-strings and 7 separate modal implementations — this library replaces that drift with typed, documented, reusable components.

## 2. Stack (decided in brainstorming)

- **Radix UI primitives** (`@radix-ui/react-*`) — unstyled, accessible behavior (focus trap, escape, ARIA, keyboard) for Dialog, Tabs, Tooltip, DropdownMenu, Toast, Select, Switch, Slider, Checkbox, RadioGroup. We style them in Velvet Deco. Bundled at build (offline-safe).
- **lucide-react** — SVG icon set, wrapped in our own `<Icon>` so the rest of the app never imports lucide directly (swappable, consistent sizing/stroke). Replaces emoji over time (screens migrate in their own sub-projects).
- **cva + clsx + tailwind-merge** — `class-variance-authority` for typed `variant`/`size` APIs; a single `cn()` helper (`src/components/ui/cn.ts`) merges `clsx` + `tailwind-merge` so `className` passthrough never duplicates/conflicts.
- **Storybook** (`@storybook/react-vite` + `@storybook/addon-a11y` + essentials) — a story per primitive (all variants/states + controls + the a11y addon) is the showcase + visual-QA surface. Dev-only tooling; not in the app bundle. Storybook build is **not** a CI gate (the four DoD commands remain authoritative); stories are maintained alongside components.

All new deps bundle at build / are dev-only — the offline-first guarantee holds.

## 3. File structure

```
src/components/ui/
  cn.ts                     # clsx + tailwind-merge helper
  index.ts                  # barrel export of all primitives
  Button.tsx  Button.stories.tsx  Button.test.tsx
  Card.tsx    …             # one trio (component / stories / test) per primitive
  Icon.tsx                  # lucide wrapper: <Icon name="spade" size=… />
  Spinner.tsx               # mask-reveal loader (reuses MaskMark)
  …
.storybook/                 # main.ts + preview.ts (Velvet Deco bg, font load, a11y addon)
```

- One primitive per file, with a colocated `*.stories.tsx` and `*.test.tsx`. Files stay focused.
- `index.ts` re-exports every primitive for ergonomic imports (`import { Button, Card } from '@/components/ui'`).
- `src/components/brand/MaskMark.tsx` (from #0) is reused by `Spinner` and `Chip`.

## 4. API conventions (all primitives follow these)

- **Variants** via cva: every styled primitive exposes `variant` and (where relevant) `size` props with typed unions. Example: `Button` `variant: 'primary' | 'secondary' | 'danger' | 'ghost'`, `size: 'sm' | 'md' | 'lg'`.
- **`className` passthrough** merged through `cn()` (consumer overrides win, no duplicate Tailwind classes).
- **`forwardRef`** on every interactive primitive; spread remaining props to the underlying element/Radix part.
- **Composition** via Radix `asChild`/`Slot` where polymorphism helps (e.g. `Button asChild` to render a router `<Link>`).
- **Controlled + uncontrolled** supported wherever Radix supports it (Dialog/Tabs/Switch/etc.).
- **Tokens only** — components use Tailwind classes mapped to #0 tokens; no raw hex except inside intrinsically-colour-bearing SVG art (the mask).
- **Accessibility** — Radix handles roles/focus for behavior primitives; for the rest: visible focus ring (gold, `:focus-visible`), `aria-label` on icon-only controls, 44px min hit area on touch targets, functional colour always paired with icon/text.
- **Motion** — tasteful built-in transitions (Tailwind transitions; Framer Motion for overlay enter/exit). Every animation respects `prefers-reduced-motion` from day one. Sub-project #2 later extracts a shared motion-variant library and these components adopt it; #1 does not block on #2.

## 5. Visual language (LOCKED via the gallery preview)

Reference mockup: `.superpowers/brainstorm/72099-1779474705/content/component-gallery.html`. Summary of the approved treatment:

- **Buttons:** primary = gold gradient (`gold→gold-deep`) on dark ink with a soft gold glow; secondary = transparent with brass hairline + gold text; danger = oxblood gradient; ghost = text-only. Uppercase Montserrat 600, ~1.5px tracking, `rounded-xl`. Loading shows the spinner + label; disabled = 0.4 opacity, no glow.
- **Card / Panel:** the signature **double-rule deco frame** (outer brass border + inset gold hairline) on a felt→surface gradient; Cinzel title, Montserrat body.
- **Chip:** circular, dashed gold edge; `felt`/`velvet`/`emerald` variants; shows either the **mask** emblem or a denomination number.
- **Badge/Tag:** pill; win = gold, loss = oxblood, neutral/push = brass; always with a leading glyph.
- **Field/Input:** uppercase label, dark input with brass border → **gold focus ring** (`focus-visible` 3px gold @ 0.2), helper text; error state = ruby border + oxblood helper.
- **Tabs:** Cinzel labels, active = gold text + gold underline.
- **Modal/Dialog:** deco-framed panel over a 50–60% scrim; Cinzel title, right-aligned actions.
- **Toast:** surface card, gold left-accent bar, mask icon + message + close.
- **Spinner:** the Colombina mask doing a gentle reveal/rotate (instant under reduced-motion).

## 6. Inventory & 3-PR split

**PR A — Foundations + stack/Storybook setup**

- Tooling: install Radix (the parts used in A), `lucide-react`, `cva`, `clsx`, `tailwind-merge`; add `cn.ts`; set up Storybook (`.storybook/main.ts` + `preview.ts` with Velvet Deco background + fonts + a11y addon).
- Primitives: `Icon`, `Button`, `Card`, `Panel`, `Badge`/`Tag`, `Chip`, `Spinner` (mask loader), `Divider`, `Text`/`Heading` (typographic helpers).

**PR B — Forms**

- `Field` (label + helper + error wrapper, integrates with `react-hook-form`), `Input`, `Textarea`, `Select` (Radix), `Switch` (Radix), `Slider` (Radix — used by bet controls), `Checkbox` + `RadioGroup` (Radix).

**PR C — Overlays & feedback**

- `Modal`/`Dialog` (Radix), `Drawer`/`Sheet` (Radix Dialog variant), `Tabs` (Radix), `Tooltip` (Radix), `DropdownMenu` (Radix), `Toast` + `ToastProvider`/`useToast` (Radix), `EmptyState`, `Skeleton`.

Each primitive ships with its cva variants, a `*.stories.tsx` covering every variant/state, and a `*.test.tsx`.

## 7. Testing

- **Unit (RTL) per primitive:** renders; each variant/size applies expected classes/role; `className` passthrough merges; `forwardRef` forwards; disabled is non-interactive.
- **Behavior (overlays):** Dialog opens/closes via trigger + escape + scrim; focus is trapped and restored; Tabs switch on click + arrow keys; Toast announces via `aria-live`; DropdownMenu keyboard navigation. (Radix provides the behavior; tests assert our wiring.)
- **Accessibility:** icon-only controls have `aria-label`; focus-visible ring present; Storybook a11y addon catches contrast/role regressions during review.
- **Stories** double as living visual documentation; reviewers eyeball them in Storybook.
- DoD per PR: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build`.

## 8. Invariants (from the umbrella)

No game logic touched; **additive** (existing screens keep using their current markup until their own sub-projects adopt these primitives — nothing is force-migrated in #1); games sandbox preserved (the UI library is presentational and importable by `src/games/**`); tokens-only; `prefers-reduced-motion` honored; integer money / seeded RNG / one rounds row unaffected; all ADRs intact; CLAUDE.md not edited; `BUILD_GUIDE.md` updated spec-first.

## 9. Out of scope (for #1)

Per-screen rebuilds (sub-projects #3+); the emoji→`Icon` sweep across existing screens (each screen migrates in its own sub-project; #1 only provides `Icon`); the shared motion-variant library + sound (`useSound`) which is #2; any new game features.

## 10. Open decisions

None outstanding — stack (Radix/lucide/cva), showcase (Storybook), scope (full set / 3 PRs), and the visual language are all locked. An ADR may be warranted in PR A to record the design-system stack choice (Radix + cva + lucide + Storybook); decide during planning.
