import type { IconName } from '@/components/ui';

/** One source of truth for nav + lobby icons. Keys = game/route slugs.
 *  Values are lucide icon names; pick the closest available glyph.
 *
 *  Declared with `satisfies` (not `Record<string, IconName>`) so each key keeps
 *  its literal `IconName` type — indexing returns `IconName`, never `undefined`
 *  (which `noUncheckedIndexedAccess` would otherwise infer for a string Record). */
export const NAV_ICON = {
  lobby: 'LayoutGrid',
  'coin-flip': 'CircleDollarSign',
  blackjack: 'Spade',
  roulette: 'CircleDot',
  slots: 'Cherry',
  baccarat: 'Diamond',
  bingo: 'Grid3x3',
  plinko: 'ChevronsDown',
  poker: 'Club',
  craps: 'Dices',
  lottery: 'Ticket',
  stats: 'ChartColumn',
  leaderboard: 'Trophy',
  settings: 'Settings',
} satisfies Record<string, IconName>;
