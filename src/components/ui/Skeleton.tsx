import { forwardRef } from 'react';
import { cn } from './cn';

/**
 * `Skeleton` — a shimmering placeholder block for loading content. Pulses with
 * `animate-pulse`, disabled under `prefers-reduced-motion`
 * (`motion-reduce:animate-none`). Decorative, so it is `aria-hidden`; pair it
 * with a visible "Loading" label or `Spinner` elsewhere for screen readers.
 */
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number | string;
  height?: number | string;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { className, width, height, style, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn('animate-pulse rounded bg-ivory/10 motion-reduce:animate-none', className)}
      style={{
        ...(width !== undefined ? { width } : {}),
        ...(height !== undefined ? { height } : {}),
        ...style,
      }}
      {...rest}
    />
  );
});
