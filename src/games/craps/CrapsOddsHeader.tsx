import type { JSX } from 'react';
import OddsInfoBox from '@/games/_shared/OddsInfoBox';

/**
 * Craps-specific `OddsInfoBox` wrapper. Mirrors `PokerOddsHeader` — a thin
 * payout summary sitting in the top-right of the game page beside the LobbyButton.
 */
export default function CrapsOddsHeader(): JSX.Element {
  return (
    <OddsInfoBox>
      <span data-craps-odds>
        Pass/Don&apos;t 1:1 &middot; Field 1:1 (2&times; on 2, 3&times; on 12) &middot; Place 4-10
        (varies) &middot; Hardways 7-9:1 &middot; Props 4-30:1
      </span>
    </OddsInfoBox>
  );
}
