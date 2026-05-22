import { forwardRef } from 'react';
import { icons, type LucideProps } from 'lucide-react';

export type IconName = keyof typeof icons;

interface IconProps extends Omit<LucideProps, 'ref'> {
  name: IconName;
  /** Accessible label. Omit for purely decorative icons (renders aria-hidden). */
  label?: string;
  size?: number;
}

export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  { name, label, size = 20, ...rest },
  ref,
) {
  const Glyph = icons[name];
  return (
    <Glyph
      ref={ref}
      size={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
    />
  );
});
