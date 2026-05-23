# Phase 15 #4 — Coin-flip Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the Coin-flip game on the design system + motion/sound; ship the locked **brand coin** (mask heads / Cinzel "M" tails) with a signature 3D flip; add a new **`coin.flip`** sound to the audio taxonomy; add a session-local **win-streak indicator**. Game logic (`playRound`, RNG, payouts, `rounds` row) stays exactly as-is.

**Architecture:** Single PR (`phase-15-4-coin-flip`). New `BrandCoin` component (`src/games/coin-flip/BrandCoin.tsx`) reusing `MaskMark` for heads and a Cinzel "M" glyph for tails, with an inline 3D flip animation (transform-only, `useEffectiveReducedMotion`-aware). `CoinFlipPage` rebuilt from #1 primitives + `useSound` + the new `BrandCoin`, with the existing `GameShell`/`BettingPanel` kept. The `coin.flip` sound is added additively to `src/systems/sound/ids.ts` + `engine.ts` registry + the committed `gen-audio.mjs` script + a regenerated `src/assets/audio/coin-flip.wav`.

**Tech Stack:** TypeScript 5 (strict, exactOptionalPropertyTypes), React 18, Vite 5, Tailwind 3, Framer Motion 12, Vitest 2 + RTL, pnpm 9.12, alias `@/* → src/*`. Reuses #0 `MaskMark`, #1 primitives (`Card`/`CardHeader`/`CardBody`/`Button`/`Badge`/`Icon`/`useToast`), #2 `useSound`/`useEffectiveReducedMotion`.

**Spec:** `docs/superpowers/specs/2026-05-23-phase-15-4-coin-flip-design.md`. Existing files: `src/games/coin-flip/{logic.ts,CoinFlipPage.tsx,CoinFlipPage.test.tsx,rules.tsx}`, `src/games/_shared/{GameShell,BettingPanel,useGameRound}`, `src/systems/sound/{ids.ts,engine.ts,useSound.ts}`, `scripts/gen-audio.mjs`, `src/components/brand/MaskMark.tsx`.

**Branch:** `phase-15-4-coin-flip` (off main). DoD: `pnpm gen-audio && pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`. Conventional commit scope `coin-flip` (in the enum) or `theme` for the sound additions.

---

## Task 1: Branch + extend the sound taxonomy

**Files:** Modify `src/systems/sound/ids.ts`, `src/systems/sound/engine.test.ts`, `src/systems/sound/useSound.test.ts`

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull origin main
git checkout -b phase-15-4-coin-flip
```

- [ ] **Step 2: Failing test** — extend `src/systems/sound/engine.test.ts` (or whatever asserts taxonomy coverage) to require `'coin.flip'`:

```typescript
import { SOUND_CATEGORY, type SoundId } from './ids';
it('includes coin.flip as a game-category sound', () => {
  const id: SoundId = 'coin.flip';
  expect(SOUND_CATEGORY[id]).toBe('game');
});
```

- [ ] **Step 3: Run — expect FAIL.** `pnpm exec vitest run src/systems/sound/engine.test.ts`
- [ ] **Step 4: Update `src/systems/sound/ids.ts`** — add `'coin.flip'` to the `SoundId` union (in the "Game (sample)" group) and `SOUND_CATEGORY['coin.flip'] = 'game'`:

```typescript
export type SoundId =
  | 'ui.click'
  | 'ui.toggle'
  | 'ui.hover'
  | 'ui.error'
  | 'coin.flip'
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
```

And add `'coin.flip': 'game',` inside the `SOUND_CATEGORY` map (alphabetical neighbour of `card.deal`/`chip.place`).

- [ ] **Step 5: Run — expect PASS.** Commit:

```bash
git add src/systems/sound/ids.ts src/systems/sound/engine.test.ts
git commit -m "feat(theme): add coin.flip to the sound taxonomy"
```

## Task 2: Synthesize the `coin-flip.wav` sample

**Files:** Modify `scripts/gen-audio.mjs`; produce `src/assets/audio/coin-flip.wav`

- [ ] **Step 1: Add a `coinFlip()` generator** in `scripts/gen-audio.mjs` next to the other generators (e.g. after `reelStop`):

```javascript
// Short metallic "flip" — two sine partials + tiny noise burst, ~0.32 s.
function coinFlip() {
  const buf = buffer(0.32);
  const rng = makeRng(0xc01f);
  add(buf, (t) => {
    const e = env(t, 0.32, 0.005);
    const tone = 0.55 * sine(t, 1180) + 0.35 * sine(t, 1760) + 0.18 * triangle(t, 590);
    const noise = (rng() - 0.5) * Math.max(0, 1 - t / 0.06) * 0.45;
    return e * (tone + noise);
  });
  return normalize(buf, 0.8);
}
```

- [ ] **Step 2: Register the new file** — add `'coin-flip.wav': coinFlip,` to the `FILES` map alongside the other entries.
- [ ] **Step 3: Run the generator + verify the WAV exists**

```bash
pnpm gen-audio
ls src/assets/audio/coin-flip.wav
```

Expected: `coin-flip.wav` written (mono 22.05 kHz, well under 20 KB).

- [ ] **Step 4: Commit** the script update + the new wav:

```bash
git add scripts/gen-audio.mjs src/assets/audio/coin-flip.wav
git commit -m "feat(theme): generate coin-flip.wav sample"
```

## Task 3: Wire the sample into the engine

**Files:** Modify `src/systems/sound/engine.ts`, `src/systems/sound/engine.test.ts`

- [ ] **Step 1:** Add the import + registry entry at the top of `engine.ts`:

```typescript
import coinFlip from '@/assets/audio/coin-flip.wav';
```

And add `'coin.flip': coinFlip,` to the sample-URL registry (the object/Map mapping non-synth `SoundId`s to URLs — match the existing pattern; line near the other `chip.place` / `card.deal` entries).

- [ ] **Step 2: Test** — extend `engine.test.ts` to assert the sample registry contains the new id (mirror an existing assertion):

```typescript
it('sample registry contains coin.flip', () => {
  // SAMPLE_URLS is the engine's exported (or internal-tested) registry map
  // — use whatever the existing tests already access. Assert that the
  // resolver returns a defined URL string for 'coin.flip'.
  expect(getSampleUrl('coin.flip')).toBeDefined();
});
```

(If the engine doesn't export a getter, use the same access pattern the existing `card.deal`/`chip.place` test uses — read it first.)

- [ ] **Step 3: Run all sound tests + commit**

```bash
pnpm exec vitest run src/systems/sound
git add src/systems/sound/engine.ts src/systems/sound/engine.test.ts
git commit -m "feat(theme): register coin.flip sample in the sound engine"
```

## Task 4: `BrandCoin` component

**Files:** Create `src/games/coin-flip/BrandCoin.tsx`, `BrandCoin.test.tsx`

- [ ] **Step 1: Failing test** `BrandCoin.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import BrandCoin from './BrandCoin';

vi.mock('@/motion/useEffectiveReducedMotion', () => ({ useEffectiveReducedMotion: () => false }));

describe('BrandCoin', () => {
  it('renders the mask emblem for heads', () => {
    const { getByRole } = render(<BrandCoin side="heads" />);
    expect(getByRole('img', { name: /masquer/i })).toBeInTheDocument();
  });
  it('renders the "M" monogram for tails', () => {
    const { getByText } = render(<BrandCoin side="tails" />);
    expect(getByText('M')).toBeInTheDocument();
  });
  it('exposes flipping state via data attribute', () => {
    const { container } = render(<BrandCoin side="heads" flipping />);
    expect(container.querySelector('[data-flipping="true"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** `BrandCoin.tsx`:

```tsx
import type { JSX } from 'react';
import { motion } from 'framer-motion';
import MaskMark from '@/components/brand/MaskMark';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import { cn } from '@/components/ui';

interface BrandCoinProps {
  side: 'heads' | 'tails';
  size?: number;
  flipping?: boolean;
  className?: string;
}

/** The MASQUER coin: porcelain mask for heads, Cinzel Decorative "M" for tails,
 *  on a gold-gradient disc with bevel + shadow. The flip animation is a 3D
 *  rotateY (transform-only, preserve-3d, backface-visibility hidden) so the
 *  face changes smoothly. Under reduced motion the face changes instantly. */
export default function BrandCoin({
  side,
  size = 160,
  flipping = false,
  className,
}: BrandCoinProps): JSX.Element {
  const reduce = useEffectiveReducedMotion();
  const spinning = flipping && !reduce;

  // Three full spins (1080deg) landing on the requested side.
  // tails sits on the back face (rotateY 180deg) so we offset by 180 when side===tails.
  const baseRotation = side === 'tails' ? 180 : 0;

  return (
    <div
      className={cn(
        'relative grid place-items-center rounded-full',
        'bg-[radial-gradient(circle_at_30%_30%,#fbe6a0,#d4af37_55%,#8a6620)]',
        'shadow-[0_0_28px_rgba(212,175,55,0.35),inset_0_4px_12px_rgba(255,255,255,0.35),inset_0_-4px_12px_rgba(0,0,0,0.35)]',
        className,
      )}
      style={{ width: size, height: size, perspective: 800 }}
      data-flipping={spinning ? 'true' : 'false'}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: spinning ? baseRotation + 1080 : baseRotation }}
        transition={spinning ? { duration: 0.9, ease: [0.16, 1, 0.3, 1] } : { duration: 0 }}
      >
        {/* Heads face (front) */}
        <div className="absolute inset-0 grid place-items-center backface-hidden">
          <MaskMark size={Math.round(size * 0.62)} variant="simple" title="MASQUER mask" />
        </div>
        {/* Tails face (back, pre-rotated) */}
        <div
          className="absolute inset-0 grid place-items-center backface-hidden"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <span
            className="font-display font-bold leading-none text-[#5b4310]"
            style={{ fontSize: Math.round(size * 0.5) }}
          >
            M
          </span>
        </div>
      </motion.div>
    </div>
  );
}
```

Note: `backface-hidden` isn't in Tailwind base — add `[backface-visibility:hidden]` arbitrary class instead, OR rely on the inline `style.backfaceVisibility = 'hidden'` (set it once in a shared className). Adjust the class to `[backface-visibility:hidden]` if needed for compatibility.

- [ ] **Step 4: Run — expect PASS.** Commit:

```bash
git add src/games/coin-flip/BrandCoin.tsx src/games/coin-flip/BrandCoin.test.tsx
git commit -m "feat(coin-flip): add BrandCoin component (mask heads / M tails + 3D flip)"
```

## Task 5: Rebuild `CoinFlipPage` on the design system

**Files:** Modify `src/games/coin-flip/CoinFlipPage.tsx`

- [ ] **Step 1:** Rewrite the page using `BrandCoin` + #1 primitives + `useSound` + `useEffectiveReducedMotion`, keeping the `GameShell` + `BettingPanel` integration intact:

```tsx
import type { JSX } from 'react';
import { useState } from 'react';
import GameShell from '@/games/_shared/GameShell';
import CoinFlipRules from './rules';
import BettingPanel from '@/games/_shared/BettingPanel';
import { useGameRound } from '@/games/_shared/useGameRound';
import { useRecentRounds } from '@/systems/hooks/useRecentRounds';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import { useSound } from '@/systems/sound/useSound';
import { Badge, Button, Icon } from '@/components/ui';
import BrandCoin from './BrandCoin';
import { COIN_FLIP_CONFIG, playRound, type CoinFlipDetails, type CoinSide } from './logic';
import type { BetHandle } from '@/systems/wallet';
import type { RecentResultItem } from '@/games/_shared/RecentResults';

export default function CoinFlipPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const { placeBet, settle, resolving } = useGameRound('coin-flip');
  const rounds = useRecentRounds(user?.id, 'coin-flip', 12);
  const reduce = useEffectiveReducedMotion();
  const { play } = useSound();
  const [handle, setHandle] = useState<BetHandle | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [displayFace, setDisplayFace] = useState<CoinSide>('heads');
  const [lastNet, setLastNet] = useState<number | null>(null);
  const [lastBet, setLastBet] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [betPanelKey, setBetPanelKey] = useState(0);
  const [streak, setStreak] = useState(0);

  if (!user) return null;

  const onCommit = async (amount: number): Promise<void> => {
    setError(null);
    const result = await placeBet(amount, {
      min: COIN_FLIP_CONFIG.MIN_BET,
      max: COIN_FLIP_CONFIG.MAX_BET,
    });
    if (!result.ok) {
      setError(
        result.error === 'insufficient_chips'
          ? 'Not enough chips.'
          : result.error === 'below_minimum'
            ? `Minimum bet is ${COIN_FLIP_CONFIG.MIN_BET}.`
            : result.error === 'above_maximum'
              ? `Maximum bet is ${COIN_FLIP_CONFIG.MAX_BET}.`
              : 'Something went wrong placing the bet.',
      );
      return;
    }
    play('chip.place');
    setHandle(result.handle);
    setLastBet(amount);
  };

  const onCall = async (call: CoinSide): Promise<void> => {
    if (!handle || flipping) return;
    setFlipping(true);
    setLastNet(null);
    play('coin.flip');
    const result = playRound({ call, betAmount: handle.amount });
    await new Promise((r) => setTimeout(r, reduce ? 0 : 900));
    await settle(handle, result);
    const details = result.details as CoinFlipDetails;
    setDisplayFace(details.landed);
    setLastNet(result.netChange);
    setHandle(null);
    setFlipping(false);
    setBetPanelKey((k) => k + 1);
    if (result.outcome === 'win') {
      setStreak((s) => s + 1);
      play(result.payout >= handle.amount * 2 ? 'win.small' : 'win.small');
    } else {
      setStreak(0);
      play('loss');
    }
  };

  const items: RecentResultItem[] = rounds.map((r) => {
    const d = r.details as CoinFlipDetails;
    return {
      key: r.id,
      badgeText: d.landed === 'heads' ? 'H' : 'T',
      badgeColor: d.landed === 'heads' ? 'linear-gradient(135deg,#fbe6a0,#d4af37)' : '#0c1711',
      badgeTextColor: d.landed === 'heads' ? '#5b4310' : '#e6c068',
      betLabel: String(r.betAmount),
      netChips: r.netChange,
      accent: r.outcome,
    };
  });

  return (
    <GameShell
      title="MASQUER · Coin Flip"
      meta="1:1 · 1–500"
      game="coin-flip"
      recentItems={items}
      rules={<CoinFlipRules />}
      bettingPanel={
        <BettingPanel
          key={betPanelKey}
          min={COIN_FLIP_CONFIG.MIN_BET}
          max={COIN_FLIP_CONFIG.MAX_BET}
          balance={balance}
          {...(lastBet !== undefined ? { lastBet } : {})}
          locked={handle !== null || flipping || resolving}
          onCommit={(amount) => void onCommit(amount)}
          callButtons={(committedAmount) => (
            <div className="flex gap-2.5">
              <Button
                variant="primary"
                size="md"
                onClick={() => void onCall('heads')}
                disabled={committedAmount === null || flipping || resolving}
                className="flex-1"
              >
                Heads
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => void onCall('tails')}
                disabled={committedAmount === null || flipping || resolving}
                className="flex-1"
              >
                Tails
              </Button>
            </div>
          )}
        />
      }
    >
      <div className="flex flex-col items-center gap-4 py-4">
        {streak >= 2 && (
          <Badge tone="win">
            <Icon name="Flame" size={12} aria-hidden /> {streak} win streak
          </Badge>
        )}
        <BrandCoin side={displayFace} flipping={flipping} />
        {lastNet !== null && !flipping && (
          <Badge tone={lastNet > 0 ? 'win' : 'loss'}>
            {lastNet > 0 ? `+${lastNet} chips` : `−${Math.abs(lastNet)} chips`}
          </Badge>
        )}
        {error && (
          <p className="text-sm text-loss" role="alert">
            {error}
          </p>
        )}
        {lastNet === null && !flipping && (
          <p className="text-sm text-ivory/70">Place a bet, then call heads or tails.</p>
        )}
      </div>
    </GameShell>
  );
}
```

Notes:

- The `play(result.payout >= handle.amount * 2 ? 'win.small' : 'win.small')` ternary is intentionally always `win.small` — coin-flip is a flat 1:1, so it doesn't earn `win.medium`/`win.jackpot` tiers. Simplify to `play('win.small')`.
- If `Badge` from `@/components/ui` doesn't accept arbitrary children with an `Icon`, fall back to a small flex layout: `<span className="inline-flex items-center gap-1"><Icon name="Flame" size={12}/>{streak} win streak</span>` inside the Badge. Check `Badge`'s props first.
- Verify the `'Flame'` and other lucide icon names exist (the icon test from #3 PR A pattern catches bad names — add the icon to that test if you keep that test).
- [ ] **Step 2: Commit**

```bash
git add src/games/coin-flip/CoinFlipPage.tsx
git commit -m "feat(coin-flip): rebuild page on design system + BrandCoin + win-streak"
```

## Task 6: Update `CoinFlipPage.test.tsx`

**Files:** Modify `src/games/coin-flip/CoinFlipPage.test.tsx`

- [ ] **Step 1:** Update tests for the new markup. Keep coverage of: page renders without user → returns null; pick side → place bet → flip → settle → recent-results row updated; win increments the streak Badge, loss resets it; sound `useSound().play` is called with `chip.place` on commit, `coin.flip` on call, and `win.small`/`loss` on settle (mock `useSound`). Example skeleton:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CoinFlipPage from './CoinFlipPage';
// ...existing imports (sessionStore, walletStore, fake-indexeddb seed, MemoryRouter, ToastProvider, etc.)

const play = vi.fn();
vi.mock('@/systems/sound/useSound', () => ({ useSound: () => ({ play }) }));
vi.mock('@/motion/useEffectiveReducedMotion', () => ({ useEffectiveReducedMotion: () => true }));
// reduced-motion mocked TRUE so the 900ms flip is instant in tests.

beforeEach(() => {
  play.mockClear(); /* seed user, balance, etc. */
});
```

Replace the old "HEADS" text assertions with `getByRole('button', { name: /heads/i })`. Where the old test asserted the inline gold-coin element by text content, swap to `getByRole('img', { name: /masquer/i })` for heads or `getByText('M')` for tails.

- [ ] **Step 2: Run** `pnpm exec vitest run src/games/coin-flip` — green. Commit:

```bash
git add src/games/coin-flip/CoinFlipPage.test.tsx
git commit -m "test(coin-flip): update page tests for the redesign"
```

## Task 7: DoD + open PR

- [ ] **Step 1: Full DoD**

```bash
pnpm gen-audio  # idempotent — re-creates the wav, should be byte-identical
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
```

All must pass. `coin-flip.wav` must be present and unchanged after `gen-audio` (deterministic seed).

- [ ] **Step 2: Push + open PR**

```bash
git push -u origin phase-15-4-coin-flip
gh pr create --title "phase-15(#4): coin-flip upgrade — brand coin + sound + win-streak" --body "Single-PR upgrade of the Coin-flip game on the design system + motion/sound + brand coin (mask heads / M tails). Adds coin.flip to the audio taxonomy with a new self-synthesized sample. Adds a session-local win-streak indicator. Game logic untouched."
```

---

## Self-review

- **Spec coverage:** brand coin (§2/§3 → Task 4) · sound addition (§2/§4 → Tasks 1–3) · page rebuild on #1 primitives + #2 motion/sound (§3 → Task 5) · win-streak indicator (§3 → Task 5) · game logic untouched explicitly (§5 → no edits to `logic.ts`) · testing (§6 → Tasks 4/6 + extended engine/useSound tests in Tasks 1/3) · single PR (§8 → Task 7). ✓
- **Placeholder scan:** full code provided for `coin.flip` taxonomy edit, `coinFlip()` generator, `BrandCoin`, and `CoinFlipPage`; test sketches use concrete patterns. No "TBD"/"handle edge cases".
- **Type consistency:** `'coin.flip'` literal consistent across ids/engine/page; `BrandCoin` props `(side, size?, flipping?, className?)` consistent between component + test; `useEffectiveReducedMotion` (not framer-motion's `useReducedMotion`) used in both BrandCoin and the page. ✓
- **Risk notes:** (1) `backface-visibility` — Tailwind 3 has `backface-visible`/`backface-hidden` in v3.3+ but the project may not expose it; if `backface-hidden` doesn't resolve, use `[backface-visibility:hidden]` arbitrary or inline `style.backfaceVisibility = 'hidden'`. (2) `lucide-react` Flame icon — confirm it exists via the `NAV_ICON` test pattern; if absent, pick a real glyph (e.g., `'Sparkles'`). (3) The `Badge` from `@/components/ui` may not accept arbitrary children; fall back to inline flex if so (noted in Task 5). (4) The `play('win.small'/'win.small')` in the snippet collapses to a single `play('win.small')` — Task 5 step 2 instructs the implementer to simplify.
- **Additive/invariants:** no game logic touched (logic.ts/logic.test.ts unchanged); games sandbox preserved (page imports `useGameRound`/`useSound`/motion via `@/systems`/`@/motion` — never `@/db` or `@/store` directly); one rounds row per game unaffected; integer money; seeded RNG; tokens-only; reduced-motion via #2.
