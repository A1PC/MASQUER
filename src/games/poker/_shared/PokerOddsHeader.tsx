import type { JSX } from 'react';
import OddsInfoBox from '@/games/_shared/OddsInfoBox';

type Variant = 'holdem' | 'five-card-draw' | 'omaha';

const CONTENT: Record<Variant, string> = {
  holdem: "No-Limit Hold'em · 2-6 players · 80 BB buy-in · Rebuy on bust",
  'five-card-draw': 'No-Limit Five-Card Draw · 2-6 players · 80 BB buy-in · Rebuy on bust',
  omaha: 'No-Limit Omaha · 2-6 players · 80 BB buy-in · Rebuy on bust',
};

interface Props {
  variant: Variant;
}

/**
 * Variant-aware `OddsInfoBox` content wrapper for the poker trio. Hold'em,
 * Draw, and Omaha all use the same chrome — only the inner copy differs.
 */
export default function PokerOddsHeader({ variant }: Props): JSX.Element {
  return (
    <OddsInfoBox>
      <span data-poker-odds-variant={variant}>{CONTENT[variant]}</span>
    </OddsInfoBox>
  );
}
