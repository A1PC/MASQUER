import type { JSX, ReactNode } from 'react';
import { cn } from './cn';
import { Heading, Text } from './Text';
import MaskMark from '@/components/brand/MaskMark';

/**
 * `EmptyState` — the centred "nothing here yet" placeholder: a muted `MaskMark`,
 * a Cinzel heading, supporting body copy, and an optional action. Used for empty
 * history, no active tables, etc.
 */
interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional call-to-action, typically a `<Button>`. */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      <span className="opacity-30">
        <MaskMark size={64} variant="simple" title="" />
      </span>
      <Heading level={3}>{title}</Heading>
      {description ? (
        <Text tone="muted" className="max-w-sm">
          {description}
        </Text>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
