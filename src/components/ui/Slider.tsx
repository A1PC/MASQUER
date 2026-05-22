import { forwardRef } from 'react';
import * as RadixSlider from '@radix-ui/react-slider';
import { cn } from './cn';

/**
 * Slider built on `@radix-ui/react-slider`, used by bet controls: a dark base
 * track with a gold filled range and a gold circular thumb that shows the gold
 * focus ring. All Radix props (`min`/`max`/`step`/`value`/`defaultValue`/
 * `onValueChange`) pass through; arrow keys nudge the value.
 */
export const Slider = forwardRef<
  React.ElementRef<typeof RadixSlider.Root>,
  React.ComponentPropsWithoutRef<typeof RadixSlider.Root>
>(function Slider({ className, ...rest }, ref) {
  const thumbCount = rest.value?.length ?? rest.defaultValue?.length ?? 1;
  return (
    <RadixSlider.Root
      ref={ref}
      className={cn(
        'relative flex w-full touch-none select-none items-center py-2.5',
        'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40',
        className,
      )}
      {...rest}
    >
      <RadixSlider.Track className="relative h-1.5 grow rounded-full bg-base">
        <RadixSlider.Range className="absolute h-full rounded-full bg-gold" />
      </RadixSlider.Track>
      {Array.from({ length: thumbCount }, (_, i) => (
        <RadixSlider.Thumb
          key={i}
          className={
            'block h-5 w-5 rounded-full border border-gold-deep bg-gold shadow-gold-glow outline-none ' +
            'transition-transform focus-visible:ring-2 focus-visible:ring-gold/50 ' +
            'motion-safe:hover:scale-110 motion-reduce:transition-none'
          }
        />
      ))}
    </RadixSlider.Root>
  );
});
