import { forwardRef, useCallback } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';
import { Spinner } from './Spinner';
import { useSound } from '@/systems/sound/useSound';

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-body font-semibold uppercase tracking-[0.12em] ' +
    'transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ' +
    'disabled:opacity-40 disabled:pointer-events-none motion-safe:active:scale-[0.97]',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-to-b from-gold to-gold-deep text-[#241702] shadow-gold-glow',
        secondary: 'border border-brass text-gold bg-transparent',
        danger: 'border-2 border-casino-red bg-transparent text-casino-red hover:bg-casino-red/10',
        ghost: 'bg-transparent text-ivory/85 hover:text-ivory',
      },
      size: { sm: 'text-[10px] px-3.5 py-2', md: 'text-xs px-5 py-2.5', lg: 'text-sm px-6 py-3.5' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    asChild = false,
    loading = false,
    disabled,
    children,
    onClick,
    ...rest
  },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  const { play } = useSound();
  // Play the UI click on real buttons only — when `asChild`, Slot forwards to the
  // child element and we don't own its click contract. Prefs-gated by useSound.
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!asChild) play('ui.click');
      onClick?.(e);
    },
    [asChild, play, onClick],
  );
  return (
    <Comp
      ref={ref}
      className={cn(button({ variant, size }), className)}
      disabled={asChild ? undefined : disabled || loading}
      onClick={asChild ? onClick : handleClick}
      {...rest}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Spinner size={14} />}
          {children}
        </>
      )}
    </Comp>
  );
});
