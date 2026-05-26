import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { evaluateLine, MAIN_PICKS, payoutFor } from '@/systems/lottery';
import type { LotteryDraw, LotteryLine } from '@/db';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import { useSound } from '@/systems/sound/useSound';

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
/** Match HeroSection's per-ball stagger so the modal → hero hand-off feels
 *  continuous (spec §4.4 "dramatic ball reveal"). */
const BALL_STAGGER_MS = 250;
const TOTAL_BALLS = MAIN_PICKS + 1;

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
  const reduce = useEffectiveReducedMotion();
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      data-purchase-reveal-modal
    >
      <div className="w-full max-w-md overflow-hidden rounded-lg border-2 border-brass bg-velvet-deep shadow-gold-glow">
        <header className="border-b border-brass/40 px-5 py-3">
          <h2 className="font-display text-sm tracking-[0.18em] text-gold-bright">
            TICKET PURCHASED
          </h2>
        </header>
        <div
          data-purchase-reveal-body
          className="max-h-[60vh] overflow-y-auto px-5 py-4 [mask-image:linear-gradient(to_bottom,transparent,#000_24px,#000_calc(100%-24px),transparent)]"
        >
          <ul className="space-y-2">
            {lines.map((line, i) => {
              const revealed = i < revealedCount;
              if (!line.isLuckyDip || revealed) {
                return (
                  <li
                    key={i}
                    className="rounded border border-brass/40 bg-felt-table-deep px-3 py-2 text-sm tabular-nums text-ivory"
                    data-revealed
                  >
                    {line.mainNumbers.join(' · ')} <span className="text-ivory/40">|</span>{' '}
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
                  className="rounded border border-brass/40 bg-felt-table-deep/70 px-3 py-2 text-sm text-ivory/40"
                  data-hidden
                >
                  🎰 LUCKY DIP …
                </li>
              );
            })}
          </ul>
        </div>
        <div className="border-t border-brass/40 px-5 py-3">
          <button
            type="button"
            disabled={!allRevealed}
            onClick={onClose}
            className="w-full rounded border border-brass bg-gold py-2 font-display text-xs tracking-[0.18em] text-velvet-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {allRevealed ? 'DONE' : 'REVEALING…'}
          </button>
        </div>
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
  reduce: boolean;
}): JSX.Element {
  const { play } = useSound();
  // Initialise from reduce so reduced-motion users see all balls immediately.
  const [revealedBalls, setRevealedBalls] = useState(() => (reduce ? TOTAL_BALLS : 0));

  useEffect(() => {
    if (reduce) {
      // One batched sound rather than 7 quick taps.
      play('ball.drop');
      return;
    }
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setRevealedBalls(n);
      play('ball.drop');
      if (n >= TOTAL_BALLS) clearInterval(id);
    }, BALL_STAGGER_MS);
    return () => clearInterval(id);
  }, [reduce, play]);

  const drawSet = new Set(draw.mainNumbers);
  const allBallsRevealed = revealedBalls >= TOTAL_BALLS;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      data-draw-reveal-modal
    >
      <div className="w-full max-w-lg overflow-hidden rounded-lg border-2 border-brass bg-velvet-deep shadow-gold-glow">
        <header className="border-b border-brass/40 px-5 py-3">
          <h2 className="font-display text-sm tracking-[0.18em] text-gold-bright">
            DRAW {draw.id}
          </h2>
          <p className="mt-0.5 text-xs text-ivory/50">
            Draw {drawIdx + 1} of {totalDraws}
          </p>
        </header>
        <div
          data-draw-reveal-body
          className="max-h-[60vh] overflow-y-auto px-5 py-4 [mask-image:linear-gradient(to_bottom,transparent,#000_24px,#000_calc(100%-24px),transparent)]"
        >
          <div
            className="mb-4 flex flex-wrap justify-center gap-2"
            role="list"
            aria-label="Draw balls"
          >
            {draw.mainNumbers.map((n, i) => (
              <Ball
                key={`m-${i}`}
                value={n}
                revealed={i < revealedBalls}
                color="main"
                index={i}
                reduce={reduce}
              />
            ))}
            <Ball
              value={draw.bonus}
              revealed={revealedBalls >= TOTAL_BALLS}
              color="bonus"
              index={MAIN_PICKS}
              reduce={reduce}
            />
          </div>
          {allBallsRevealed && userLines.length > 0 && (
            <ul className="space-y-1.5">
              {userLines.map((line) => {
                const tier = evaluateLine(line, {
                  mainNumbers: draw.mainNumbers,
                  bonus: draw.bonus,
                });
                const payout = payoutFor(tier);
                const reentry = tier === '2';
                return (
                  <li
                    key={line.id}
                    className="rounded border border-brass/40 bg-felt-table-deep px-3 py-2 text-xs"
                  >
                    <span className="tabular-nums">
                      {line.mainNumbers.map((n, i) => (
                        <span
                          key={`${line.id}-${i}`}
                          className={
                            drawSet.has(n)
                              ? 'rounded bg-gold px-1 text-velvet-deep'
                              : 'px-1 text-ivory/70'
                          }
                        >
                          {n}
                        </span>
                      ))}
                      <span className="ml-1 text-ivory/40">|</span>{' '}
                      <span
                        className={
                          line.bonusNumber === draw.bonus
                            ? 'rounded bg-jewel-magenta px-1 text-ivory'
                            : 'px-1 text-ivory/70'
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
            <p className="text-center text-xs text-ivory/50">No tickets for this draw.</p>
          )}
        </div>
        <div className="border-t border-brass/40 px-5 py-3">
          <button
            type="button"
            disabled={!allBallsRevealed}
            onClick={() => {
              if (isLast) onClose();
              else onNext();
            }}
            className="w-full rounded border border-brass bg-gold py-2 font-display text-xs tracking-[0.18em] text-velvet-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {allBallsRevealed ? (isLast ? 'DONE' : 'NEXT DRAW →') : 'REVEALING…'}
          </button>
        </div>
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
  const reduce = useEffectiveReducedMotion();
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
  index,
  reduce,
}: {
  value: number;
  revealed: boolean;
  color: 'main' | 'bonus';
  index: number;
  reduce: boolean;
}): JSX.Element {
  const isBonus = color === 'bonus';
  const chrome = isBonus
    ? 'bg-velvet-deep border-jewel-magenta text-gold-bright shadow-[0_0_14px_rgba(232,74,140,0.55)]'
    : 'bg-velvet-deep border-brass text-ivory shadow-[0_0_14px_rgba(212,175,55,0.45)]';
  const ariaLabel = isBonus
    ? revealed
      ? `Bonus ball ${value}`
      : 'Bonus ball pending'
    : revealed
      ? `Winning ball ${value}`
      : 'Winning ball pending';
  if (!revealed) {
    return (
      <span
        data-ball
        data-ball-color={color}
        role="listitem"
        aria-label={ariaLabel}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-brass/40 bg-felt-table-deep/70 text-ivory/40"
      >
        ?
      </span>
    );
  }
  return (
    <motion.span
      data-ball
      data-ball-revealed
      data-ball-color={color}
      role="listitem"
      aria-label={ariaLabel}
      initial={reduce ? false : { scale: 0.6, opacity: 0 }}
      animate={{ scale: [0.6, 1.05, 1], opacity: 1 }}
      transition={{
        duration: 0.4,
        delay: reduce ? 0 : index * 0,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={[
        'inline-flex h-12 w-12 items-center justify-center rounded-full border-2 font-display text-base tabular-nums',
        chrome,
      ].join(' ')}
    >
      {value}
    </motion.span>
  );
}
