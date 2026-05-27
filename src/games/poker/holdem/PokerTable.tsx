import type { JSX } from 'react';
import type { PokerContext, HandResult } from './machine';
import Seat from './Seat';
import CommunityBoard from './CommunityBoard';
import BettingControls from './BettingControls';
import SessionBar from './SessionBar';
import ShowdownReveal, { type WinTier } from './ShowdownReveal';

interface Props {
  ctx: PokerContext;
  stateValue: string;
  /** Player-side win tier for the current hand. Drives the showdown stinger. */
  winTier: WinTier;
  /** Forwarded to ShowdownReveal — fires when the reveal animation finishes. */
  onRevealComplete: () => void;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: (amount: number) => void;
  onLeave: () => void;
}

/** Derive which seats hold the SB/BB for the current hand. */
function inferBlinds(ctx: PokerContext): { sbSeat: number | null; bbSeat: number | null } {
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

/** Board card indices that are in winning hands' best-5 */
function boardHighlightIndices(
  handResult: HandResult | null,
  board: PokerContext['board'],
): number[] {
  if (!handResult) return [];
  const best5Cards = new Set<string>();
  for (const w of handResult.winners) {
    if (w.handRank) {
      for (const c of w.handRank.best5) {
        best5Cards.add(`${c.rank}${c.suit}`);
      }
    }
  }
  return board.map((c, i) => (best5Cards.has(`${c.rank}${c.suit}`) ? i : -1)).filter((i) => i >= 0);
}

export default function PokerTable({
  ctx,
  stateValue,
  winTier,
  onRevealComplete,
  onFold,
  onCheck,
  onCall,
  onRaise,
  onLeave,
}: Props): JSX.Element {
  const { seats, buttonSeat, toActSeat, pot, board, street, currentBet, minRaise, handResult } =
    ctx;

  const playerSeat = seats.find((s) => s.seatId === 0)!;
  const aiSeats = seats.filter((s) => s.seatId !== 0 && s.status !== 'empty');

  const { sbSeat, bbSeat } = inferBlinds(ctx);

  const inBettingState = stateValue === 'betting';
  const isYourTurn = inBettingState && toActSeat === 0;

  const toCall = Math.max(0, currentBet - playerSeat.committedThisStreet);

  const isShowdown = stateValue === 'hand_complete' || stateValue === 'showdown';
  const highlightBoardIndices = boardHighlightIndices(handResult, board);

  const inHand =
    stateValue === 'betting' ||
    stateValue === 'posting_blinds' ||
    stateValue === 'advance_street' ||
    stateValue === 'showdown';

  return (
    <div className="flex flex-1 gap-4 text-ivory">
      {/* Main table area — oval-felt brass-edged backdrop */}
      <div className="flex flex-1 flex-col gap-4 rounded-[3rem] border border-brass/60 bg-felt-table-deep p-6">
        {/* AI seats row */}
        <div className="flex flex-wrap justify-center gap-3" data-ai-seats>
          {aiSeats.map((seat) => {
            // At showdown, show revealed cards face-up if they're in revealedHands
            const isRevealed =
              isShowdown &&
              handResult !== null &&
              handResult.revealedHands.some((rh) => rh.seatId === seat.seatId);
            const revealedEntry =
              isRevealed && handResult
                ? handResult.revealedHands.find((rh) => rh.seatId === seat.seatId)
                : null;
            const seatWithRevealedCards = revealedEntry
              ? { ...seat, holeCards: revealedEntry.holeCards }
              : seat;

            const isWinner = handResult?.winners.some((w) => w.seatId === seat.seatId) ?? false;

            return (
              <Seat
                key={seat.seatId}
                seat={seatWithRevealedCards}
                isButton={seat.seatId === buttonSeat}
                isSb={seat.seatId === sbSeat}
                isBb={seat.seatId === bbSeat}
                isActing={inBettingState && toActSeat === seat.seatId}
                {...(isRevealed ? { highlightCards: isWinner } : {})}
                position="top"
              />
            );
          })}
        </div>

        {/* Community board */}
        <div className="flex justify-center">
          <CommunityBoard
            board={board}
            street={street}
            pot={pot}
            {...(highlightBoardIndices.length > 0
              ? { highlightIndices: highlightBoardIndices }
              : {})}
          />
        </div>

        {/* Showdown reveal */}
        {isShowdown && handResult && (
          <div className="flex justify-center">
            <div className="w-full max-w-lg">
              <ShowdownReveal
                handResult={handResult}
                seats={seats}
                winTier={winTier}
                onRevealComplete={onRevealComplete}
              />
            </div>
          </div>
        )}

        {/* Player seat + betting controls */}
        <div className="flex flex-wrap items-end justify-center gap-4" data-player-area>
          <Seat
            seat={playerSeat}
            isButton={playerSeat.seatId === buttonSeat}
            isSb={playerSeat.seatId === sbSeat}
            isBb={playerSeat.seatId === bbSeat}
            isActing={isYourTurn}
            position="bottom"
          />
          <div className="w-60">
            <BettingControls
              toCall={toCall}
              minRaise={minRaise}
              stack={playerSeat.stack}
              pot={pot}
              isYourTurn={isYourTurn}
              onFold={onFold}
              onCheck={onCheck}
              onCall={onCall}
              onRaise={onRaise}
            />
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
