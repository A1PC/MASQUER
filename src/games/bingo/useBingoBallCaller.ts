import { useEffect } from 'react';
import { CALL_SPEEDS, type BingoSpeed } from './logic';

export function useBingoBallCaller(options: {
  enabled: boolean;
  speed: BingoSpeed;
  onCall: () => void;
}): void {
  const { enabled, speed, onCall } = options;
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => onCall(), CALL_SPEEDS[speed]);
    return () => clearInterval(id);
  }, [enabled, speed, onCall]);
}
