import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';
import { Button } from './Button';

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(<EmptyState title="No rounds yet" description="Play a hand to see your history." />);
    expect(screen.getByRole('heading', { name: 'No rounds yet' })).toBeInTheDocument();
    expect(screen.getByText('Play a hand to see your history.')).toBeInTheDocument();
  });

  it('renders an optional action', () => {
    render(<EmptyState title="No rounds yet" action={<Button>Find a table</Button>} />);
    expect(screen.getByRole('button', { name: 'Find a table' })).toBeInTheDocument();
  });
});
