export type StakesTier = 'low' | 'mid' | 'high';

export interface StakesConfig {
  tier: StakesTier;
  label: string;
  tableMin: number; // minimum per bet
  tableMax: number; // maximum per bet
  buyInMin: number;
  buyInMax: number;
  oddsMultiple: number; // odds capped at this × the line bet (default 3)
  chips: number[]; // chip-tray denominations for this tier
}

export const CRAPS_STAKES: Record<StakesTier, StakesConfig> = {
  low: {
    tier: 'low',
    label: 'Low',
    tableMin: 10,
    tableMax: 500,
    buyInMin: 200,
    buyInMax: 1000,
    oddsMultiple: 3,
    chips: [10, 25, 100],
  },
  mid: {
    tier: 'mid',
    label: 'Mid',
    tableMin: 50,
    tableMax: 2500,
    buyInMin: 1000,
    buyInMax: 5000,
    oddsMultiple: 3,
    chips: [50, 100, 500],
  },
  high: {
    tier: 'high',
    label: 'High',
    tableMin: 250,
    tableMax: 12500,
    buyInMin: 5000,
    buyInMax: 25000,
    oddsMultiple: 3,
    chips: [250, 500, 2500],
  },
};
