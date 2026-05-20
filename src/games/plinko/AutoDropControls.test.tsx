import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AutoDropControls from './AutoDropControls';

describe('AutoDropControls', () => {
  it('shows progress text', () => {
    render(<AutoDropControls ballsSpawned={3} ballsRequested={10} onStop={vi.fn()} />);
    expect(screen.getByText(/3 \/ 10 balls/)).toBeInTheDocument();
  });

  it('clicking STOP fires onStop', async () => {
    const onStop = vi.fn();
    render(<AutoDropControls ballsSpawned={1} ballsRequested={5} onStop={onStop} />);
    await userEvent.click(screen.getByRole('button', { name: /STOP AUTO/ }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
