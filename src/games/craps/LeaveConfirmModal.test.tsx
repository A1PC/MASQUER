import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeaveConfirmModal from './LeaveConfirmModal';

describe('LeaveConfirmModal', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <LeaveConfirmModal
        open={false}
        bankroll={200}
        totalBoughtIn={200}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(container.querySelector('[data-leave-confirm]')).toBeNull();
  });

  it('shows bankroll, bought-in, and positive net when winning', () => {
    render(
      <LeaveConfirmModal
        open={true}
        bankroll={750}
        totalBoughtIn={500}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText('LEAVE TABLE?')).toBeInTheDocument();
    expect(screen.getByText(/Final bankroll/)).toBeInTheDocument();
    expect(screen.getByText('750')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('+250')).toBeInTheDocument();
  });

  it('shows negative net when losing', () => {
    render(
      <LeaveConfirmModal
        open={true}
        bankroll={100}
        totalBoughtIn={500}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText('-400')).toBeInTheDocument();
  });

  it('fires onCancel when CANCEL is clicked', async () => {
    const onCancel = vi.fn();
    render(
      <LeaveConfirmModal
        open={true}
        bankroll={200}
        totalBoughtIn={200}
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /CANCEL/ }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('fires onConfirm when CONFIRM LEAVE is clicked', async () => {
    const onConfirm = vi.fn();
    render(
      <LeaveConfirmModal
        open={true}
        bankroll={200}
        totalBoughtIn={200}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /CONFIRM LEAVE/ }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
