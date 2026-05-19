import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CallBoard from './CallBoard';

describe('CallBoard', () => {
  it('renders em-dash placeholder when no calls yet', () => {
    render(<CallBoard calledSoFar={[]} callCount={0} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText(/no calls yet/i)).toBeInTheDocument();
  });

  it('renders the most recent call in the big ball', () => {
    render(<CallBoard calledSoFar={[7, 23, 41]} callCount={3} />);
    expect(screen.getByText('41')).toBeInTheDocument();
  });

  it('renders the call counter', () => {
    render(<CallBoard calledSoFar={[7]} callCount={1} />);
    expect(screen.getByText(/Ball 1 of 90/i)).toBeInTheDocument();
  });

  it('renders up to 10 recent calls (excluding current)', () => {
    const calls = Array.from({ length: 12 }, (_, i) => i + 1);
    const { container } = render(<CallBoard calledSoFar={calls} callCount={12} />);
    expect(container.querySelectorAll('[data-recent-ball]')).toHaveLength(10);
  });
});
