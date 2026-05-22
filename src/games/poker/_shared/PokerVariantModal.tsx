import type { JSX } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';

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
        className="bg-felt-deep border-2 border-gold rounded-lg p-6 max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg tracking-wider text-gold-bright mb-2 text-center">
          PICK YOUR POKER VARIANT
        </h2>
        <p className="text-xs text-white/60 mb-4 text-center">Choose a variant to begin.</p>
        <div className="grid grid-cols-3 gap-4">
          {/* Texas Hold'em — active */}
          <button
            type="button"
            onClick={goHoldem}
            className="rounded-lg border-2 border-white/20 bg-felt-deep/70 p-6 text-center hover:border-gold transition"
            data-variant-choice="holdem"
          >
            <div className="text-4xl mb-2">♠️</div>
            <div className="font-display text-base text-gold-bright tracking-wider">
              TEXAS HOLD&apos;EM
            </div>
            <p className="text-[11px] text-white/60 mt-2">
              No-Limit Hold&apos;em. 2-6 players, tiered stakes.
            </p>
          </button>

          {/* Five-Card Draw — active */}
          <button
            type="button"
            onClick={goFiveCardDraw}
            className="rounded-lg border-2 border-white/20 bg-felt-deep/70 p-6 text-center hover:border-gold transition"
            data-variant-choice="five-card-draw"
          >
            <div className="text-4xl mb-2">🂡</div>
            <div className="font-display text-base text-gold-bright tracking-wider">
              FIVE-CARD DRAW
            </div>
            <p className="text-[11px] text-white/60 mt-2">
              Classic draw poker. Single draw, cap 3.
            </p>
          </button>

          {/* Omaha — active */}
          <button
            type="button"
            onClick={goOmaha}
            className="rounded-lg border-2 border-white/20 bg-felt-deep/70 p-6 text-center hover:border-gold transition"
            data-variant-choice="omaha"
          >
            <div className="text-4xl mb-2">🃏</div>
            <div className="font-display text-base text-gold-bright tracking-wider">OMAHA</div>
            <p className="text-[11px] text-white/60 mt-2">
              No-Limit Omaha. 4 hole cards, use exactly 2+3.
            </p>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
