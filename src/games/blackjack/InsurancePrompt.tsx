import type { JSX } from 'react';
import { BLACKJACK_CONFIG } from './config';

interface Props {
  mainBet: number;
  onTake: () => void;
  onDecline: () => void;
}

export default function InsurancePrompt({ mainBet, onTake, onDecline }: Props): JSX.Element {
  const insuranceBet = Math.floor(mainBet * BLACKJACK_CONFIG.INSURANCE_RATIO);
  const winnings = insuranceBet * 2;
  return (
    <div className="mx-auto max-w-[420px] rounded-lg border border-gold-bright bg-gold-bright/[0.06] p-4 text-center">
      <div className="mb-2 font-display text-[13px] tracking-[1.5px] text-gold-bright">
        INSURANCE?
      </div>
      <p className="mb-3 text-[11px] text-white/70">
        Pay {insuranceBet} (half your bet) to win {winnings} if dealer has blackjack.
      </p>
      <div className="flex justify-center gap-2">
        <button
          onClick={onTake}
          className="rounded-md border-2 border-gold bg-casino-red px-5 py-2.5 font-display text-[12px] tracking-[1px] text-white"
        >
          TAKE +{insuranceBet}
        </button>
        <button
          onClick={onDecline}
          className="rounded-md border-2 border-gold/50 bg-transparent px-5 py-2.5 font-display text-[12px] tracking-[1px] text-white"
        >
          DECLINE
        </button>
      </div>
    </div>
  );
}
