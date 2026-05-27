import type { JSX } from 'react';
import type { DrawContext } from './machine';
import DrawSeat from './DrawSeat';
import DiscardControls from './DiscardControls';
import BettingControls from '../holdem/BettingControls';
import SessionBar from '../holdem/SessionBar';
import ShowdownReveal, { type WinTier } from '../holdem/ShowdownReveal';
import type { SeatState } from '../holdem/machine';
import { evaluateBest5 } from '../_shared/handEvaluator';
import type { HandRank } from '../_shared/types';

interface Props {
  ctx: DrawContext;
  stateValue: string;
  /** Player-side win tier for the current hand. Drives the showdown stinger. */
  winTier: WinTier;
  /** Forwarded to ShowdownReveal — fires when the reveal animation finishes. */
  onRevealComplete: () => void;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: (amount: number) => void;
  onDraw: (indices: number[]) => void;
  onLeave: () => void;
}

/** Derive which seats hold the SB/BB for the current hand. */
function inferBlinds(ctx: DrawContext): { sbSeat: number | null; bbSeat: number | null } {
  const eligibleSeats = ctx.seats.filter((s) => s.status !== 'busted' && s.status !== 'empty');
  if (eligibleSeats.length < 2) return { sbSeat: null, bbSeat: null };

  const committed = eligibleSeats
    .filter((s) => s.committedThisHand > 0)
    .sort((a, b) => a.committedThisHand - b.committedThisHand);

  if (committed.length === 0) return { sbSeat: null, bbSeat: null };
  if (committed.length === 1) return { sbSeat: committed[0]!.seatId, bbSeat: null };

  return {
    sbSeat: committed[0]!.seatId,
    bbSeat: committed[committed.length - 1]!.seatId,
  };
}

/** Derive "drew N" / "stood pat" label from discardCount. */
function drewLabel(seat: DrawContext['seats'][number]): string | undefined {
  if (!seat.hasDrawn) return undefined;
  if (seat.discardCount === 0) return 'stood pat';
  return `drew ${seat.discardCount}`;
}

export default function DrawTable({
  ctx,
  stateValue,
  winTier,
  onRevealComplete,
  onFold,
  onCheck,
  onCall,
  onRaise,
  onDraw,
  onLeave,
}: Props): JSX.Element {
  const { seats, buttonSeat, toActSeat, pot, street, currentBet, minRaise, handResult } = ctx;

  const playerSeat = seats.find((s) => s.seatId === 0)!;
  const aiSeats = seats.filter((s) => s.seatId !== 0 && s.status !== 'empty');

  const { sbSeat, bbSeat } = inferBlinds(ctx);

  const inBettingState = stateValue === 'bet_predraw' || stateValue === 'bet_postdraw';
  const inDrawingState = stateValue === 'drawing';
  const isYourBettingTurn = inBettingState && toActSeat === 0;
  const isYourDrawTurn = inDrawingState && toActSeat === 0;

  const toCall = Math.max(0, currentBet - playerSeat.committedThisStreet);

  const isShowdown = stateValue === 'hand_complete' || stateValue === 'showdown';
  // Post-hand window — covers true showdowns, fold-outs, and the leave-grace
  // period that lingers in `idle` with a populated handResult. Used to reveal
  // every AI's 5-card hand (so the player can see what they were up against)
  // without leaking any info while a hand is in progress. Five-Card Draw has
  // no community board — evaluateBest5(holeCards) gets the ranking directly.
  const isPostHand = isShowdown || (stateValue === 'idle' && handResult !== null);

  const inHand =
    stateValue === 'bet_predraw' ||
    stateValue === 'drawing' ||
    stateValue === 'bet_postdraw' ||
    stateValue === 'posting_blinds' ||
    stateValue === 'showdown';

  // Cast DrawSeatState[] → SeatState[] for ShowdownReveal (structurally compatible)
  const holdemSeats = seats as unknown as SeatState[];

  return (
    <div className="flex flex-1 gap-4 text-ivory">
      {/* Main table area — oval-felt brass-edged backdrop */}
      <div className="flex flex-1 flex-col gap-4 rounded-[3rem] border border-brass/60 bg-felt-table-deep p-6">
        {/* AI seats row */}
        <div className="flex flex-wrap justify-center gap-3" data-ai-seats>
          {aiSeats.map((seat) => {
            // At showdown the machine populates `revealedHands` with the cards
            // already known to the showdown logic. Prefer that source when
            // present (it's the canonical reveal data).
            const revealedEntry =
              isShowdown && handResult
                ? handResult.revealedHands.find((rh) => rh.seatId === seat.seatId)
                : null;
            const seatWithRevealedCards = revealedEntry
              ? { ...seat, holeCards: revealedEntry.holeCards }
              : seat;

            const isWinner = handResult?.winners.some((w) => w.seatId === seat.seatId) ?? false;

            // Post-hand: reveal every AI's 5-card hand (machine-revealed OR not)
            // so the player can see what every opponent had — including the
            // ones that folded. During play this stays false, so opponents'
            // cards remain face-down and no hand-type info leaks.
            const revealHoleCards = isPostHand && seat.holeCards.length === 5;

            // Five-Card Draw: no community board — evaluate the 5 hole cards
            // directly. Showdown-revealed entries that already carry a handRank
            // (machine-computed) take precedence.
            const handRank: HandRank | undefined = revealHoleCards
              ? (revealedEntry?.handRank ?? evaluateBest5(seat.holeCards))
              : undefined;

            const label = drewLabel(seat);
            return (
              <DrawSeat
                key={seat.seatId}
                seat={seatWithRevealedCards}
                isButton={seat.seatId === buttonSeat}
                isSb={seat.seatId === sbSeat}
                isBb={seat.seatId === bbSeat}
                isActing={inBettingState && toActSeat === seat.seatId}
                revealHoleCards={revealHoleCards}
                {...(revealedEntry ? { highlightCards: isWinner } : {})}
                {...(handRank ? { handRank } : {})}
                {...(label !== undefined ? { drewLabel: label } : {})}
                position="top"
              />
            );
          })}
        </div>

        {/* Pot display (no community board for five-card draw) */}
        <div className="flex justify-center">
          <div className="flex flex-col items-center gap-1 rounded-lg border border-brass/40 bg-velvet-deep/70 px-6 py-3">
            <span className="font-display text-[10px] tracking-[0.18em] text-ivory/55">
              {street === 'predraw' ? 'PRE-DRAW' : street === 'draw' ? 'DRAW' : 'POST-DRAW'}
            </span>
            <span className="font-mono text-2xl tabular-nums text-gold-bright" data-pot>
              {pot.toLocaleString()}
            </span>
            <span className="text-[9px] tracking-[0.18em] text-ivory/55">POT</span>
          </div>
        </div>

        {/* Showdown reveal */}
        {isShowdown && handResult && (
          <div className="flex justify-center">
            <div className="w-full max-w-lg">
              <ShowdownReveal
                handResult={handResult}
                seats={holdemSeats}
                winTier={winTier}
                onRevealComplete={onRevealComplete}
              />
            </div>
          </div>
        )}

        {/* Player seat + controls */}
        <div className="flex flex-wrap items-end justify-center gap-4" data-player-area>
          <DrawSeat
            seat={playerSeat}
            isButton={playerSeat.seatId === buttonSeat}
            isSb={playerSeat.seatId === sbSeat}
            isBb={playerSeat.seatId === bbSeat}
            isActing={isYourBettingTurn}
            position="bottom"
            {...(drewLabel(playerSeat) !== undefined ? { drewLabel: drewLabel(playerSeat)! } : {})}
          />
          <div className="w-60">
            {isYourDrawTurn ? (
              <DiscardControls holeCards={playerSeat.holeCards} onDraw={onDraw} />
            ) : inDrawingState && !isYourDrawTurn ? (
              // Waiting for AI to draw
              <div className="flex flex-col items-center gap-2 rounded-lg border border-brass/40 bg-velvet-deep/70 p-3">
                <span className="font-display text-xs tracking-[0.18em] text-ivory/55">
                  DRAW PHASE
                </span>
                {playerSeat.hasDrawn && playerSeat.holeCards.length >= 5 && (
                  <DiscardControls holeCards={playerSeat.holeCards} onDraw={onDraw} disabled />
                )}
              </div>
            ) : (
              <BettingControls
                toCall={toCall}
                minRaise={minRaise}
                stack={playerSeat.stack}
                pot={pot}
                isYourTurn={isYourBettingTurn}
                onFold={onFold}
                onCheck={onCheck}
                onCall={onCall}
                onRaise={onRaise}
              />
            )}
          </div>
        </div>
      </div>

      {/* Session bar — right rail */}
      <aside className="w-44 shrink-0">
        <SessionBar
          stack={playerSeat.stack}
          totalBoughtIn={ctx.totalBoughtIn}
          handsPlayed={ctx.handsPlayed}
          inHand={inHand}
          onLeave={onLeave}
        />
      </aside>
    </div>
  );
}
