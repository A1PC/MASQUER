import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

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

type Props = PurchaseModeProps;

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
  if (!props.open) return <></>;

  return (
    <AnimatePresence>
      <PurchaseRevealContent lines={props.lines} onClose={props.onClose} />
    </AnimatePresence>
  );
}
