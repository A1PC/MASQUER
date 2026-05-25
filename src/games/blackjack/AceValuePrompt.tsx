import type { JSX } from 'react';
import { Modal, Button } from '@/components/ui';

interface AceValuePromptProps {
  /** True while an Ace prompt is active (machine in `awaiting_ace_choice`). */
  open: boolean;
  /** True when 11 wouldn't bust the hand. When false, only the `1` button
   *  is shown and the prompt explains the auto-lock. */
  allowEleven: boolean;
  /** Dispatched on button click — wired to the machine's CHOOSE_ACE event. */
  onChoose: (value: 1 | 11) => void;
}

/**
 * `AceValuePrompt` — the player picks the value of an Ace they just drew
 * (Velvet Duel rule §3.2). Renders as a Radix-backed `Modal` from `@/components/ui`,
 * which provides the accessibility contract: focus-trap on the panel, focus
 * restoration on close, Escape-to-close, `role="dialog"` + `aria-modal`, and a
 * scrim that blocks the background. The prompt is non-dismissable from the
 * caller's perspective: every `onOpenChange` call is ignored so the player
 * MUST commit to a value (the auto-1 short-circuit in the machine handles the
 * "11 would bust" case before this modal ever opens).
 *
 * Accessibility: each button carries an `aria-label` describing the
 * destination value; both buttons exceed the 44×44pt touch-target minimum
 * (Button `size="lg"` renders at ~52px tall). The Modal's built-in `X` close
 * affordance is suppressed visually because the player must choose, but Radix
 * still wires Escape — for our use the machine will be in a state where any
 * subsequent input is ignored until CHOOSE_ACE fires.
 */
export default function AceValuePrompt({
  open,
  allowEleven,
  onChoose,
}: AceValuePromptProps): JSX.Element {
  return (
    <Modal
      open={open}
      onOpenChange={() => {
        /* Non-dismissable — player MUST commit to a value. */
      }}
      title="Count this Ace as"
      description={
        allowEleven
          ? 'Choose 1 or 11 for the Ace you just drew.'
          : '11 would bust this hand — locked at 1.'
      }
    >
      <div className="mt-4 flex justify-end gap-2.5">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => onChoose(1)}
          aria-label="Count this Ace as one"
          className="min-h-[44px] min-w-[88px]"
        >
          1
        </Button>
        {allowEleven && (
          <Button
            variant="primary"
            size="lg"
            onClick={() => onChoose(11)}
            aria-label="Count this Ace as eleven"
            className="min-h-[44px] min-w-[88px]"
          >
            11
          </Button>
        )}
      </div>
    </Modal>
  );
}
