import { ROULETTE_CONFIG, type ChipDenomination } from './config';

export function breakdown(amount: number): ChipDenomination[] {
  if (!Number.isInteger(amount) || amount <= 0) return [];
  const denoms = [...ROULETTE_CONFIG.CHIP_DENOMINATIONS].sort((a, b) => b - a);
  const result: ChipDenomination[] = [];
  let remaining = amount;
  for (const d of denoms) {
    while (remaining >= d) {
      result.push(d);
      remaining -= d;
    }
  }
  return result;
}
