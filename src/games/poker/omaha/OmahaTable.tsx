import type { JSX } from 'react';
import type { OmahaContext, HandResult } from './machine';
import OmahaSeat from './OmahaSeat';
import CommunityBoard from '../holdem/CommunityBoard';
import BettingControls from '../holdem/BettingControls';
import SessionBar from '../holdem/SessionBar';
import ShowdownReveal, { type WinTier } from '../holdem/ShowdownReveal';
import type { SeatState } from '../holdem/machine';
import { evaluateFrom } from '../_shared/handEvaluator';
import type { HandRank } from '../_shared/types';

interface Props {
  ctx: OmahaContext;
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

/** Derive which seats hold the SB/BB for the current hand.
 *  Infer from committedThisHand early in the hand: smallest non-zero = SB. */
function inferBlinds(ctx: OmahaContext): { sbSeat: number | null; bbSeat: number | null } {
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
  board: OmahaContext['board'],
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

export default function OmahaTable({
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
  // Post-hand window — covers true showdowns, fold-outs, and the leave-grace
  // period that lingers in `idle` with a populated handResult. Used to reveal
  // every AI's 4 hole cards (so the player can see what they were up against)
  // without leaking any info while a hand is in progress.
  const isPostHand = isShowdown || (stateValue === 'idle' && handResult !== null);
  const highlightBoardIndices = boardHighlightIndices(handResult, board);

  const inHand =
    stateValue === 'betting' ||
    stateValue === 'posting_blinds' ||
    stateValue === 'advance_street' ||
    stateValue === 'showdown';

  // Cast OmahaSeatState[] → SeatState[] for ShowdownReveal (structurally compatible).
  // ShowdownReveal is generic over revealedHands.holeCards.length — 4-card hands render fine.
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

            // Post-hand: reveal every AI's 4 hole cards (machine-revealed OR not)
            // so the player can see what every opponent had — including the
            // ones that folded. During play this stays false, so opponents'
            // cards remain face-down and no hand-type info leaks.
            const revealHoleCards = isPostHand && seat.holeCards.length === 4;

            // Omaha rule: must use exactly 2 of 4 hole cards + exactly 3 of 5
            // board cards. evaluateFrom(holeCards, board, 'omaha') enforces this;
            // do NOT use evaluateBest5([...holeCards, ...board]) — that would
            // allow 0/1/3/4 hole cards which is illegal in Omaha. Pre-river
            // fold-outs leave the board incomplete → skip the category.
            // Showdown-revealed entries that already carry a handRank
            // (machine-computed) take precedence.
            const handRank: HandRank | undefined = revealHoleCards
              ? (revealedEntry?.handRank ??
                (board.length === 5 ? evaluateFrom(seat.holeCards, board, 'omaha') : undefined))
              : undefined;

            return (
              <OmahaSeat
                key={seat.seatId}
                seat={seatWithRevealedCards}
                isButton={seat.seatId === buttonSeat}
                isSb={seat.seatId === sbSeat}
                isBb={seat.seatId === bbSeat}
                isActing={inBettingState && toActSeat === seat.seatId}
                revealHoleCards={revealHoleCards}
                {...(revealedEntry ? { highlightCards: isWinner } : {})}
                {...(handRank ? { handRank } : {})}
                position="top"
              />
            );
          })}
        </div>

        {/* Community board — imported from holdem/ (variant-agnostic) */}
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

        {/* Showdown reveal — ShowdownReveal is generic: maps revealedHands.holeCards.
            It handles 4-card hands without modification (renders all items in the array). */}
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

        {/* Player seat + betting controls */}
        <div className="flex flex-wrap items-end justify-center gap-4" data-player-area>
          <OmahaSeat
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
