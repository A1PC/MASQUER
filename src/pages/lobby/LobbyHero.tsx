import type { JSX } from 'react';
import { Panel, Button, Text, Icon, EmptyState } from '@/components/ui';
import MaskMark from '@/components/brand/MaskMark';
import { useBalance } from '@/store/walletStore';
import { useDailyClaim } from '@/components/useDailyClaim';
import { formatChips } from '@/lib/formatChips';

/** "Next top-up …" copy for the not-yet-eligible state. */
function formatNextDaily(nextEligibleAt: number | null): string {
  if (nextEligibleAt === null || nextEligibleAt <= Date.now()) return 'Available now';
  return `Next top-up ${new Date(nextEligibleAt).toLocaleString()}`;
}

/** The daily-top-up call to action, shared between the hero bar and the
 *  zero-balance empty state: a primary claim button when eligible, otherwise a
 *  muted next-eligible line. */
function DailyClaimCta({ size = 'sm' }: { size?: 'sm' | 'md' }): JSX.Element {
  const { eligible, nextEligibleAt, amount, claim } = useDailyClaim();
  if (eligible) {
    return (
      <Button
        variant="primary"
        size={size}
        onClick={() => void claim()}
        aria-label={`Claim daily top-up of ${amount} chips`}
      >
        <Icon name="Gift" size={14} />
        Claim +{amount} daily
      </Button>
    );
  }
  return (
    <Text tone="muted" size="sm" className="tabular-nums">
      {formatNextDaily(nextEligibleAt)}
    </Text>
  );
}

interface Props {
  username: string;
}

/** Lobby marquee hero (Option A): the brand mask, a personal welcome, the
 *  balance in tabular numerals, and the daily-claim CTA. When the player is out
 *  of chips it collapses to the #1 `EmptyState` with the same claim flow, so the
 *  daily top-up is always one tap away. */
export default function LobbyHero({ username }: Props): JSX.Element {
  const balance = useBalance() ?? 0;

  if (balance === 0) {
    return (
      <Panel surface="velvet" className="mb-6">
        <EmptyState
          title="You're out of chips"
          description="The house refills your stack every day — claim your daily top-up to get back to the tables."
          action={<DailyClaimCta size="md" />}
        />
      </Panel>
    );
  }

  return (
    <Panel
      surface="velvet"
      className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5"
    >
      <MaskMark size={52} variant="simple" className="shrink-0" title="" />
      <div className="min-w-0">
        <h1 className="font-display text-xl tracking-[0.18em] text-gold-bright sm:text-2xl">
          Welcome back, {username}
        </h1>
        <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-ivory/55">Balance</p>
        <p className="font-numeral text-3xl leading-none tabular-nums text-gold">
          {formatChips(balance)}
        </p>
      </div>
      <div className="sm:ml-auto">
        <DailyClaimCta size="md" />
      </div>
    </Panel>
  );
}
