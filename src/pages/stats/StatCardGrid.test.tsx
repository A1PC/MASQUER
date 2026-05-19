import type { Peaks, SessionStats, StreakStats, UserMetrics, ExtraStats } from '@/systems/stats';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCardGrid from './StatCardGrid';

const baseMetrics: UserMetrics = {
  totalRounds: 100,
  totalWagered: 5000,
  totalWon: 4900,
  totalLost: 2400,
  netChange: 1250,
  rtp: 98.2,
  timePlayedMs: 3_725_000,
};
const baseStreaks: StreakStats = { longestWin: 7, longestLoss: 4 };
const basePeaks: Peaks = {
  biggestWin: 320,
  biggestWinAt: 1_700_000_000_000,
  biggestLoss: 180,
  biggestLossAt: 1_700_000_001_000,
  highestBalance: 2500,
};
const baseSessions: SessionStats = { best: 500, worst: -300, count: 12 };
const baseExtras: ExtraStats = { avgBetSize: 50, winRate: 47.5 };

describe('StatCardGrid', () => {
  it('renders 16 cards with the expected labels', () => {
    render(
      <StatCardGrid
        metrics={baseMetrics}
        streaks={baseStreaks}
        peaks={basePeaks}
        sessions={baseSessions}
        extras={baseExtras}
      />,
    );
    for (const label of [
      /net change/i,
      /rounds played/i,
      /total wagered/i,
      /rtp/i,
      /total won/i,
      /total lost/i,
      /time played/i,
      /win rate/i,
      /biggest win/i,
      /biggest loss/i,
      /highest balance/i,
      /avg bet/i,
      /win streak/i,
      /loss streak/i,
      /best session/i,
      /worst session/i,
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('renders the signed net change value', () => {
    render(
      <StatCardGrid
        metrics={baseMetrics}
        streaks={baseStreaks}
        peaks={basePeaks}
        sessions={baseSessions}
        extras={baseExtras}
      />,
    );
    expect(screen.getByText('+1,250')).toBeInTheDocument();
  });
});
