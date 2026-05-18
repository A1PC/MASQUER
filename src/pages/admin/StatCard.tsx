import type { JSX, ReactNode } from 'react';

type Props = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'neutral' | 'positive' | 'negative';
};

export default function StatCard({ label, value, sub, tone = 'neutral' }: Props): JSX.Element {
  const valueColor =
    tone === 'positive' ? 'text-chip-win' : tone === 'negative' ? 'text-casino-red' : 'text-white';
  return (
    <div data-tone={tone} className="rounded-md border border-gold/30 bg-felt-deep px-4 py-3">
      <div className="font-display text-[10px] tracking-[0.18em] text-white/50">
        {label.toUpperCase()}
      </div>
      <div className={`mt-1 font-display text-2xl ${valueColor}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-white/40">{sub}</div>}
    </div>
  );
}
