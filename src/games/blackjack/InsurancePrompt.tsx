import type { JSX } from 'react';
import { Modal, Button } from '@/components/ui';
import { BLACKJACK_CONFIG } from './config';

interface Props {
  /** True while the machine is in `insurance_prompt`. */
  open: boolean;
  mainBet: number;
  onTake: () => void;
  onDecline: () => void;
}

/**
 * `InsurancePrompt` — opens when the dealer shows an Ace. The player may pay
 * half their main bet for a 2:1 side-bet that pays out if the dealer's hole
 * card completes a natural blackjack. Rendered through the shared `Modal`
 * primitive so it inherits the focus-trap + Escape + scrim contract; the
 * decline button is the safe default and is the first focusable action.
 */
export default function InsurancePrompt({ open, mainBet, onTake, onDecline }: Props): JSX.Element {
  const insuranceBet = Math.floor(mainBet * BLACKJACK_CONFIG.INSURANCE_RATIO);
  const winnings = insuranceBet * 2;
  return (
    <Modal
      open={open}
      onOpenChange={() => {
        /* Non-dismissable — player MUST take or decline. */
      }}
      title="Insurance?"
      description={`Pay ${insuranceBet} (half your bet) to win ${winnings} if the dealer has blackjack.`}
    >
      <div className="mt-4 flex justify-end gap-2.5">
        <Button
          variant="secondary"
          size="lg"
          onClick={onDecline}
          aria-label="Decline insurance"
          className="min-h-[44px]"
        >
          Decline
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={onTake}
          aria-label={`Take insurance for ${insuranceBet} chips`}
          className="min-h-[44px]"
        >
          Take +{insuranceBet}
        </Button>
      </div>
    </Modal>
  );
}
