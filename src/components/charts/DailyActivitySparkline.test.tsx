import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import DailyActivitySparkline from './DailyActivitySparkline';

describe('DailyActivitySparkline', () => {
  it('renders the data-daily-activity-sparkline container with empty data', () => {
    const { container } = render(<DailyActivitySparkline data={[]} />);
    expect(container.querySelector('[data-daily-activity-sparkline]')).not.toBeNull();
  });

  it('renders the chart with a non-trivial series', () => {
    const { container } = render(
      <DailyActivitySparkline
        data={[
          { date: '2026-05-20', sessions: 3 },
          { date: '2026-05-21', sessions: 5 },
          { date: '2026-05-22', sessions: 0 },
        ]}
      />,
    );
    expect(container.querySelector('[data-daily-activity-sparkline]')).not.toBeNull();
    expect(container.querySelector('.recharts-responsive-container')).not.toBeNull();
  });
});
