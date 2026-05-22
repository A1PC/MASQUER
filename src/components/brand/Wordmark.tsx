import type { JSX } from 'react';
import MaskMark from './MaskMark';

interface WordmarkProps {
  /** mask emblem pixel size; the word scales alongside */
  maskSize?: number;
  className?: string;
}

export default function Wordmark({ maskSize = 28, className }: WordmarkProps): JSX.Element {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <MaskMark size={maskSize} variant="simple" />
      <span
        className="font-display tracking-[0.18em] text-gold"
        style={{ fontSize: maskSize * 0.62 }}
      >
        MASQUER
      </span>
    </span>
  );
}
