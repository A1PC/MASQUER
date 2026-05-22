import type { JSX } from 'react';

interface Props {
  point: number | null;
}

export default function PointPuck({ point }: Props): JSX.Element {
  const isOn = point !== null;
  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-full border-2 font-display text-[10px] font-bold tracking-wider transition-colors"
      style={
        isOn
          ? {
              background: '#ffffff',
              borderColor: '#1a5c3a',
              color: '#1a5c3a',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }
          : {
              background: '#1a1a1a',
              borderColor: '#555',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }
      }
      data-puck={isOn ? 'on' : 'off'}
      aria-label={isOn ? `Point is ON: ${point}` : 'Point is OFF'}
    >
      {isOn ? 'ON' : 'OFF'}
    </div>
  );
}
