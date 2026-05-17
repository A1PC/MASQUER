import type { JSX, ReactNode } from 'react';
import { Link } from 'react-router';
import RecentResults, { type RecentResultItem } from './RecentResults';

interface Props {
  title: string;
  meta?: string;
  recentItems?: RecentResultItem[];
  bettingPanel: ReactNode;
  children: ReactNode;
}

export default function GameShell({
  title,
  meta,
  recentItems,
  bettingPanel,
  children,
}: Props): JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        <section className="flex flex-1 flex-col items-center px-6 pt-7">
          <div className="mb-4 flex w-full max-w-[520px] items-center justify-between">
            <Link to="/lobby" className="text-xs text-white/60 hover:text-white">
              ← lobby
            </Link>
            <h1 className="font-display text-2xl tracking-wider text-gold-bright">{title}</h1>
            <span className="text-xs text-white/50">{meta}</span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center">{children}</div>
        </section>
        {recentItems !== undefined && (
          <aside className="w-[200px] flex-shrink-0 border-l border-gold/20 bg-felt-deep px-3.5 py-5">
            <RecentResults items={recentItems} />
          </aside>
        )}
      </div>
      <div className="border-t-2 border-gold/40 bg-felt-deep px-6 py-4">{bettingPanel}</div>
    </div>
  );
}
