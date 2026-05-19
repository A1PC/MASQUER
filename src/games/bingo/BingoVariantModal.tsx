import type { JSX } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function BingoVariantModal({ open, onClose }: Props): JSX.Element | null {
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
        className="bg-felt-deep border-2 border-gold rounded-lg p-6 max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg tracking-wider text-gold-bright mb-2 text-center">
          PICK YOUR BINGO STYLE
        </h2>
        <p className="text-xs text-white/60 mb-4 text-center">Choose a variant to begin.</p>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => go('british')}
            className="rounded-lg border-2 border-white/20 bg-felt-deep/70 p-6 text-center hover:border-gold transition"
            data-variant-choice="british"
          >
            <div className="text-4xl mb-2">🇬🇧</div>
            <div className="font-display text-base text-gold-bright tracking-wider">
              BRITISH 90-BALL
            </div>
            <p className="text-[11px] text-white/60 mt-2">
              3×9 cards. Line → two lines → full house.
            </p>
          </button>
          <button
            type="button"
            onClick={() => go('american')}
            className="rounded-lg border-2 border-white/20 bg-felt-deep/70 p-6 text-center hover:border-gold transition"
            data-variant-choice="american"
          >
            <div className="text-4xl mb-2">🇺🇸</div>
            <div className="font-display text-base text-gold-bright tracking-wider">
              AMERICAN 75-BALL
            </div>
            <p className="text-[11px] text-white/60 mt-2">
              5×5 cards with free centre. Line → four corners → blackout.
            </p>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
