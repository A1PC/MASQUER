import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Board from './Board';
import type { LeaderboardRow } from '@/systems/stats';

function rows(count: number, currentRank?: number, currentId = 'me'): LeaderboardRow[] {
  return Array.from({ length: count }, (_, i) => ({
    rank: i + 1,
    userId: currentRank && i + 1 === currentRank ? currentId : `u-${i + 1}`,
    username: currentRank && i + 1 === currentRank ? 'Me' : `user${i + 1}`,
    value: 1000 - i * 10,
  }));
}

describe('Board', () => {
  it('renders the title', () => {
    render(<Board title="NET CHANGE" rows={rows(3)} currentUserId={null} />);
    expect(screen.getByText('NET CHANGE')).toBeInTheDocument();
  });

  it('All view shows top 10 entries', () => {
    render(<Board title="t" rows={rows(15)} currentUserId={null} />);
    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('user10')).toBeInTheDocument();
    expect(screen.queryByText('user11')).not.toBeInTheDocument();
  });

  it('highlights the current-user row with data-current-user', () => {
    const { container } = render(<Board title="t" rows={rows(5, 3, 'me')} currentUserId="me" />);
    const highlighted = container.querySelectorAll('[data-current-user]');
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]?.textContent).toContain('Me');
  });

  it('Me view shows current user + 3 above + 3 below', async () => {
    const user = userEvent.setup();
    // Place current user at rank 10 of 20, so Me window should be ranks 7-13.
    render(<Board title="t" rows={rows(20, 10, 'me')} currentUserId="me" />);
    await user.click(screen.getByRole('radio', { name: /me/i }));
    expect(screen.getByText('user7')).toBeInTheDocument();
    expect(screen.getByText('user13')).toBeInTheDocument();
    expect(screen.queryByText('user6')).not.toBeInTheDocument();
    expect(screen.queryByText('user14')).not.toBeInTheDocument();
  });

  it('renders "No rankings yet." when rows is empty', () => {
    render(<Board title="t" rows={[]} currentUserId={null} />);
    expect(screen.getByText(/no rankings yet/i)).toBeInTheDocument();
  });

  it('applies formatValue to each row value', () => {
    render(
      <Board title="t" rows={rows(2)} currentUserId={null} formatValue={(v) => `${v} chips`} />,
    );
    expect(screen.getByText('1000 chips')).toBeInTheDocument();
    expect(screen.getByText('990 chips')).toBeInTheDocument();
  });
});
