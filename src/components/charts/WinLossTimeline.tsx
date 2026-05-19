import type { JSX } from 'react';
import type { WinLossTimelinePoint } from '@/systems/stats';

type Props = { data: WinLossTimelinePoint[]; height?: number };

const COLOR: Record<WinLossTimelinePoint['outcome'], string> = {
  win: '#3dd17a',
  loss: '#a3122a',
  push: '#7a7a7a',
};

export default function WinLossTimeline({ data, height = 60 }: Props): JSX.Element {
  if (data.length === 0) {
    return <div className="text-xs text-white/40">No rounds yet — outcomes will appear here.</div>;
  }
  // Reverse to oldest-first for left-to-right reading.
  const points = [...data].reverse();
  return (
    <div
      className="flex items-end gap-[2px] rounded border border-white/10 bg-felt-deep px-2 py-2"
      style={{ height }}
      data-win-loss-timeline
    >
      {points.map((p, i) => (
        <div
          key={i}
          aria-label={`Round ${i + 1}: ${p.outcome}`}
          className="flex-1 rounded-sm"
          style={{
            backgroundColor: COLOR[p.outcome],
            height: '100%',
            opacity: p.outcome === 'push' ? 0.4 : 0.85,
          }}
        />
      ))}
    </div>
  );
}
