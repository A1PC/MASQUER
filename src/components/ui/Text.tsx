import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const heading = cva('font-display text-gold tracking-[0.04em]', {
  variants: {
    level: {
      1: 'text-3xl',
      2: 'text-xl',
      3: 'text-base',
    },
  },
  defaultVariants: { level: 2 },
});

export interface HeadingProps
  extends Omit<React.HTMLAttributes<HTMLHeadingElement>, 'color'>, VariantProps<typeof heading> {}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(function Heading(
  { className, level, children, ...rest },
  ref,
) {
  const Tag = `h${level ?? 2}` as const satisfies 'h1' | 'h2' | 'h3';
  return (
    <Tag ref={ref} className={cn(heading({ level }), className)} {...rest}>
      {children}
    </Tag>
  );
});

const text = cva('font-body', {
  variants: {
    tone: {
      default: 'text-ivory',
      muted: 'text-ivory/60',
      gold: 'text-gold',
    },
    size: {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    },
  },
  defaultVariants: { tone: 'default', size: 'md' },
});

export interface TextProps
  extends Omit<React.HTMLAttributes<HTMLParagraphElement>, 'color'>, VariantProps<typeof text> {}

export const Text = forwardRef<HTMLParagraphElement, TextProps>(function Text(
  { className, tone, size, children, ...rest },
  ref,
) {
  return (
    <p ref={ref} className={cn(text({ tone, size }), className)} {...rest}>
      {children}
    </p>
  );
});
