import { type JSX, useState } from 'react';
import { Button, Icon, useToast } from '@/components/ui';
import { useNextDailyEligibleAt, useWalletStore } from '@/store/walletStore';
import { useCurrentUser } from '@/store/sessionStore';
import { useSound } from '@/systems/sound/useSound';
import { WALLET_CONFIG } from '@/systems/wallet';

/** TopBar chip that surfaces the daily top-up only when it can be claimed.
 *  Claiming routes through `walletStore.claimDaily` (integer money), then
 *  confirms with a win toast + the `win.small` flourish. */
export default function DailyClaimChip(): JSX.Element | null {
  const eligibleAt = useNextDailyEligibleAt();
  const claimDaily = useWalletStore((s) => s.claimDaily);
  const user = useCurrentUser();
  const { toast } = useToast();
  const { play } = useSound();

  // `Date.now()` is impure in render; capture it once on mount (the chip's
  // visibility is a snapshot — `claimDaily` re-validates eligibility anyway).
  const [now] = useState(() => Date.now());
  const eligible = (eligibleAt ?? 0) <= now;
  if (!user || !eligible) return null;

  const onClaim = async (): Promise<void> => {
    const res = await claimDaily(user.id);
    if (res.ok) {
      play('win.small');
      toast({
        title: `+${WALLET_CONFIG.DAILY_CLAIM_AMOUNT} chips`,
        description: 'Daily top-up claimed.',
        tone: 'win',
      });
    }
  };

  return (
    <Button
      variant="primary"
      size="sm"
      onClick={() => void onClaim()}
      aria-label={`Claim daily top-up of ${WALLET_CONFIG.DAILY_CLAIM_AMOUNT} chips`}
    >
      <Icon name="Gift" size={14} />
      Claim +{WALLET_CONFIG.DAILY_CLAIM_AMOUNT}
    </Button>
  );
}
