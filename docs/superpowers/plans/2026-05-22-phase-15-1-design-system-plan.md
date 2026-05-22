# Phase 15 #1 — Design-System Component Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MASQUER UI primitive library in `src/components/ui/` (Radix + lucide + cva, styled Velvet Deco, Storybook-documented, tested), so screens are later rebuilt from one vocabulary.

**Architecture:** Three sequential PRs — **A** Foundations + stack/Storybook setup, **B** Forms, **C** Overlays & feedback. PR A establishes the canonical patterns (the `cn()` helper, the cva variant pattern, `forwardRef`, the colocated `*.stories.tsx` + `*.test.tsx` trio) shown here in **full code**; every later component follows those patterns, specified per-component (Radix part + cva variant table + props + test checklist). Additive: no existing screen is migrated.

**Tech Stack:** TypeScript 5 (strict, exactOptionalPropertyTypes), React 18, Vite 5, Tailwind 3, Radix UI, lucide-react, class-variance-authority + clsx + tailwind-merge, Storybook 8 (react-vite), Vitest 2 + RTL. pnpm 9.12. Path alias `@/* → src/*`. Test env jsdom+globals (`src/test/setup.ts`). Next ADR: **0043**.

**Spec:** `docs/superpowers/specs/2026-05-22-phase-15-1-design-system-design.md`. **Visual reference:** `.superpowers/brainstorm/72099-1779474705/content/component-gallery.html`.

**Branches:** `phase-15-1-pr-a`, `phase-15-1-pr-b`, `phase-15-1-pr-c` (each off main after the prior merges). DoD per PR: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build`. Conventional commits, scope `ui`.

---

## PR A — Foundations + stack & Storybook setup

**Branch:** `phase-15-1-pr-a`. Delivers: deps, `cn()`, ADR-0043, Storybook, and `Icon`, `Button`, `Card`, `Panel`, `Badge`, `Chip`, `Spinner`, `Divider`, `Text`/`Heading` (+ stories + tests + `index.ts` barrel).

### Task A.1: Deps + `cn()` helper

**Files:** Modify `package.json` (via pnpm); Create `src/components/ui/cn.ts`, `src/components/ui/cn.test.ts`

- [ ] **Step 1: Branch + install runtime deps**

```bash
git checkout main && git pull origin main
git checkout -b phase-15-1-pr-a
pnpm add class-variance-authority clsx tailwind-merge lucide-react @radix-ui/react-slot
```

- [ ] **Step 2: Write failing test** `src/components/ui/cn.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('joins truthy classes', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });
  it('later tailwind class wins on conflict (tailwind-merge)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
```

- [ ] **Step 3: Run — expect FAIL.** `pnpm exec vitest run src/components/ui/cn.test.ts`
- [ ] **Step 4: Implement** `src/components/ui/cn.ts`:

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge class names: clsx semantics + tailwind-merge conflict resolution. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: Run — expect PASS.** Commit:

```bash
git add package.json pnpm-lock.yaml src/components/ui/cn.ts src/components/ui/cn.test.ts
git commit -m "feat(ui): add design-system deps + cn() helper"
```

### Task A.2: ADR-0043 — design-system stack

**Files:** Create `docs/adr/0043-design-system-stack.md`

- [ ] **Step 1:** Write the ADR (copy `docs/adr/_template.md` format) recording the decision: Radix UI primitives (accessibility) + lucide-react (icons via `<Icon>`) + cva/clsx/tailwind-merge (`cn()`, typed variants) + Storybook (showcase). Context: ~91 ad-hoc button strings + 7 modal impls; need one accessible vocabulary. Consequences: new deps (all bundle at build / dev-only — offline-safe), components in `src/components/ui/`, tokens-only styling. Reference spec §2.
- [ ] **Step 2: Commit**

```bash
git add docs/adr/0043-design-system-stack.md
git commit -m "docs(ui): ADR-0043 design-system stack"
```

### Task A.3: Storybook

**Files:** Modify `package.json`; Create `.storybook/main.ts`, `.storybook/preview.ts`

- [ ] **Step 1: Install Storybook devDeps**

```bash
pnpm add -D storybook @storybook/react-vite @storybook/addon-essentials @storybook/addon-a11y
```

- [ ] **Step 2: Create `.storybook/main.ts`:**

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/components/ui/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
};
export default config;
```

- [ ] **Step 3: Create `.storybook/preview.ts`** (loads tokens/fonts via index.css; felt background):

```typescript
import type { Preview } from '@storybook/react';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    backgrounds: { default: 'felt', values: [{ name: 'felt', value: '#07100b' }] },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};
export default preview;
```

- [ ] **Step 4: Add scripts to `package.json`** `"storybook": "storybook dev -p 6006"`, `"build-storybook": "storybook build"`.
- [ ] **Step 5: Ensure lint/typecheck accept stories.** If `react-refresh/only-export-components` flags `*.stories.tsx`, add to the ESLint config an override disabling that rule for `**/*.stories.tsx` (and `.storybook/**`). Run `pnpm lint && pnpm typecheck`; fix until clean.
- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml .storybook eslint.config.* 2>/dev/null
git commit -m "feat(ui): set up Storybook (react-vite + a11y addon)"
```

### Task A.4: Icon (lucide wrapper)

**Files:** Create `src/components/ui/Icon.tsx`, `Icon.test.tsx`, `Icon.stories.tsx`

- [ ] **Step 1: Failing test** `Icon.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Icon } from './Icon';

describe('Icon', () => {
  it('renders an svg with an accessible label', () => {
    const { getByRole } = render(<Icon name="spade" label="spade" size={24} />);
    const el = getByRole('img', { name: 'spade' });
    expect(el.tagName.toLowerCase()).toBe('svg');
  });
  it('is aria-hidden when decorative (no label)', () => {
    const { container } = render(<Icon name="spade" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** `Icon.tsx`:

```tsx
import { forwardRef } from 'react';
import { icons, type LucideProps } from 'lucide-react';

export type IconName = keyof typeof icons;

interface IconProps extends Omit<LucideProps, 'ref'> {
  name: IconName;
  /** Accessible label. Omit for purely decorative icons (renders aria-hidden). */
  label?: string;
  size?: number;
}

export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  { name, label, size = 20, ...rest },
  ref,
) {
  const Glyph = icons[name];
  return (
    <Glyph
      ref={ref}
      size={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
    />
  );
});
```

- [ ] **Step 4: Story** `Icon.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Icon } from './Icon';

const meta: Meta<typeof Icon> = {
  title: 'UI/Icon',
  component: Icon,
  args: { name: 'spade', size: 28 },
};
export default meta;
export const Default: StoryObj<typeof Icon> = {};
export const Labelled: StoryObj<typeof Icon> = { args: { name: 'coins', label: 'chips' } };
```

- [ ] **Step 5: Run — expect PASS.** Commit:

```bash
git add src/components/ui/Icon.tsx src/components/ui/Icon.test.tsx src/components/ui/Icon.stories.tsx
git commit -m "feat(ui): Icon (lucide wrapper)"
```

### Task A.5: Button — the cva exemplar

**Files:** Create `src/components/ui/Button.tsx`, `Button.test.tsx`, `Button.stories.tsx`

- [ ] **Step 1: Failing test** `Button.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children and fires onClick', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<Button onClick={onClick}>Deal</Button>);
    fireEvent.click(getByRole('button', { name: 'Deal' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
  it('merges className via cn (no duplicate padding)', () => {
    const { getByRole } = render(
      <Button size="md" className="px-8">
        X
      </Button>,
    );
    expect(getByRole('button').className).toContain('px-8');
  });
  it('is disabled and shows the spinner when loading', () => {
    const { getByRole } = render(<Button loading>Go</Button>);
    expect(getByRole('button')).toBeDisabled();
  });
  it('renders as a child element via asChild', () => {
    const { getByRole } = render(
      <Button asChild>
        <a href="/x">Link</a>
      </Button>,
    );
    expect(getByRole('link', { name: 'Link' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** `Button.tsx` (the canonical cva + forwardRef + asChild + Spinner pattern):

```tsx
import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';
import { Spinner } from './Spinner';

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-body font-semibold uppercase tracking-[0.12em] ' +
    'transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ' +
    'disabled:opacity-40 disabled:pointer-events-none motion-safe:active:scale-[0.97]',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-to-b from-gold to-gold-deep text-[#241702] shadow-gold-glow',
        secondary: 'border border-brass text-gold bg-transparent',
        danger: 'bg-gradient-to-b from-[#8a2433] to-velvet-deep text-ivory',
        ghost: 'bg-transparent text-ivory/85 hover:text-ivory',
      },
      size: { sm: 'text-[10px] px-3.5 py-2', md: 'text-xs px-5 py-2.5', lg: 'text-sm px-6 py-3.5' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, loading = false, disabled, children, ...rest },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      className={cn(button({ variant, size }), className)}
      disabled={asChild ? undefined : disabled || loading}
      {...rest}
    >
      {loading && <Spinner size={14} />}
      {children}
    </Comp>
  );
});
```

- [ ] **Step 4: Story** `Button.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Deal' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'danger', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type S = StoryObj<typeof Button>;
export const Primary: S = {};
export const Secondary: S = { args: { variant: 'secondary', children: 'Cash Out' } };
export const Danger: S = { args: { variant: 'danger', children: 'Fold' } };
export const Ghost: S = { args: { variant: 'ghost', children: 'Cancel' } };
export const Loading: S = { args: { loading: true, children: 'Dealing…' } };
export const Disabled: S = { args: { disabled: true, children: 'Disabled' } };
```

- [ ] **Step 5: Run — expect PASS.** Commit:

```bash
git add src/components/ui/Button.tsx src/components/ui/Button.test.tsx src/components/ui/Button.stories.tsx
git commit -m "feat(ui): Button (cva exemplar — variants/sizes/loading/asChild)"
```

### Task A.6: Spinner (mask-reveal loader)

**Files:** Create `src/components/ui/Spinner.tsx`, `Spinner.test.tsx`, `Spinner.stories.tsx`

- [ ] **Step 1: Failing test** — renders an svg labelled "Loading"; carries `motion-reduce:animate-none`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('renders an accessible loading mask', () => {
    const { getByRole } = render(<Spinner />);
    expect(getByRole('img', { name: /loading/i })).toBeInTheDocument();
  });
  it('disables animation under reduced motion', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('[class*="motion-reduce:animate-none"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** `Spinner.tsx` (reuses the #0 `MaskMark`; CSS spin, reduced-motion aware):

```tsx
import type { JSX } from 'react';
import MaskMark from '@/components/brand/MaskMark';

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 28, className }: SpinnerProps): JSX.Element {
  return (
    <span
      role="img"
      aria-label="Loading"
      className={`inline-block animate-spin motion-reduce:animate-none ${className ?? ''}`}
    >
      <MaskMark size={size} variant="simple" title="Loading" />
    </span>
  );
}
```

- [ ] **Step 4: Story + Step 5: Run PASS + commit** `feat(ui): Spinner (mask-reveal loader)`. (Story renders sizes 16/28/48.)

> Note: `Button` imports `Spinner`; implement Spinner (A.6) before/with Button (A.5) so the import resolves — within one branch, commit order is flexible but both must exist before `pnpm build`.

### Task A.7: Card + Panel (deco frame)

**Files:** Create `src/components/ui/Card.tsx`, `Card.test.tsx`, `Card.stories.tsx`

- [ ] **Implement** `Card` and `Panel` (Panel = Card with the double-rule deco frame). cva `variant: 'plain' | 'deco'`, `surface: 'felt' | 'velvet'`. The `deco` variant adds the inset gold hairline via a `before:` pseudo (`relative before:absolute before:inset-1.5 before:rounded-lg before:border before:border-brass/40 before:pointer-events-none`), outer `border border-brass rounded-xl`, background `bg-gradient-to-b from-felt-table/50 to-surface/60`. Export `Card`, `CardHeader` (Cinzel title), `CardBody`, `CardFooter`. Test: renders children; `deco` variant includes the `before:` frame class; header uses `font-display`. Story: plain + deco, both surfaces, with header/body/footer. Commit `feat(ui): Card + Panel (deco frame)`.

### Task A.8: Badge / Tag

**Files:** Create `src/components/ui/Badge.tsx`, `Badge.test.tsx`, `Badge.stories.tsx`

- [ ] **Implement** `Badge` with cva `tone: 'win' | 'loss' | 'neutral' | 'info'` → win `bg-gold/15 text-gold border-gold`, loss `bg-loss/30 text-[#e3a8af] border-[#8a2433]`, neutral `bg-brass/12 text-brass border-brass`. Pill (`rounded-full`), uppercase 10px Montserrat 600, optional leading `Icon`. Test: each tone applies its classes; renders label. Story: all tones. Commit `feat(ui): Badge/Tag`.

### Task A.9: Chip

**Files:** Create `src/components/ui/Chip.tsx`, `Chip.test.tsx`, `Chip.stories.tsx`

- [ ] **Implement** `Chip` — circular, dashed gold edge (`rounded-full border-4 border-dashed border-gold`), cva `surface: 'felt' | 'velvet' | 'emerald'`. Props: `value?: number` (renders the number in Cinzel) OR `emblem?: boolean` (renders `<MaskMark variant="simple">`); exactly one. `size` sm/md/lg. Test: renders the value; with `emblem` renders the mask svg; surface class applied. Story: denominations + emblem chip across surfaces. Commit `feat(ui): Chip`.

### Task A.10: Divider, Text/Heading, barrel + DoD + PR

**Files:** Create `src/components/ui/Divider.tsx`, `Text.tsx` (+ tests/stories), `src/components/ui/index.ts`

- [ ] **Step 1:** `Divider` — a hairline (`border-t border-brass/30`) with an optional centered diamond ornament (`◆`) prop `ornament?: boolean`. `Text`/`Heading` — typographic helpers: `Heading` (cva `level: 1|2|3` → font-display sizes), `Text` (cva `tone: 'default'|'muted'|'gold'`, `size`). Tests: render + class assertions. Stories.
- [ ] **Step 2:** `src/components/ui/index.ts` barrel:

```typescript
export { cn } from './cn';
export { Icon, type IconName } from './Icon';
export { Button, type ButtonProps } from './Button';
export { Spinner } from './Spinner';
export { Card, CardHeader, CardBody, CardFooter, Panel } from './Card';
export { Badge } from './Badge';
export { Chip } from './Chip';
export { Divider } from './Divider';
export { Heading, Text } from './Text';
```

- [ ] **Step 3: DoD** `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build`. Also `pnpm build-storybook` once to confirm stories compile.
- [ ] **Step 4: commit + push + PR**

```bash
git add src/components/ui/
git commit -m "feat(ui): Divider, Text/Heading + ui barrel export"
git push -u origin phase-15-1-pr-a
gh pr create --title "phase-15(#1) PR A: design-system foundations (stack, Storybook, core primitives)" --body "PR A of #1. Adds Radix-slot/lucide/cva/clsx/tailwind-merge + cn(); Storybook (a11y addon); ADR-0043; and Icon, Button (cva exemplar), Spinner (mask loader), Card/Panel (deco frame), Badge, Chip, Divider, Text/Heading — each with stories + tests + barrel export. Additive; no screens migrated."
```

---

## PR B — Forms

**Branch:** `phase-15-1-pr-b` (off main after PR A merges). Every component follows the **PR A patterns** (cva + `cn()` + `forwardRef` + colocated `*.stories.tsx` + `*.test.tsx`), and each is added to `src/components/ui/index.ts`. Radix parts are styled in Velvet Deco per the locked visual language (gold focus ring, brass borders, oxblood error).

### Task B.1: Install Radix form deps

- [ ] Branch, then:

```bash
git checkout main && git pull origin main && git checkout -b phase-15-1-pr-b
pnpm add @radix-ui/react-select @radix-ui/react-switch @radix-ui/react-slider @radix-ui/react-checkbox @radix-ui/react-radio-group @radix-ui/react-label
git add package.json pnpm-lock.yaml && git commit -m "feat(ui): add Radix form primitive deps"
```

### Task B.2: Field (the form wrapper) — full code

**Files:** Create `src/components/ui/Field.tsx`, `Field.test.tsx`, `Field.stories.tsx`

- [ ] **Step 1: Failing test** — renders label, associates it with the control via `htmlFor`/`id`, shows helper text, and switches helper to error styling + `role="alert"` when `error` is set:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Field } from './Field';

describe('Field', () => {
  it('labels the control and shows helper text', () => {
    const { getByLabelText, getByText } = render(
      <Field id="amt" label="Amount" helper="Max 2,500">
        <input id="amt" />
      </Field>,
    );
    expect(getByLabelText('Amount')).toBeInTheDocument();
    expect(getByText('Max 2,500')).toBeInTheDocument();
  });
  it('shows the error with role=alert when invalid', () => {
    const { getByRole } = render(
      <Field id="amt" label="Amount" error="Too high">
        <input id="amt" />
      </Field>,
    );
    expect(getByRole('alert')).toHaveTextContent('Too high');
  });
});
```

- [ ] **Step 2: Run — FAIL. Step 3: Implement** `Field.tsx`:

```tsx
import type { JSX, ReactNode } from 'react';

interface FieldProps {
  id: string;
  label: string;
  helper?: string;
  error?: string;
  children: ReactNode; // the control, with matching id
}

export function Field({ id, label, helper, error, children }: FieldProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[10px] uppercase tracking-[0.15em] text-ivory/70 font-body"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[11px] text-[#e3a8af]">
          {error}
        </p>
      ) : helper ? (
        <p className="text-[11px] text-ivory/50">{helper}</p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run PASS. Story** (label + helper, and the error state). Commit `feat(ui): Field form wrapper`.

### Task B.3: Input + Textarea

- [ ] `Input` (forwardRef `<input>`) + `Textarea` (forwardRef `<textarea>`): base `w-full bg-base border border-brass rounded-lg px-3 py-2.5 text-ivory font-body outline-none focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-gold/30`; cva `state: 'default' | 'error'` (error → `border-[#a3243a]`). `className` via `cn()`. Tests: renders, forwards ref, error state class, typing updates value. Stories: default + focus + error. Add to barrel. Commit `feat(ui): Input + Textarea`.

### Task B.4: Select (Radix)

- [ ] Wrap `@radix-ui/react-select` into `Select` with `Select.Trigger/Content/Item` styled (trigger like Input + a chevron `Icon name="chevron-down"`; content = deco panel; item highlighted gold on focus). Controlled + uncontrolled via Radix `value`/`defaultValue`. Test: opens on click, selects an item (updates displayed value), keyboard arrow navigation selects. Story: a tier picker (Low/Mid/High). Barrel. Commit `feat(ui): Select`.

### Task B.5: Switch + Checkbox + RadioGroup

- [ ] `Switch` (radix-switch — track `bg-base` → `data-[state=checked]:bg-gold`, thumb porcelain), `Checkbox` (radix-checkbox — brass box, gold check `Icon name="check"`), `RadioGroup` + `RadioGroupItem` (radix-radio-group — brass ring, gold dot). Each: forwardRef, `cn()`, focus-visible gold ring. Tests: toggles `data-state`/`checked`, keyboard space toggles, radio arrow-key moves selection. Stories. Barrel. Commit `feat(ui): Switch + Checkbox + RadioGroup`.

### Task B.6: Slider (Radix)

- [ ] `Slider` (radix-slider — track `bg-base` with `bg-gold` range, thumb = gold circle with focus ring) used by bet controls. Props pass through Radix (`min`/`max`/`step`/`value`/`onValueChange`). Test: renders with `role="slider"`, `aria-valuenow` reflects value, arrow keys change value. Story: a bet slider 10–2500. Barrel.
- [ ] **DoD + PR B**: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build` (+ `pnpm build-storybook`). Commit, push `phase-15-1-pr-b`, open PR titled `phase-15(#1) PR B: form primitives` (body lists Field/Input/Textarea/Select/Switch/Checkbox/RadioGroup/Slider).

---

## PR C — Overlays & feedback

**Branch:** `phase-15-1-pr-c` (off main after PR B merges). Same patterns; Radix behavior primitives styled Velvet Deco; reduced-motion honored on all enter/exit.

### Task C.1: Install Radix overlay deps

- [ ] Branch, then:

```bash
git checkout main && git pull origin main && git checkout -b phase-15-1-pr-c
pnpm add @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-dropdown-menu @radix-ui/react-toast
git add package.json pnpm-lock.yaml && git commit -m "feat(ui): add Radix overlay primitive deps"
```

### Task C.2: Modal/Dialog (Radix) + Drawer

**Files:** Create `src/components/ui/Modal.tsx`, `Modal.test.tsx`, `Modal.stories.tsx`

- [ ] **Step 1: Failing test** — opens via trigger, renders title, closes on Escape and on the close button; focus is trapped (Radix), scrim present:

```tsx
import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('opens from trigger and closes on Escape', () => {
    render(
      <Modal trigger={<button>Open</button>} title="Leave table?">
        <p>Cash out 1,840.</p>
      </Modal>,
    );
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByRole('dialog', { name: 'Leave table?' })).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: FAIL. Step 3: Implement** `Modal.tsx` wrapping `@radix-ui/react-dialog`: `Overlay` = `fixed inset-0 bg-black/55 backdrop-blur-sm motion-safe:animate-[fadeIn_150ms]`; `Content` = centered deco panel (`Card`-style double-rule frame, `bg-surface`, max-w, `motion-safe:animate-[scaleIn_180ms] motion-reduce:animate-none`); `Title` in `font-display text-gold`; a close `Icon name="x"` button (`aria-label="Close"`); `Description` optional. Props: `trigger`, `title`, `description?`, `children`, `open?`/`onOpenChange?` (controlled passthrough). Define the `fadeIn`/`scaleIn` keyframes in `index.css` (or Tailwind `keyframes` extend — add to tailwind.config `extend.keyframes` + `animation`). Export a `Drawer` variant (same Radix Dialog, Content slides from the right: `fixed right-0 inset-y-0 w-[360px]`). Story: a "Leave table?" dialog + a settings Drawer. Barrel. Commit `feat(ui): Modal/Dialog + Drawer`.

### Task C.3: Tabs (Radix)

- [ ] `Tabs` wrapping `@radix-ui/react-tabs`: `Tabs.List` (bottom brass hairline), `Tabs.Trigger` (Cinzel, `data-[state=active]:text-gold data-[state=active]:border-b-2 data-[state=active]:border-gold`), `Tabs.Content`. Controlled/uncontrolled. Test: renders triggers, clicking switches content, arrow keys move active tab. Story: Overview/Blackjack/Poker. Barrel. Commit `feat(ui): Tabs`.

### Task C.4: Tooltip + DropdownMenu (Radix)

- [ ] `Tooltip` (radix-tooltip — deco mini-panel, `motion-reduce` instant, requires a `TooltipProvider` exported too) and `DropdownMenu` (radix-dropdown-menu — `Trigger`/`Content`/`Item`/`Separator`, gold-on-focus items, deco content panel). Tests: tooltip shows on focus/hover + `role="tooltip"`; menu opens, item click fires, keyboard navigation. Stories. Barrel. Commit `feat(ui): Tooltip + DropdownMenu`.

### Task C.5: Toast (Radix) + provider/hook

**Files:** Create `src/components/ui/Toast.tsx`, `Toast.test.tsx`, `Toast.stories.tsx`

- [ ] Wrap `@radix-ui/react-toast`: export `ToastProvider` (renders Radix `Provider` + `Viewport` fixed bottom-right) and a `useToast()` hook returning `toast({ title, description?, tone? })` that pushes onto a context-held queue; each toast renders the locked visual (surface card, gold left-accent bar, `MaskMark` icon, `Close`), `tone: 'info' | 'win' | 'loss'`. Radix gives `aria-live`/auto-dismiss (`duration` default 4000ms). Test: calling `toast()` renders a toast with the message and `role="status"`/live region; auto-dismiss timer set. Story: buttons firing info/win/loss toasts. Barrel. Commit `feat(ui): Toast + useToast`.

### Task C.6: EmptyState + Skeleton

- [ ] `EmptyState` — centered `MaskMark` (muted) + `Heading` + `Text` + optional action `Button`; props `title`, `description?`, `action?`. `Skeleton` — `animate-pulse motion-reduce:animate-none bg-ivory/10 rounded` shimmer block, props `className`/`width`/`height`. Tests: EmptyState renders title + optional action; Skeleton carries `motion-reduce:animate-none`. Stories. Barrel.
- [ ] **DoD + PR C**: full DoD + `pnpm build-storybook`. Push `phase-15-1-pr-c`, open PR `phase-15(#1) PR C: overlays & feedback primitives` (body lists Modal/Drawer/Tabs/Tooltip/DropdownMenu/Toast/EmptyState/Skeleton). This completes sub-project #1.

---

## Self-review

- **Spec coverage:** stack (§2 → A.1/A.2/A.3) · file structure + barrel (§3 → A.10/B/C) · API conventions cva/cn/forwardRef/asChild/tokens/a11y/motion (§4 → A.5 exemplar + applied throughout) · visual language (§5 → each component's styling references the locked gallery) · inventory + 3-PR split (§6 → PR A/B/C tasks map 1:1 to the inventory) · testing incl. overlay behavior + a11y addon (§7 → per-component test checklists + Storybook a11y) · invariants/out-of-scope (§8/§9 → additive, no screen migration, no game logic). ✓
- **Placeholder scan:** PR A pattern-setting pieces (`cn`, `Icon`, `Button`, `Spinner`, `Field`, `Modal`, `Toast`) have full code; the mechanical Radix-wrapper components are specified by exact Radix part + cva variants + props + test checklist + story coverage — implementable without ambiguity given the A exemplars. No "TBD"/"handle edge cases".
- **Type/name consistency:** `cn` (A.1) used everywhere; `Button` imports `Spinner` (A.6 note ensures order); `Icon name=` keyed to lucide `icons`; barrel exports match component/export names across A/B/C; cva `variant`/`size`/`tone`/`state`/`surface` prop names consistent. ✓
- **Build coherence:** `index.css` keyframes (`fadeIn`/`scaleIn`) + tailwind `keyframes`/`animation` extend are added in C.2 before Modal uses them; Storybook stories typecheck (devDeps installed A.3); `build-storybook` run at each PR's DoD.
- **Offline/CI:** all deps bundle at build or are dev-only; Storybook is not a CI gate (the four DoD commands are). ✓
