import type { JSX } from 'react';
import MaskMark from '@/components/brand/MaskMark';
import { cn } from './cn';

interface SpinnerProps {
  size?: number;
  className?: string;
}

/** Mask-reveal loader: the Colombina mark gently rotates. Instant under reduced motion. */
export function Spinner({ size = 28, className }: SpinnerProps): JSX.Element {
  return (
    <span
      role="img"
      aria-label="Loading"
      className={cn('inline-block animate-spin motion-reduce:animate-none', className)}
    >
      <span aria-hidden="true" className="contents">
        <MaskMark size={size} variant="simple" title="Loading" />
      </span>
    </span>
  );
}
