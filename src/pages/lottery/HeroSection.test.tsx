import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import HeroSection from './HeroSection';
import { resetDb } from '@/test/db-helpers';
import { db } from '@/db';

describe('HeroSection', () => {
  beforeEach(async () => {
    await resetDb();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 4, 19, 12, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('renders pre-draw countdown when today has no draw', () => {
    render(<HeroSection />);
    expect(screen.getByText(/next draw in/i)).toBeInTheDocument();
    expect(screen.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeInTheDocument();
  });

  it("renders big balls when today's draw is settled", async () => {
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [3, 12, 25, 41, 49],
      bonus: 7,
      totalLines: 0,
      totalRevenue: 0,
      totalPayout: 0,
    });
    render(<HeroSection />);
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('41')).toBeInTheDocument();
      expect(screen.getByText('49')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
    });
  });
});
