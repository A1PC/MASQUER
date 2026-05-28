import type { JSX } from 'react';
import { Button } from '@/components/ui';

interface Props {
  /** True when 11 wouldn't bust the hand. When false, only the `1` button
   *  is shown — the auto-1 short-circuit in the machine usually skips the
   *  prompt entirely, but we still render the button so the player commits
   *  consistently (no surprise auto-locks). */
  allowEleven: boolean;
  /** Dispatched on button click — wired to the machine's CHOOSE_ACE event. */
  onChoose: (value: 1 | 11) => void;
}

/**
 * `AceChoicePanel` — the inline replacement for the old `AceValuePrompt`
 * Modal (Phase-15 #5 fix). Renders in the ActionPanel's slot when the machine
 * is in `awaiting_ace_choice`, so the dealer + player hands remain fully
 * visible (no scrim, no backdrop blur). The just-drawn Ace card receives a
 * pulsing gold ring (applied via `HandView`'s per-card highlight prop) so the
 * player knows which card they're valuing.
 *
 * Accessibility: an `aria-live="polite"` region announces the prompt and its
 * options for screen readers; both buttons exceed the 44pt touch-target
 * minimum and carry explicit `aria-label`s naming the destination value.
 *
 * Design rationale: by sharing the ActionPanel's physical slot, the prompt
 * never occludes the table, keeps spatial continuity with the Hit/Stand
 * buttons it replaces, and respects the user's mental model — "this is the
 * action panel; the panel is asking me to pick a value now."
 */
export default function AceChoicePanel({ allowEleven, onChoose }: Props): JSX.Element {
  const announcement = allowEleven ? 'Choose value for ace: 1 or 11' : 'Choose value for ace: 1';
  return (
    <div className="mx-auto max-w-[720px]" role="region" aria-label="Lock Ace value">
      {/* Polite live region — screen readers announce the prompt when it opens
       *  without stealing focus from any currently-focused element. */}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-display text-[11px] tracking-[0.18em] text-gold-bright">
          LOCK ACE AS
        </span>
        <span className="font-mono text-[11px] text-ivory/55">
          {allowEleven ? 'Pick 1 or 11' : '11 would bust — pick 1'}
        </span>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => onChoose(1)}
          aria-label="Lock this Ace as one"
          className="min-h-[64px] flex-1 text-[28px] font-display tracking-[0.1em]"
        >
          1
        </Button>
        {allowEleven && (
          <Button
            variant="primary"
            size="lg"
            onClick={() => onChoose(11)}
            aria-label="Lock this Ace as eleven"
            className="min-h-[64px] flex-1 text-[28px] font-display tracking-[0.1em]"
          >
            11
          </Button>
        )}
      </div>
    </div>
  );
}
