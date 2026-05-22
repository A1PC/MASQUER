import { forwardRef } from 'react';
import { cn } from './cn';

interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render a centered diamond ornament breaking the rule. */
  ornament?: boolean;
}

/** A brass hairline rule, optionally with a centered deco diamond ornament. */
export const Divider = forwardRef<HTMLDivElement, DividerProps>(function Divider(
  { className, ornament = false, ...rest },
  ref,
) {
  if (ornament) {
    return (
      <div
        ref={ref}
        role="separator"
        className={cn('flex items-center gap-3 text-brass/60', className)}
        {...rest}
      >
        <span className="h-px flex-1 bg-brass/30" />
        <span aria-hidden="true" className="text-[10px] leading-none text-gold/70">
          ◆
        </span>
        <span className="h-px flex-1 bg-brass/30" />
      </div>
    );
  }
  return (
    <hr
      ref={ref as React.Ref<HTMLHRElement>}
      className={cn('border-t border-brass/30', className)}
      {...rest}
    />
  );
});
