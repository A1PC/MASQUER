import type { IconName } from '@/components/ui';

/** One source of truth for nav + lobby icons. Keys = game/route slugs.
 *  Values are lucide icon names; pick the closest available glyph. */
export const NAV_ICON: Record<string, IconName> = {
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
};
