import { useEffect } from 'react';
import { BINGO_CONFIG, type BingoSpeed } from './logic';

export function useBingoBallCaller(options: {
  enabled: boolean;
  speed: BingoSpeed;
  onCall: () => void;
}): void {
  const { enabled, speed, onCall } = options;
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => onCall(), BINGO_CONFIG.CALL_SPEEDS[speed]);
    return () => clearInterval(id);
  }, [enabled, speed, onCall]);
}
