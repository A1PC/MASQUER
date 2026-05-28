# Phase 15 #0 — Brand & Design Language (MASQUER) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the MASQUER brand foundation — Velvet Deco design tokens, the four brand fonts, the reusable Colombina `MaskMark` SVG component, the wordmark lockup in the shell, a favicon, and a brand doc — without breaking any existing screen.

**Architecture:** Single PR (`phase-15-0-brand`). All changes are **additive or value-level**: new semantic colour tokens are _added_ alongside the existing tailwind keys (`felt/gold/casino/neon/chip/roulette`), which remain so the ~143 current components keep rendering until their own sub-projects rebuild them. The global display/body fonts are swapped to the brand fonts (Cinzel/Montserrat) — a deliberate, low-risk type shift (the old Bungee/Anton/Inter families were referenced but never actually loaded). `tokens.ts` becomes the single source of truth and `tailwind.config.ts` imports from it.

**Tech Stack:** TypeScript 5 (strict, exactOptionalPropertyTypes), React 18, Vite 5, Tailwind 3, Vitest 2 + RTL, Google Fonts.

**Spec:** `docs/superpowers/specs/2026-05-22-phase-15-0-brand-design-language-design.md`.

**Branch:** `phase-15-0-brand` (off latest main). One PR. DoD before opening: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build`.

---

## File map

- **Create** `src/components/brand/MaskMark.tsx` — Colombina mask SVG component (`full`/`simple` variants, `size` prop).
- **Create** `src/components/brand/MaskMark.test.tsx` — render tests.
- **Create** `src/components/brand/Wordmark.tsx` — MASQUER lockup (mask + Cinzel Decorative wordmark).
- **Create** `src/components/brand/Wordmark.test.tsx` — render test.
- **Create** `src/theme/tokens.test.ts` — token guard test.
- **Create** `public/favicon.svg` — simple-variant mask favicon.
- **Create** `docs/brand/MASQUER.md` — living brand reference.
- **Modify** `src/theme/tokens.ts` — full Velvet Deco token set (source of truth).
- **Modify** `tailwind.config.ts` — import tokens; ADD new colour keys + `numeral` font; swap `display`/`body` families; ADD radius/shadow. Keep all existing keys.
- **Modify** `src/index.css` — `@import` the four fonts; body → ivory text.
- **Modify** `index.html` — title MASQUER, favicon link, font preconnect, meta description.
- **Modify** `src/components/TopBar.tsx` — replace the `LOCALGAMBLE` text with `<Wordmark>`.
- **Modify** `src/components/TopBar` test if one asserts the old text (check `AppLayout.test.tsx`).

---

## Task 1: Brand fonts + index.html

**Files:** Modify `src/index.css`, `index.html`

- [ ] **Step 1: Add the font `@import` + body color to `src/index.css`** — replace the whole file with:

```css
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cinzel+Decorative:wght@700&family=Montserrat:wght@300;400;500;600;700&family=Poiret+One&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html,
  body,
  #root {
    height: 100%;
  }
  body {
    @apply bg-felt-deep text-ivory font-body antialiased;
  }
  h1,
  h2,
  h3 {
    @apply font-display tracking-wide;
  }
}
```

(`text-ivory` resolves once Task 3 adds the `ivory` colour key. Order tasks so Task 3 lands before the build at Task 8; within a single branch this is fine.)

- [ ] **Step 2: Update `index.html`** — replace its contents with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="MASQUER — a local, offline, play-money casino." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <title>MASQUER</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add src/index.css index.html
git commit -m "feat(theme): load MASQUER brand fonts + set page title/favicon link"
```

---

## Task 2: Velvet Deco tokens (source of truth)

**Files:** Modify `src/theme/tokens.ts`, Create `src/theme/tokens.test.ts`

- [ ] **Step 1: Write the failing test** `src/theme/tokens.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { colors, fonts, radius } from './tokens';

describe('Velvet Deco tokens', () => {
  it('exposes the core brand colours', () => {
    expect(colors.gold).toBe('#e6c068');
    expect(colors.velvet).toBe('#5a1320');
    expect(colors.ivory).toBe('#f2e7cc');
    expect(colors.porcelain).toBe('#ffffff');
  });
  it('win state is gold (winning glows gold)', () => {
    expect(colors.win).toBe(colors.gold);
  });
  it('body font is Montserrat, display leads with Cinzel Decorative', () => {
    expect(fonts.body[0]).toContain('Montserrat');
    expect(fonts.display[0]).toContain('Cinzel Decorative');
  });
  it('radius scale defined', () => {
    expect(radius.md).toBe('12px');
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`colors`/`fonts`/`radius` not exported):

```bash
pnpm exec vitest run src/theme/tokens.test.ts
```

- [ ] **Step 3: Rewrite `src/theme/tokens.ts`** with the Velvet Deco source of truth (keeps a `tokens` export for back-compat, adds the flat maps tailwind consumes):

```typescript
/** MASQUER — Velvet Deco design tokens (source of truth; tailwind.config imports these). */

export const colors = {
  'bg-base': '#07100b',
  'bg-surface': '#0c1711',
  'felt-table': '#123a2a',
  'felt-table-deep': '#0e2e21',
  velvet: '#5a1320',
  'velvet-deep': '#3d0d16',
  brass: '#c79a4b',
  gold: '#e6c068',
  'gold-deep': '#b8893a',
  ivory: '#f2e7cc',
  porcelain: '#ffffff',
  'jewel-ruby': '#7a1422',
  'jewel-emerald': '#1f6b4a',
  win: '#e6c068',
  loss: '#7a1f2b',
  push: '#8a7a55',
} as const;

export const fonts = {
  display: ['"Cinzel Decorative"', '"Cinzel"', 'serif'],
  heading: ['"Cinzel"', 'serif'],
  body: ['"Montserrat"', 'system-ui', 'sans-serif'],
  numeral: ['"Poiret One"', 'system-ui', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
} as const;

export const radius = { sm: '8px', md: '12px', lg: '16px' } as const;

export const shadow = {
  'gold-glow': '0 0 18px rgba(230,192,104,0.45)',
  'velvet-panel': 'inset 0 0 24px rgba(0,0,0,0.4)',
  'deco-frame': '0 0 0 1px rgba(199,154,75,0.4), inset 0 0 0 4px rgba(7,16,11,0.6)',
} as const;

export type BrandColors = typeof colors;
```

(The previous `tokens` / `ThemeTokens` exports are removed — confirmed unused by a repo-wide grep.)

- [ ] **Step 4: Run — expect PASS**

```bash
pnpm exec vitest run src/theme/tokens.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/theme/tokens.ts src/theme/tokens.test.ts
git commit -m "feat(theme): Velvet Deco design tokens (source of truth)"
```

---

## Task 3: Tailwind — import tokens, add brand keys, swap fonts (non-breaking)

**Files:** Modify `tailwind.config.ts`

**Rule:** ADD new colour keys; KEEP every existing key (`felt`, `casino`, `neon`, `chip`, `roulette`) so current components keep rendering. Update `gold` values to the brand gold (a low-risk hue nudge applied globally) and swap `display`/`body` font families to the brand fonts.

- [ ] **Step 1: Replace `tailwind.config.ts` with:**

```typescript
import type { Config } from 'tailwindcss';
import { colors as t, fonts, shadow } from './src/theme/tokens';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── existing keys (KEEP — used by current screens until their rebuilds) ──
        felt: { DEFAULT: '#0b1f17', deep: '#06120c' },
        casino: { red: '#a3122a', 'red-deep': '#6e0a1d' },
        neon: { cyan: '#3df0ff', magenta: '#ff5cf2' },
        chip: { win: '#3dd17a', loss: '#7a1f2b', push: '#7a7a7a' },
        roulette: {
          wood: '#6b4423',
          'wood-light': '#8b5a3c',
          'wood-dark': '#4a2d18',
          pocket: '#1a1a1a',
          'pocket-red': '#a3122a',
          'pocket-green': '#3dd17a',
          silver: '#c0c0c0',
          'silver-light': '#f4f4f4',
          'silver-dark': '#707070',
          pearl: '#fff5e8',
          'pearl-cream': '#f0e0c8',
          'felt-table': '#0a3a22',
        },
        // ── MASQUER Velvet Deco brand keys (NEW) ──
        gold: { DEFAULT: t.gold, deep: t['gold-deep'], bright: '#f0c64a' },
        base: t['bg-base'],
        surface: t['bg-surface'],
        'felt-table': t['felt-table'],
        'felt-table-deep': t['felt-table-deep'],
        velvet: { DEFAULT: t.velvet, deep: t['velvet-deep'] },
        brass: t.brass,
        ivory: t.ivory,
        porcelain: t.porcelain,
        jewel: { ruby: t['jewel-ruby'], emerald: t['jewel-emerald'] },
        state: { win: t.win, loss: t.loss, push: t.push },
      },
      fontFamily: {
        display: [...fonts.display],
        heading: [...fonts.heading],
        body: [...fonts.body],
        numeral: [...fonts.numeral],
        mono: [...fonts.mono],
      },
      boxShadow: {
        // existing neon/gold/roulette shadows kept for current screens
        'neon-cyan': '0 0 12px rgba(61,240,255,0.6)',
        'neon-magenta': '0 0 12px rgba(255,92,242,0.6)',
        'gold-glow': shadow['gold-glow'],
        'velvet-panel': shadow['velvet-panel'],
        'deco-frame': shadow['deco-frame'],
        'roulette-wheel':
          '0 0 24px rgba(212,175,55,0.6), 0 0 48px rgba(212,175,55,0.35), 0 0 72px rgba(212,175,55,0.15), 0 8px 32px rgba(0,0,0,0.7)',
        'roulette-pulse-red': '0 0 16px 4px rgba(163,18,42,0.85)',
        'roulette-pulse-black': '0 0 16px 4px rgba(255,255,255,0.4)',
        'roulette-pulse-green': '0 0 16px 4px rgba(61,209,122,0.85)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

Note: brand radius (8/12/16px) already maps to Tailwind's `rounded-lg`/`rounded-xl`/`rounded-2xl` — no new radius keys needed.

- [ ] **Step 2: Verify typecheck + build (no unit test for tailwind config)**

```bash
pnpm typecheck && pnpm build
```

Expected: PASS (the `gold-glow`/`velvet-panel`/`deco-frame` import resolves; `text-ivory` from Task 1 now valid).

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(theme): wire Velvet Deco tokens into tailwind (additive + font swap)"
```

---

## Task 4: MaskMark component (the Colombina emblem)

**Files:** Create `src/components/brand/MaskMark.tsx`, `src/components/brand/MaskMark.test.tsx`

- [ ] **Step 1: Write the failing test** `src/components/brand/MaskMark.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import MaskMark from './MaskMark';

describe('MaskMark', () => {
  it('renders an accessible svg sized by `size`', () => {
    const { getByRole } = render(<MaskMark size={120} />);
    const svg = getByRole('img', { name: /masquer/i });
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('width')).toBe('120');
  });
  it('full variant includes filigree detail; simple variant omits it', () => {
    const full = render(<MaskMark variant="full" />);
    const simple = render(<MaskMark variant="simple" />);
    expect(full.container.querySelectorAll('[data-detail="filigree"]').length).toBeGreaterThan(0);
    expect(simple.container.querySelectorAll('[data-detail="filigree"]').length).toBe(0);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (module not found):

```bash
pnpm exec vitest run src/components/brand/MaskMark.test.tsx
```

- [ ] **Step 3: Create `src/components/brand/MaskMark.tsx`:**

```tsx
import { useId } from 'react';
import type { JSX } from 'react';

export type MaskVariant = 'full' | 'simple';

interface MaskMarkProps {
  size?: number;
  variant?: MaskVariant;
  className?: string;
  title?: string;
}

/** MASQUER Colombina half-mask — porcelain white + gold. `full` = all filigree;
 *  `simple` = silhouette + inner rule + eyes + crest only (favicon / tiny renders). */
export default function MaskMark({
  size = 64,
  variant = 'full',
  className,
  title = 'MASQUER mask',
}: MaskMarkProps): JSX.Element {
  const gid = useId();
  const grad = `porc-${gid}`;
  const width = size;
  const height = Math.round((size * 180) / 240); // viewBox 240 × 180

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 -34 240 180"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f6efde" />
          <stop offset="100%" stopColor="#e2d4b6" />
        </linearGradient>
      </defs>

      {/* top crest flourish — present in both variants */}
      <g stroke="#c79a4b" strokeWidth={2.4} fill="none" strokeLinecap="round">
        <path d="M120,30 C112,8 98,2 96,-14 C108,-6 116,-2 120,8 C124,-2 132,-6 144,-14 C142,2 128,8 120,30" />
      </g>

      {variant === 'full' && (
        <g data-detail="filigree">
          {/* temple flourishes */}
          <g stroke="#c79a4b" strokeWidth={2.2} fill="none" strokeLinecap="round">
            <path d="M30,66 C12,52 8,32 16,16 C18,34 30,46 44,54" />
            <path d="M210,66 C228,52 232,32 224,16 C222,34 210,46 196,54" />
          </g>
        </g>
      )}

      {/* half-mask silhouette */}
      <path
        d="M26,72 C34,42 70,30 104,34 C112,35 116,44 120,46
           C124,44 128,35 136,34 C170,30 206,42 214,72
           C210,84 196,96 176,98 C160,100 150,92 142,84
           C134,78 126,80 120,86 C114,80 106,78 98,84
           C90,92 80,100 64,98 C44,96 30,84 26,72 Z"
        fill={`url(#${grad})`}
        stroke="#c79a4b"
        strokeWidth={4}
      />
      {/* inner gold rule */}
      <path
        d="M36,72 C44,50 74,40 104,43 C112,44 116,51 120,53
           C124,51 128,44 136,43 C166,40 196,50 204,72
           C200,82 188,90 174,91 C160,93 151,86 144,79
           C135,73 127,75 120,80 C113,75 105,73 96,79
           C89,86 80,93 66,91 C50,89 40,82 36,72 Z"
        fill="none"
        stroke="#e6c068"
        strokeWidth={1.3}
        opacity={0.7}
      />

      {variant === 'full' && (
        <g data-detail="filigree" fill="#fff7df">
          <circle cx="78" cy="38" r="2" />
          <circle cx="162" cy="38" r="2" />
          <circle cx="48" cy="58" r="1.8" />
          <circle cx="192" cy="58" r="1.8" />
        </g>
      )}

      {/* eyes + rims — present in both variants */}
      <g>
        <ellipse
          cx="86"
          cy="64"
          rx="21"
          ry="11.5"
          transform="rotate(-8 86 64)"
          fill="#0c1711"
          stroke="#c79a4b"
          strokeWidth={2.8}
        />
        <ellipse
          cx="154"
          cy="64"
          rx="21"
          ry="11.5"
          transform="rotate(8 154 64)"
          fill="#0c1711"
          stroke="#c79a4b"
          strokeWidth={2.8}
        />
      </g>

      {variant === 'full' && (
        <g data-detail="filigree">
          {/* eye liner + lower lash */}
          <path d="M62,58 q22,-12 46,-3" stroke="#e6c068" strokeWidth={2.2} fill="none" />
          <path d="M178,58 q-22,-12 -46,-3" stroke="#e6c068" strokeWidth={2.2} fill="none" />
          <path
            d="M70,78 q16,9 32,2"
            stroke="#e6c068"
            strokeWidth={1.7}
            fill="none"
            opacity={0.8}
          />
          <path
            d="M170,78 q-16,9 -32,2"
            stroke="#e6c068"
            strokeWidth={1.7}
            fill="none"
            opacity={0.8}
          />
          {/* nose-bridge diamond */}
          <path d="M120,52 l5,6 l-5,6 l-5,-6 Z" fill="#e6c068" stroke="#a8791f" strokeWidth={1} />
          {/* cheek scrollwork */}
          <g stroke="#c79a4b" strokeWidth={2.1} fill="none" strokeLinecap="round" opacity={0.85}>
            <path d="M52,86 q8,12 2,22 q-9,-5 -8,-15" />
            <path d="M188,86 q-8,12 -2,22 q9,-5 8,-15" />
          </g>
        </g>
      )}
    </svg>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
pnpm exec vitest run src/components/brand/MaskMark.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/brand/MaskMark.tsx src/components/brand/MaskMark.test.tsx
git commit -m "feat(theme): add MaskMark Colombina emblem component (full/simple)"
```

---

## Task 5: Wordmark lockup

**Files:** Create `src/components/brand/Wordmark.tsx`, `src/components/brand/Wordmark.test.tsx`

- [ ] **Step 1: Write the failing test** `src/components/brand/Wordmark.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Wordmark from './Wordmark';

describe('Wordmark', () => {
  it('renders the MASQUER name and the mask emblem', () => {
    const { getByText, getByRole } = render(<Wordmark />);
    expect(getByText('MASQUER')).toBeInTheDocument();
    expect(getByRole('img', { name: /masquer/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

```bash
pnpm exec vitest run src/components/brand/Wordmark.test.tsx
```

- [ ] **Step 3: Create `src/components/brand/Wordmark.tsx`:**

```tsx
import type { JSX } from 'react';
import MaskMark from './MaskMark';

interface WordmarkProps {
  /** mask emblem pixel size; the word scales alongside */
  maskSize?: number;
  className?: string;
}

export default function Wordmark({ maskSize = 28, className }: WordmarkProps): JSX.Element {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <MaskMark size={maskSize} variant="simple" />
      <span
        className="font-display tracking-[0.18em] text-gold"
        style={{ fontSize: maskSize * 0.62 }}
      >
        MASQUER
      </span>
    </span>
  );
}
```

- [ ] **Step 4: Run — expect PASS.**

```bash
pnpm exec vitest run src/components/brand/Wordmark.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/brand/Wordmark.tsx src/components/brand/Wordmark.test.tsx
git commit -m "feat(theme): add MASQUER wordmark lockup"
```

---

## Task 6: Put the wordmark in the shell

**Files:** Modify `src/components/TopBar.tsx`; update any test asserting the old `LOCALGAMBLE` text.

- [ ] **Step 1: Find tests asserting the old wordmark**

```bash
grep -rn "LOCALGAMBLE\|MASQUER" src/components/*.test.tsx
```

If `src/components/AppLayout.test.tsx` (or another) asserts the TopBar text `LOCALGAMBLE`, update that assertion to `MASQUER` in Step 3.

- [ ] **Step 2: Replace the brand line in `src/components/TopBar.tsx`** — swap the `<span>…LOCALGAMBLE</span>` for the lockup:

```tsx
import type { JSX } from 'react';
import SidebarToggle from './SidebarToggle';
import CreditsDropdown from './CreditsDropdown';
import ProfileDropdown from './ProfileDropdown';
import Wordmark from './brand/Wordmark';

export default function TopBar(): JSX.Element {
  return (
    <header className="flex items-center justify-between border-b border-gold/30 bg-felt-deep px-5 py-3.5">
      <div className="flex items-center gap-3.5">
        <SidebarToggle />
        <Wordmark maskSize={26} />
      </div>
      <div className="flex items-center gap-3.5 text-sm">
        <CreditsDropdown />
        <ProfileDropdown />
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Update the failing shell test** (from Step 1) to assert `getByText('MASQUER')` instead of `LOCALGAMBLE`, then run:

```bash
pnpm exec vitest run src/components/AppLayout.test.tsx
```

Expected: PASS. (If the match was in a different file, run that file instead.)

- [ ] **Step 4: Commit**

```bash
git add src/components/TopBar.tsx src/components/AppLayout.test.tsx
git commit -m "feat(shell): show MASQUER wordmark in the top bar"
```

---

## Task 7: Favicon

**Files:** Create `public/favicon.svg`

- [ ] **Step 1: Create `public/favicon.svg`** (simple-variant mask, square viewBox, porcelain + gold):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -56 240 240" width="32" height="32">
  <defs>
    <linearGradient id="p" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/><stop offset="55%" stop-color="#f6efde"/><stop offset="100%" stop-color="#e2d4b6"/>
    </linearGradient>
  </defs>
  <rect x="-8" y="-64" width="256" height="256" fill="#07100b"/>
  <g stroke="#c79a4b" stroke-width="2.4" fill="none" stroke-linecap="round">
    <path d="M120,30 C112,8 98,2 96,-14 C108,-6 116,-2 120,8 C124,-2 132,-6 144,-14 C142,2 128,8 120,30"/>
  </g>
  <path d="M26,72 C34,42 70,30 104,34 C112,35 116,44 120,46 C124,44 128,35 136,34 C170,30 206,42 214,72 C210,84 196,96 176,98 C160,100 150,92 142,84 C134,78 126,80 120,86 C114,80 106,78 98,84 C90,92 80,100 64,98 C44,96 30,84 26,72 Z" fill="url(#p)" stroke="#c79a4b" stroke-width="4"/>
  <ellipse cx="86" cy="64" rx="21" ry="11.5" transform="rotate(-8 86 64)" fill="#0c1711" stroke="#c79a4b" stroke-width="2.8"/>
  <ellipse cx="154" cy="64" rx="21" ry="11.5" transform="rotate(8 154 64)" fill="#0c1711" stroke="#c79a4b" stroke-width="2.8"/>
</svg>
```

- [ ] **Step 2: Verify it serves** — `index.html` already links `/favicon.svg` (Task 1). Confirm `pnpm build` copies `public/` (Vite default).

```bash
pnpm build && ls dist/favicon.svg
```

Expected: `dist/favicon.svg` exists.

- [ ] **Step 3: Commit**

```bash
git add public/favicon.svg
git commit -m "feat(theme): add MASQUER mask favicon"
```

---

## Task 8: Brand doc

**Files:** Create `docs/brand/MASQUER.md`

- [ ] **Step 1: Create `docs/brand/MASQUER.md`** capturing the living brand reference. Pull the palette table, type, emblem usage, and motion/sound principles from the spec (`docs/superpowers/specs/2026-05-22-phase-15-0-brand-design-language-design.md` §3–§8). Include: name + tagline, the colour token table (verbatim from spec §3 with win=gold), typography (§4), spacing/radius/effects (§5), the `MaskMark` emblem usage (§6), and the approved motion (§7) + sound (§8) principles. Keep headings sequential (markdownlint MD001) and avoid spaces inside inline code spans (MD038).

- [ ] **Step 2: Lint the doc**

```bash
npx markdownlint-cli2 docs/brand/MASQUER.md
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add docs/brand/MASQUER.md
git commit -m "docs(theme): add MASQUER brand reference"
```

---

## Task 9: Definition of Done + open PR

- [ ] **Step 1: Full DoD**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

All four must pass.

- [ ] **Step 2: Manual smoke (if a browser is available)** — `pnpm dev`, confirm: page title is MASQUER, favicon shows the mask, the top bar shows the mask + MASQUER wordmark in gold Cinzel, headings render in Cinzel and body in Montserrat, and existing screens still render (felt/gold styling intact). If headless, state so.

- [ ] **Step 3: Push + open the PR**

```bash
git push -u origin phase-15-0-brand
gh pr create --title "phase-15(#0): MASQUER brand foundation — tokens, fonts, mask emblem" --body "PR for Phase 15 sub-project #0. Velvet Deco tokens (source of truth) wired into tailwind (additive — existing keys kept), brand fonts loaded (Cinzel/Cinzel Decorative/Montserrat/Poiret One), MaskMark Colombina emblem (full/simple), MASQUER wordmark in the top bar, favicon, and the brand doc. No game logic touched; existing screens keep rendering until their own sub-projects. Per docs/superpowers/specs/2026-05-22-phase-15-0-brand-design-language-design.md."
```

---

## Self-review

- [ ] **Spec coverage:** tokens (§3 → Task 2/3) · type (§4 → Task 1/2/3) · spacing/radius/effects (§5 → Task 3 + tokens) · mask emblem (§6 → Task 4, favicon Task 7) · motion/sound principles (§7/§8 → documented in Task 8 brand doc; _code_ is #2, out of scope) · implementation scope §9 items 1-6 (tokens, tailwind, fonts, MaskMark, MASQUER-in-shell, brand doc → Tasks 1-8). ✓
- [ ] **Non-breaking:** existing tailwind keys (`felt/casino/neon/chip/roulette`) retained in Task 3; `tokens.ts` had no importers; only `gold` values + global fonts change (intended). ✓
- [ ] **Placeholder scan:** none — every code step has complete code; Task 8's doc step references exact spec sections to transcribe (acceptable for a doc).
- [ ] **Type consistency:** `MaskMark` props (`size`, `variant`, `className`, `title`), `MaskVariant`, `Wordmark` props (`maskSize`, `className`), token exports (`colors`, `fonts`, `radius`, `shadow`) consistent across Tasks 2-6. `data-detail="filigree"` used identically in component + test. ✓
- [ ] **Win=gold:** `colors.win === colors.gold` asserted in Task 2 test. ✓
