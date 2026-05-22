import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

/**
 * Shared field surface for `Input`/`Textarea`: dark base, brass border that
 * resolves to a gold focus-visible ring; the `error` state swaps the border to
 * oxblood (paired with the `Field` error text so colour is never the sole cue).
 */
const fieldSurface = cva(
  'w-full rounded-lg bg-base px-3 py-2.5 font-body text-ivory placeholder:text-ivory/40 ' +
    'outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-40 ' +
    'focus-visible:ring-2 focus-visible:ring-gold/30',
  {
    variants: {
      state: {
        default: 'border border-brass focus-visible:border-gold',
        error: 'border border-[#a3243a] focus-visible:border-[#a3243a]',
      },
    },
    defaultVariants: { state: 'default' },
  },
);

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof fieldSurface> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, state, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(fieldSurface({ state }), className)} {...rest} />;
});

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, VariantProps<typeof fieldSurface> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, state, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(fieldSurface({ state }), 'min-h-[88px] resize-y', className)}
      {...rest}
    />
  );
});
