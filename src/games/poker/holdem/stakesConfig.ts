export type StakesTier = 'low' | 'mid' | 'high';

export interface StakesConfig {
  sb: number;
  bb: number;
  label: string;
  minBuyIn: number;
  maxBuyIn: number;
  defaultBuyIn: number;
}

export const STAKES: Record<StakesTier, StakesConfig> = {
  low: { sb: 1, bb: 2, label: 'Low ($1/$2)', minBuyIn: 80, maxBuyIn: 200, defaultBuyIn: 100 },
  mid: { sb: 5, bb: 10, label: 'Mid ($5/$10)', minBuyIn: 400, maxBuyIn: 1_000, defaultBuyIn: 500 },
  high: {
    sb: 25,
    bb: 50,
    label: 'High ($25/$50)',
    minBuyIn: 2_000,
    maxBuyIn: 5_000,
    defaultBuyIn: 2_500,
  },
};
