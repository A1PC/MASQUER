import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { evaluateLine, payoutFor } from '@/systems/lottery';
import type { LotteryDraw, LotteryLine } from '@/db';

export interface PurchaseRevealLine {
  isLuckyDip: boolean;
  mainNumbers: number[];
  bonusNumber: number;
}

interface PurchaseModeProps {
  mode: 'purchase';
  open: boolean;
  lines: PurchaseRevealLine[];
  onClose: () => void;
}

interface DrawModeProps {
  mode: 'draw';
  open: boolean;
  draws: Array<{ draw: LotteryDraw; userLines: LotteryLine[] }>;
  onClose: () => void;
}

type Props = PurchaseModeProps | DrawModeProps;

const FLIP_GAP_MS = 350;

/**
 * Inner modal — rendered only when open, so it always mounts fresh.
 * Receives the same props but is guaranteed a clean useState(0) on each mount.
 */
function PurchaseRevealContent({
  lines,
  onClose,
}: {
  lines: PurchaseRevealLine[];
  onClose: () => void;
}): JSX.Element {
  const reduce = useReducedMotion();
  // Counts how many lucky-dip lines have been sequentially revealed.
  // Only ever mutated inside an interval callback — never synchronously in an
  // effect — satisfying the react-hooks/set-state-in-effect rule.
  const [dipRevealCount, setDipRevealCount] = useState(0);

  const manualCount = lines.filter((l) => !l.isLuckyDip).length;
  const luckyDipCount = lines.length - manualCount;

  useEffect(() => {
    if (reduce || luckyDipCount === 0) return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setDipRevealCount(n);
      if (n >= luckyDipCount) clearInterval(id);
    }, FLIP_GAP_MS);
    return () => clearInterval(id);
  }, [luckyDipCount, reduce]);

  // Under reduced motion all lucky-dip lines appear instantly.
  const revealedDips = reduce ? luckyDipCount : dipRevealCount;
  const revealedCount = manualCount + revealedDips;
  const allRevealed = revealedCount >= lines.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      data-purchase-reveal-modal
    >
      <div className="max-w-md rounded-lg border border-gold bg-felt-deep p-6">
        <h2 className="mb-3 font-display text-sm tracking-wider text-gold-bright">
          TICKET PURCHASED
        </h2>
        <ul className="space-y-2">
          {lines.map((line, i) => {
            const revealed = i < revealedCount;
            if (!line.isLuckyDip || revealed) {
              return (
                <li
                  key={i}
                  className="rounded border border-white/15 bg-black/30 px-3 py-2 text-sm tabular-nums"
                  data-revealed
                >
                  {line.mainNumbers.join(' · ')} <span className="text-white/40">|</span>{' '}
                  {line.bonusNumber}
                  {line.isLuckyDip && (
                    <span className="ml-2 text-[10px] text-gold-bright">LUCKY DIP</span>
                  )}
                </li>
              );
            }
            return (
              <li
                key={i}
                className="rounded border border-white/15 bg-black/30 px-3 py-2 text-sm text-white/40"
                data-hidden
              >
                🎰 LUCKY DIP …
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          disabled={!allRevealed}
          onClick={onClose}
          className="mt-4 w-full rounded border border-gold bg-gold py-2 font-display text-xs tracking-wider text-felt-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {allRevealed ? 'DONE' : 'REVEALING…'}
        </button>
      </div>
    </motion.div>
  );
}

export default function DrawAnimationModal(props: Props): JSX.Element {
  if (props.mode === 'purchase') return <PurchaseMode {...props} />;
  return <DrawMode {...props} />;
}

function PurchaseMode(props: PurchaseModeProps): JSX.Element {
  if (!props.open) return <></>;

  return (
    <AnimatePresence>
      <PurchaseRevealContent lines={props.lines} onClose={props.onClose} />
    </AnimatePresence>
  );
}

const BALL_GAP_MS = 250;

/**
 * Inner component for a single draw — always mounts fresh (via key={drawIdx}),
 * so useState(0) gives a clean start without synchronous setState in an effect.
 * Ball reveal only ever calls setRevealedBalls inside the interval callback,
 * satisfying the react-hooks/set-state-in-effect rule.
 */
function DrawRevealContent({
  draw,
  userLines,
  drawIdx,
  totalDraws,
  onNext,
  onClose,
  isLast,
  reduce,
}: {
  draw: LotteryDraw;
  userLines: LotteryLine[];
  drawIdx: number;
  totalDraws: number;
  onNext: () => void;
  onClose: () => void;
  isLast: boolean;
  reduce: boolean | null;
}): JSX.Element {
  // Initialise from reduce so reduced-motion users see all balls immediately.
  const [revealedBalls, setRevealedBalls] = useState(() => (reduce ? 6 : 0));

  useEffect(() => {
    if (reduce) return; // already set to 6 via useState initialiser
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setRevealedBalls(n);
      if (n >= 6) clearInterval(id);
    }, BALL_GAP_MS);
    return () => clearInterval(id);
  }, [reduce]);

  const drawSet = new Set(draw.mainNumbers);
  const allBallsRevealed = revealedBalls >= 6;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      data-draw-reveal-modal
    >
      <div className="max-w-lg rounded-lg border border-gold bg-felt-deep p-6">
        <h2 className="mb-1 font-display text-sm tracking-wider text-gold-bright">
          DRAW {draw.id}
        </h2>
        <p className="mb-3 text-xs text-white/50">
          Draw {drawIdx + 1} of {totalDraws}
        </p>
        <div className="mb-4 flex gap-2">
          {draw.mainNumbers.map((n, i) => (
            <Ball key={i} value={n} revealed={i < revealedBalls} color="gold" />
          ))}
          <Ball value={draw.bonus} revealed={revealedBalls >= 6} color="magenta" />
        </div>
        {allBallsRevealed && userLines.length > 0 && (
          <ul className="mb-4 space-y-1.5">
            {userLines.map((line) => {
              const tier = evaluateLine(line, { mainNumbers: draw.mainNumbers, bonus: draw.bonus });
              const payout = payoutFor(tier);
              const reentry = tier === '2';
              return (
                <li
                  key={line.id}
                  className="rounded border border-white/15 bg-black/30 px-3 py-2 text-xs"
                >
                  <span className="tabular-nums">
                    {line.mainNumbers.map((n) => (
                      <span
                        key={n}
                        className={
                          drawSet.has(n)
                            ? 'rounded bg-gold px-1 text-felt-deep'
                            : 'px-1 text-white/70'
                        }
                      >
                        {n}
                      </span>
                    ))}
                    <span className="ml-1 text-white/40">|</span>{' '}
                    <span
                      className={
                        line.bonusNumber === draw.bonus
                          ? 'rounded bg-neon-magenta px-1 text-felt-deep'
                          : 'px-1 text-white/70'
                      }
                    >
                      {line.bonusNumber}
                    </span>
                  </span>
                  {tier && (
                    <span className="ml-2 text-gold-bright">
                      {reentry
                        ? 'Match 2 — Free entry for next draw!'
                        : `${tier} → +${payout.toLocaleString()} chips`}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {allBallsRevealed && userLines.length === 0 && (
          <p className="mb-4 text-center text-xs text-white/50">No tickets for this draw.</p>
        )}
        <button
          type="button"
          disabled={!allBallsRevealed}
          onClick={() => {
            if (isLast) onClose();
            else onNext();
          }}
          className="w-full rounded border border-gold bg-gold py-2 font-display text-xs tracking-wider text-felt-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {allBallsRevealed ? (isLast ? 'DONE' : 'NEXT DRAW →') : 'REVEALING…'}
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Inner modal for draw mode — rendered only when open, so drawIdx always
 * starts at 0 on mount without needing a synchronous setState-in-effect.
 */
function DrawModeContent({
  draws,
  onClose,
}: {
  draws: Array<{ draw: LotteryDraw; userLines: LotteryLine[] }>;
  onClose: () => void;
}): JSX.Element {
  const reduce = useReducedMotion();
  const [drawIdx, setDrawIdx] = useState(0);

  const current = draws[drawIdx];
  if (!current) return <></>;
  const { draw, userLines } = current;
  const isLast = drawIdx === draws.length - 1;

  return (
    <AnimatePresence>
      <DrawRevealContent
        key={drawIdx}
        draw={draw}
        userLines={userLines}
        drawIdx={drawIdx}
        totalDraws={draws.length}
        onNext={() => setDrawIdx((i) => i + 1)}
        onClose={onClose}
        isLast={isLast}
        reduce={reduce}
      />
    </AnimatePresence>
  );
}

function DrawMode(props: DrawModeProps): JSX.Element {
  if (!props.open || props.draws.length === 0) return <></>;
  return <DrawModeContent draws={props.draws} onClose={props.onClose} />;
}

function Ball({
  value,
  revealed,
  color,
}: {
  value: number;
  revealed: boolean;
  color: 'gold' | 'magenta';
}): JSX.Element {
  const bg = color === 'gold' ? 'bg-gold' : 'bg-neon-magenta';
  return (
    <span
      data-ball
      data-ball-revealed={revealed || undefined}
      className={
        revealed
          ? `flex h-12 w-12 items-center justify-center rounded-full ${bg} font-display text-base tabular-nums text-felt-deep shadow-[0_0_12px_rgba(212,175,55,0.5)]`
          : 'flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/30'
      }
    >
      {revealed ? value : '?'}
    </span>
  );
}
