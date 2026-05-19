import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BoardBar from './BoardBar';

describe('BoardBar', () => {
  it('renders empty state when no rows', () => {
    render(<BoardBar rows={[]} currentUserId={null} />);
    expect(screen.getByText(/no rankings yet/i)).toBeInTheDocument();
  });

  it('renders chart with top-10 rows when data', () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({
      rank: i + 1,
      userId: `u-${i + 1}`,
      username: `p${i + 1}`,
      value: 100 - i * 5,
    }));
    const { container } = render(<BoardBar rows={rows} currentUserId="u-3" />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
