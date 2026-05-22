import type { JSX } from 'react';
import type { CrapsContext } from './machine';
import { BET_TYPES } from './bets';
import type { ActiveBet } from './resolveRoll';
import BetSpot from './BetSpot';
import DiceDisplay from './DiceDisplay';
import PointPuck from './PointPuck';
import PropositionDrawer from './PropositionDrawer';

const PLACE_NUMBERS = [4, 5, 6, 8, 9, 10] as const;
const PLACE_LABELS: Record<number, string> = {
  4: '4',
  5: '5',
  6: 'SIX',
  8: '8',
  9: 'NINE',
  10: '10',
};

interface Props {
  ctx: CrapsContext;
  onPlace: (betId: string, betPoint?: number) => void;
  onRemove: (betId: string, betPoint?: number) => void;
  onRoll: () => void;
  canRoll: boolean;
}

function getBetsFor(bets: ActiveBet[], betId: string, betPoint?: number): ActiveBet[] {
  return bets.filter((b) =>
    betPoint !== undefined ? b.betId === betId && b.betPoint === betPoint : b.betId === betId,
  );
}

export default function CrapsTable({
  ctx,
  onPlace,
  onRemove,
  onRoll,
  canRoll,
}: Props): JSX.Element {
  const { phase, point, bets, lastRoll } = ctx;

  function canPlace(betId: string): boolean {
    const bt = BET_TYPES[betId];
    return bt ? bt.canPlace(phase, { point }) : false;
  }

  // Recent rolls log (from lastResolution context, but we show lastRoll simply)
  const rollTotal = lastRoll ? lastRoll.d1 + lastRoll.d2 : null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border-2 border-[#5a3a1a] bg-[#0d3823] p-3 shadow-2xl">
      {/* Row 1: Place numbers + puck */}
      <div className="flex gap-1.5">
        {/* Puck column */}
        <div className="flex w-12 flex-shrink-0 items-center justify-center">
          <PointPuck point={point} />
        </div>
        {/* Place number spots */}
        {PLACE_NUMBERS.map((num) => {
          const betId = `place-${num}`;
          const spotBets = getBetsFor(bets, betId);
          const isPoint = point === num;
          return (
            <div key={num} className="flex-1 relative">
              {isPoint && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                  <PointPuck point={point} />
                </div>
              )}
              <BetSpot
                betId={betId}
                label={PLACE_LABELS[num] ?? String(num)}
                chips={spotBets}
                canPlace={canPlace(betId)}
                onPlace={() => onPlace(betId)}
                onRemove={spotBets.length > 0 ? () => onRemove(betId) : undefined}
              />
            </div>
          );
        })}
      </div>

      {/* Row 2: COME band */}
      <div className="flex gap-1.5">
        <div className="flex-1">
          <BetSpot
            betId="come"
            label="Come"
            chips={getBetsFor(bets, 'come')}
            canPlace={canPlace('come')}
            onPlace={() => onPlace('come')}
          />
        </div>
        <div className="flex-1">
          <BetSpot
            betId="dont-come"
            label="Don't Come"
            chips={getBetsFor(bets, 'dont-come')}
            canPlace={canPlace('dont-come')}
            onPlace={() => onPlace('dont-come')}
          />
        </div>
      </div>

      {/* Row 3: Field + Proposition Drawer */}
      <div className="flex gap-1.5">
        <div className="w-1/3">
          <BetSpot
            betId="field"
            label="Field 2·3·4·9·10·11·12"
            chips={getBetsFor(bets, 'field')}
            canPlace={canPlace('field')}
            onPlace={() => onPlace('field')}
            onRemove={getBetsFor(bets, 'field').length > 0 ? () => onRemove('field') : undefined}
          />
        </div>
        <div className="flex-1">
          <PropositionDrawer
            phase={phase}
            point={point}
            bets={bets}
            onPlace={(betId) => onPlace(betId)}
            onRemove={(betId) => onRemove(betId)}
          />
        </div>
      </div>

      {/* Row 4: Pass / Don't Pass line */}
      <div className="flex gap-1.5">
        <div className="flex-1">
          <BetSpot
            betId="dont-pass"
            label="Don't Pass"
            chips={getBetsFor(bets, 'dont-pass')}
            canPlace={canPlace('dont-pass')}
            onPlace={() => onPlace('dont-pass')}
          />
        </div>
        <div className="flex-1">
          <BetSpot
            betId="pass"
            label="Pass Line"
            chips={getBetsFor(bets, 'pass')}
            canPlace={canPlace('pass')}
            onPlace={() => onPlace('pass')}
          />
        </div>
        <div className="flex w-24 items-center justify-center">
          <DiceDisplay roll={lastRoll} />
        </div>
      </div>

      {/* Row 5: Odds behind */}
      <div className="flex gap-1.5">
        <div className="flex-1">
          <BetSpot
            betId="odds-dont"
            label="Don't Odds"
            chips={getBetsFor(bets, 'odds-dont')}
            canPlace={canPlace('odds-dont')}
            onPlace={() => onPlace('odds-dont')}
            onRemove={
              getBetsFor(bets, 'odds-dont').length > 0 ? () => onRemove('odds-dont') : undefined
            }
          />
        </div>
        <div className="flex-1">
          <BetSpot
            betId="odds-pass"
            label="Pass Odds"
            chips={getBetsFor(bets, 'odds-pass')}
            canPlace={canPlace('odds-pass')}
            onPlace={() => onPlace('odds-pass')}
            onRemove={
              getBetsFor(bets, 'odds-pass').length > 0 ? () => onRemove('odds-pass') : undefined
            }
          />
        </div>
        <div className="flex w-24 flex-col items-center justify-center gap-1">
          {rollTotal !== null && (
            <span className="font-display text-xs text-white/60">
              Total: <span className="font-bold text-gold">{rollTotal}</span>
            </span>
          )}
          <button
            type="button"
            className="rounded bg-gold px-3 py-1.5 font-display text-xs tracking-widest text-felt-deep hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
            onClick={onRoll}
            disabled={!canRoll}
            data-roll-button
          >
            ROLL
          </button>
        </div>
      </div>

      {/* Phase indicator */}
      <div className="flex items-center justify-between px-1 pt-1">
        <span className="font-display text-[10px] uppercase tracking-wider text-white/40">
          {phase === 'come-out' ? 'Come-Out Roll' : `Point: ${point ?? '—'}`}
        </span>
      </div>
    </div>
  );
}
