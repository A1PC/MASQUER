import type { JSX } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';
import MaskMark from '@/components/brand/MaskMark';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PokerVariantModal({ open, onClose }: Props): JSX.Element | null {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function goHoldem() {
    onClose();
    void navigate('/play/poker/holdem');
  }

  function goFiveCardDraw() {
    onClose();
    void navigate('/play/poker/five-card-draw');
  }

  function goOmaha() {
    onClose();
    void navigate('/play/poker/omaha');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      data-poker-variant-modal
    >
      <motion.div
        initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={
          reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 22 }
        }
        className="w-full max-w-2xl rounded-lg border-2 border-brass bg-velvet-deep p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex flex-col items-center gap-2">
          <MaskMark variant="simple" size={32} title="MASQUER mask" />
          <h2 className="font-display text-lg tracking-[0.18em] text-gold-bright">
            PICK YOUR POKER VARIANT
          </h2>
          <p className="text-xs text-ivory/55">Choose a variant to begin.</p>
        </header>
        <div className="grid grid-cols-3 gap-4">
          {/* Texas Hold'em */}
          <button
            type="button"
            onClick={goHoldem}
            className="rounded-md border border-brass/60 bg-velvet p-6 text-center transition hover:border-brass hover:bg-velvet-deep"
            data-variant-choice="holdem"
          >
            <div className="mb-2 text-4xl text-gold-bright">♠</div>
            <div className="font-display text-base tracking-[0.18em] text-gold-bright">
              TEXAS HOLD&apos;EM
            </div>
            <p className="mt-2 text-[11px] text-ivory/70">
              No-Limit Hold&apos;em. 2-6 players, tiered stakes.
            </p>
          </button>

          {/* Five-Card Draw */}
          <button
            type="button"
            onClick={goFiveCardDraw}
            className="rounded-md border border-brass/60 bg-velvet p-6 text-center transition hover:border-brass hover:bg-velvet-deep"
            data-variant-choice="five-card-draw"
          >
            <div className="mb-2 text-4xl text-gold-bright">♥</div>
            <div className="font-display text-base tracking-[0.18em] text-gold-bright">
              FIVE-CARD DRAW
            </div>
            <p className="mt-2 text-[11px] text-ivory/70">
              Classic draw poker. Single draw, cap 3.
            </p>
          </button>

          {/* Omaha */}
          <button
            type="button"
            onClick={goOmaha}
            className="rounded-md border border-brass/60 bg-velvet p-6 text-center transition hover:border-brass hover:bg-velvet-deep"
            data-variant-choice="omaha"
          >
            <div className="mb-2 text-4xl text-gold-bright">♦</div>
            <div className="font-display text-base tracking-[0.18em] text-gold-bright">OMAHA</div>
            <p className="mt-2 text-[11px] text-ivory/70">
              No-Limit Omaha. 4 hole cards, use exactly 2+3.
            </p>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
