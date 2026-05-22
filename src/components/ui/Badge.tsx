import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';
import { Icon, type IconName } from './Icon';

const badge = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ' +
    'font-body text-[10px] font-semibold uppercase tracking-[0.15em]',
  {
    variants: {
      tone: {
        win: 'bg-gold/15 text-gold border-gold',
        loss: 'bg-loss/30 text-[#e3a8af] border-[#8a2433]',
        neutral: 'bg-brass/12 text-brass border-brass',
        info: 'bg-gold/10 text-ivory border-brass/60',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badge> {
  /** Optional leading glyph (functional colour is always paired with an icon). */
  icon?: IconName;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, tone, icon, children, ...rest },
  ref,
) {
  return (
    <span ref={ref} className={cn(badge({ tone }), className)} {...rest}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
});
