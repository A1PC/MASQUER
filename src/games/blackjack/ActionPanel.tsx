import type { JSX } from 'react';
import { Button, Tooltip, TooltipProvider, Icon, type IconName } from '@/components/ui';
import { canDouble, canSplit, handTotal } from './hand';
import { BLACKJACK_CONFIG } from './config';
import type { Hand } from './types';

interface Props {
  hands: readonly Hand[];
  activeHandIdx: number;
  balance: number;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
  onSplit: () => void;
}

/** Velvet Duel min-stand threshold — Stand is illegal on totals below this. */
const MIN_STAND_TOTAL = 14;

const STAND_DISABLED_HELP = 'Must Hit on totals below 14';

export default function ActionPanel({
  hands,
  activeHandIdx,
  balance,
  onHit,
  onStand,
  onDouble,
  onSplit,
}: Props): JSX.Element {
  const active = hands[activeHandIdx];
  const playerTotal = active ? handTotal(active.cards).value : 0;
  const standTooLow = playerTotal < MIN_STAND_TOTAL;

  const canActOnActive = active !== undefined && !active.resolved && !active.fromSplitAces;
  const canHitNow = canActOnActive;
  const canStandNow = canActOnActive && !standTooLow;
  const canDoubleNow =
    active !== undefined && canDouble(active, BLACKJACK_CONFIG.DAS) && balance >= active.betAmount;
  const canSplitNow =
    active !== undefined &&
    canSplit(active, hands.length, BLACKJACK_CONFIG.MAX_HANDS) &&
    balance >= active.betAmount;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="mx-auto max-w-[720px]">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="font-display text-[11px] tracking-[0.18em] text-gold">YOUR MOVE</span>
          <span className="font-mono text-[11px] text-ivory/55">
            Balance: {balance.toLocaleString()} · Bet: {active?.betAmount ?? 0}
          </span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <ActionBtn
            label="Hit"
            ariaLabel="Hit — draw one card"
            icon="Plus"
            enabled={canHitNow}
            onClick={onHit}
            variant="primary"
          />
          {standTooLow && canActOnActive ? (
            <Tooltip content={STAND_DISABLED_HELP} side="top">
              <span className="flex-1">
                <ActionBtn
                  label="Stand"
                  ariaLabel={`Stand — disabled: ${STAND_DISABLED_HELP}`}
                  icon="Hand"
                  enabled={false}
                  onClick={onStand}
                  variant="secondary"
                  ariaDescribedByText={STAND_DISABLED_HELP}
                />
              </span>
            </Tooltip>
          ) : (
            <ActionBtn
              label="Stand"
              ariaLabel="Stand — end turn on current total"
              icon="Hand"
              enabled={canStandNow}
              onClick={onStand}
              variant="secondary"
            />
          )}
          <ActionBtn
            label="Double"
            ariaLabel="Double down — double bet and draw exactly one card"
            icon="Coins"
            enabled={canDoubleNow}
            onClick={onDouble}
            variant="secondary"
          />
          <ActionBtn
            label="Split"
            ariaLabel="Split — split a pair into two hands"
            icon="SquareSplitHorizontal"
            enabled={canSplitNow}
            onClick={onSplit}
            variant="secondary"
          />
        </div>
        {standTooLow && canActOnActive && (
          <p
            className="mt-2 text-center text-[11px] text-ivory/65"
            role="status"
            aria-live="polite"
          >
            {STAND_DISABLED_HELP}
          </p>
        )}
        {!canSplitNow && active && active.cards.length === 2 && (
          <p className="mt-2 text-center text-[11px] text-ivory/45">
            Split unavailable:{' '}
            {hands.length >= BLACKJACK_CONFIG.MAX_HANDS
              ? `max ${BLACKJACK_CONFIG.MAX_HANDS} hands`
              : "cards aren't matching ranks"}
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}

interface ActionBtnProps {
  label: string;
  ariaLabel: string;
  icon: IconName;
  enabled: boolean;
  onClick: () => void;
  variant: 'primary' | 'secondary';
  ariaDescribedByText?: string;
}

function ActionBtn({
  label,
  ariaLabel,
  icon,
  enabled,
  onClick,
  variant,
}: ActionBtnProps): JSX.Element {
  return (
    <Button
      onClick={onClick}
      disabled={!enabled}
      variant={variant}
      size="lg"
      aria-label={ariaLabel}
      className="min-h-[44px] flex-1"
    >
      <Icon name={icon} size={16} />
      {label}
    </Button>
  );
}
