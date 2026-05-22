import type { JSX } from 'react';
import { Button, Icon } from '@/components/ui';
import { useCurrentUser } from '@/store/sessionStore';
import { useDailyClaim } from './useDailyClaim';

/** TopBar chip that surfaces the daily top-up only when it can be claimed.
 *  Claiming routes through the shared `useDailyClaim` hook (integer money via
 *  `walletStore.claimDaily`, win toast, `win.small` flourish) so the chip, the
 *  lobby hero, and the zero-balance state all behave identically. */
export default function DailyClaimChip(): JSX.Element | null {
  const user = useCurrentUser();
  const { eligible, claim, amount } = useDailyClaim();

  if (!user || !eligible) return null;

  return (
    <Button
      variant="primary"
      size="sm"
      onClick={() => void claim()}
      aria-label={`Claim daily top-up of ${amount} chips`}
    >
      <Icon name="Gift" size={14} />
      Claim +{amount}
    </Button>
  );
}
