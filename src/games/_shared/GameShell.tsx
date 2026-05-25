import type { JSX, ReactNode } from 'react';
import { useState } from 'react';
import { Link } from 'react-router';
import type { Round } from '@/db';
import RecentResults, { type RecentResultItem } from './RecentResults';
import RulesButton from './RulesButton';
import RulesModal from './RulesModal';
import { useGameVisit } from './useGameVisit';

type Game = Round['game'];

interface Props {
  title: string;
  meta?: string;
  recentItems?: RecentResultItem[];
  bettingPanel: ReactNode;
  children: ReactNode;
  /** Required for visit tracking. Pass the same key used in db.rounds.game. */
  game: Game;
  /** Optional rules content (renders the bottom-left RULES button + overlay modal). */
  rules?: ReactNode;
  /**
   * Optional slot rendered at the top-left of the header strip — typically the
   * shared `<LobbyButton />`. Replaces the legacy minimalist "← lobby" link
   * when provided. Games that haven't been upgraded yet keep the old link.
   */
  lobbyButton?: ReactNode;
  /**
   * Optional slot rendered next to the bottom-left RULES button — typically
   * the shared `<OddsInfoBox />` summarising payouts. Only renders when the
   * `rules` prop is also provided (the rules button is the visual anchor).
   */
  oddsInfo?: ReactNode;
}

export default function GameShell({
  title,
  meta,
  recentItems,
  bettingPanel,
  children,
  game,
  rules,
  lobbyButton,
  oddsInfo,
}: Props): JSX.Element {
  useGameVisit(game);
  const [rulesOpen, setRulesOpen] = useState(false);
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        <section className="flex flex-1 flex-col items-center px-6 pt-7">
          <div className="mb-4 flex w-full max-w-[520px] items-center justify-between gap-3">
            {lobbyButton ?? (
              <Link to="/lobby" className="text-xs text-white/60 hover:text-white">
                ← lobby
              </Link>
            )}
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
      {rules !== undefined && (
        <>
          <RulesButton onClick={() => setRulesOpen(true)} />
          {oddsInfo !== undefined && (
            <div className="fixed bottom-4 left-[155px] z-30">{oddsInfo}</div>
          )}
          <RulesModal open={rulesOpen} title={title} onClose={() => setRulesOpen(false)}>
            {rules}
          </RulesModal>
        </>
      )}
    </div>
  );
}
