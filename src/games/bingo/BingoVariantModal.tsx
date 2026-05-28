import type { JSX } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function BingoVariantModal({ open, onClose }: Props): JSX.Element | null {
  const navigate = useNavigate();
  const reduceMotion = useEffectiveReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function go(variant: 'british' | 'american') {
    onClose();
    void navigate(`/play/bingo?variant=${variant}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      data-bingo-variant-modal
    >
      <motion.div
        initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={
          reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 22 }
        }
        className="w-full max-w-2xl rounded-lg border-2 border-brass bg-velvet-deep p-6 text-ivory shadow-gold-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-center font-display text-lg tracking-[0.18em] text-gold-bright">
          PICK YOUR BINGO STYLE
        </h2>
        <p
          className="mx-auto mb-4 max-w-md text-center text-xs leading-relaxed text-ivory/65"
          data-bingo-variant-subtitle
        >
          Two flavours, same buy-in. British 90-ball is a longer game with three escalating tiers;
          American 75-ball is faster with a free centre and a four-corners kicker.
        </p>
        <div
          className="grid grid-cols-2 gap-4 overflow-y-auto"
          style={{ maxHeight: '60vh' }}
          data-bingo-variant-body
        >
          <button
            type="button"
            onClick={() => go('british')}
            className="min-h-[44px] rounded-lg border-2 border-brass/50 bg-felt-table-deep p-6 text-center transition hover:border-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
            data-variant-choice="british"
          >
            <div className="mb-2 text-4xl">🇬🇧</div>
            <div className="font-display text-base tracking-[0.18em] text-gold-bright">
              BRITISH 90-BALL
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ivory/65">
              3&times;9 strip, 15 numbered cells. Line &rarr; double line &rarr; full house. Slower
              build, three pay tiers.
            </p>
          </button>
          <button
            type="button"
            onClick={() => go('american')}
            className="min-h-[44px] rounded-lg border-2 border-brass/50 bg-felt-table-deep p-6 text-center transition hover:border-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
            data-variant-choice="american"
          >
            <div className="mb-2 text-4xl">🇺🇸</div>
            <div className="font-display text-base tracking-[0.18em] text-gold-bright">
              AMERICAN 75-BALL
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ivory/65">
              5&times;5 grid with free centre. Line &rarr; four corners &rarr; blackout. Tighter
              card, faster swings.
            </p>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
