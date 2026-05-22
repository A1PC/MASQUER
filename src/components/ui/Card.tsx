import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const card = cva('relative rounded-xl p-[18px]', {
  variants: {
    variant: {
      plain: 'border border-brass/60',
      // The signature double-rule deco frame: outer brass border + inset gold hairline.
      deco:
        'border border-brass ' +
        'before:absolute before:inset-1.5 before:rounded-lg before:border before:border-brass/40 ' +
        'before:pointer-events-none',
    },
    surface: {
      felt: 'bg-gradient-to-b from-felt-table/50 to-surface/60',
      velvet: 'bg-gradient-to-b from-velvet/40 to-velvet-deep/60',
    },
  },
  defaultVariants: { variant: 'deco', surface: 'felt' },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof card> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant, surface, children, ...rest },
  ref,
) {
  return (
    <div ref={ref} className={cn(card({ variant, surface }), className)} {...rest}>
      {children}
    </div>
  );
});

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, children, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn('mb-2 font-display text-base tracking-[0.06em] text-gold', className)}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

export const CardBody = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardBody({ className, children, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn('font-body text-sm font-light leading-relaxed text-ivory/90', className)}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, children, ...rest }, ref) {
    return (
      <div ref={ref} className={cn('mt-3.5 flex items-center gap-2.5', className)} {...rest}>
        {children}
      </div>
    );
  },
);

/** Panel = Card locked to the double-rule deco frame. */
export const Panel = forwardRef<HTMLDivElement, Omit<CardProps, 'variant'>>(function Panel(
  { className, surface, children, ...rest },
  ref,
) {
  return (
    <Card ref={ref} variant="deco" surface={surface} className={className} {...rest}>
      {children}
    </Card>
  );
});
