import type { JSX } from 'react';

interface Props {
  name: string;
  active?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Brass-ringed circle with the first letter of the mask name. Used by every
 * poker variant's `Seat` component. Active-to-act seat gets a gold-bright
 * ring + soft glow.
 */
export default function MaskAvatar({ name, active = false, size = 'md' }: Props): JSX.Element {
  const dim = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  return (
    <div
      className={[
        'flex items-center justify-center rounded-full bg-velvet font-display tracking-[0.18em] text-gold-bright',
        'border-2 border-brass',
        dim,
        active ? 'ring-2 ring-gold-bright shadow-[0_0_8px_rgba(232,189,109,0.6)]' : '',
      ].join(' ')}
      data-mask-avatar
      data-mask-name={name}
      aria-label={`Player ${name}`}
    >
      {name.charAt(0)}
    </div>
  );
}
