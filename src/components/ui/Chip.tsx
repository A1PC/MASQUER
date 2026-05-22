import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import MaskMark from '@/components/brand/MaskMark';
import { cn } from './cn';

const chip = cva(
  'inline-flex items-center justify-center rounded-full border-4 border-dashed ' +
    'font-display font-bold shadow-[0_4px_10px_rgba(0,0,0,0.5)] select-none',
  {
    variants: {
      surface: {
        felt: 'bg-felt-table text-gold border-gold',
        velvet: 'bg-velvet text-ivory border-brass',
        emerald: 'bg-jewel-emerald text-ivory border-gold',
      },
      size: {
        sm: 'h-12 w-12 text-[11px]',
        md: 'h-[60px] w-[60px] text-[13px]',
        lg: 'h-20 w-20 text-base',
      },
    },
    defaultVariants: { surface: 'felt', size: 'md' },
  },
);

interface ChipBase
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>, VariantProps<typeof chip> {}

/** A casino chip — renders EITHER a denomination `value` OR the mask `emblem`, never both. */
type ChipProps =
  | (ChipBase & { value: number; emblem?: never })
  | (ChipBase & { emblem: true; value?: never });

const EMBLEM_SIZE = { sm: 22, md: 30, lg: 40 } as const;

export const Chip = forwardRef<HTMLDivElement, ChipProps>(function Chip(props, ref) {
  const { className, surface, size, value, emblem, ...rest } = props;
  const resolvedSize = size ?? 'md';
  return (
    <div ref={ref} className={cn(chip({ surface, size }), className)} {...rest}>
      {emblem ? <MaskMark size={EMBLEM_SIZE[resolvedSize]} variant="simple" title="chip" /> : value}
    </div>
  );
});
