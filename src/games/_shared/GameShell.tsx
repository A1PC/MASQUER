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
  /**
   * Short caption shown next to the title for legacy (non-upgraded) games.
   * Suppressed automatically when `oddsInfo` is provided, since the
   * OddsInfoBox at the top-right replaces it.
   */
  meta?: string;
  recentItems?: RecentResultItem[];
  bettingPanel: ReactNode;
  children: ReactNode;
  /** Required for visit tracking. Pass the same key used in db.rounds.game. */
  game: Game;
  /** Optional rules content (renders the bottom-left RULES button + overlay modal). */
  rules?: ReactNode;
  /**
   * Optional slot rendered absolutely at the top-LEFT of the game section —
   * typically the shared `<LobbyButton />`. Games that haven't been upgraded
   * yet fall back to a minimalist "← lobby" text link in the same position.
   */
  lobbyButton?: ReactNode;
  /**
   * Optional slot rendered absolutely at the top-RIGHT of the game section —
   * typically the shared `<OddsInfoBox />` summarising payouts. Sits inside
   * the section (not over the recent-results sidebar). When provided, the
   * `meta` caption is suppressed.
   */
  oddsInfo?: ReactNode;
  /**
   * Optional listener called whenever the rules-modal open state changes.
   * Used by games with a betting countdown (Roulette, Phase 15 #6) to pause
   * the timer while the player reads the rules and resume on close. No-op
   * for games that don't care.
   */
  onRulesOpenChange?: (open: boolean) => void;
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
  onRulesOpenChange,
}: Props): JSX.Element {
  useGameVisit(game);
  const [rulesOpen, setRulesOpenState] = useState(false);
  const setRulesOpen = (next: boolean): void => {
    setRulesOpenState(next);
    if (onRulesOpenChange) onRulesOpenChange(next);
  };
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        <section className="relative flex flex-1 flex-col items-center px-6 pt-7">
          <div className="pointer-events-none absolute left-4 top-4 z-20">
            <div className="pointer-events-auto">
              {lobbyButton ?? (
                <Link to="/lobby" className="text-xs text-white/60 hover:text-white">
                  ← lobby
                </Link>
              )}
            </div>
          </div>
          {oddsInfo !== undefined && (
            <div className="pointer-events-none absolute right-4 top-4 z-20">
              <div className="pointer-events-auto">{oddsInfo}</div>
            </div>
          )}
          <div className="mb-4 flex w-full max-w-[520px] items-baseline justify-center gap-3">
            <h1 className="font-display text-2xl tracking-wider text-gold-bright">{title}</h1>
            {meta !== undefined && oddsInfo === undefined && (
              <span className="text-xs text-white/50">{meta}</span>
            )}
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
          <RulesModal open={rulesOpen} title={title} onClose={() => setRulesOpen(false)}>
            {rules}
          </RulesModal>
        </>
      )}
    </div>
  );
}
