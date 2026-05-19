// Re-export shim. The real module lives in `src/systems/stats.ts` (ADR-0038).
// This shim is temporary — PR E switches admin imports directly to @/systems/stats
// and deletes this file.
export {
  getAllUserStats,
  getSiteWideStats,
  getNetFlowSeries,
  getGameDistribution,
  getTopWinners,
  getTopLosers,
  getUserStatsRow,
  getUserGameDistribution,
  getUserGameTime,
  getUserSessionTime,
  getUserNetFlowSeries,
} from '@/systems/stats';

export type {
  UserStatsRow,
  SiteWideStats,
  NetFlowPoint,
  GameDistributionPoint,
} from '@/systems/stats';
