import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard from './StatCard';

describe('StatCard', () => {
  it('renders label + value', () => {
    render(<StatCard label="Total wagered" value="12,345" />);
    expect(screen.getByText(/total wagered/i)).toBeInTheDocument();
    expect(screen.getByText('12,345')).toBeInTheDocument();
  });

  it('renders an optional sub-line', () => {
    render(<StatCard label="L" value="V" sub="across 99 rounds" />);
    expect(screen.getByText(/across 99 rounds/i)).toBeInTheDocument();
  });

  it('marks tone via data-tone for positive', () => {
    const { container } = render(<StatCard label="L" value="V" tone="positive" />);
    expect(container.querySelector('[data-tone="positive"]')).toBeInTheDocument();
  });

  it('marks tone via data-tone for negative', () => {
    const { container } = render(<StatCard label="L" value="V" tone="negative" />);
    expect(container.querySelector('[data-tone="negative"]')).toBeInTheDocument();
  });
});
