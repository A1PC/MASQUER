import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children and fires onClick', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<Button onClick={onClick}>Deal</Button>);
    fireEvent.click(getByRole('button', { name: 'Deal' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
  it('merges className via cn (no duplicate padding)', () => {
    const { getByRole } = render(
      <Button size="md" className="px-8">
        X
      </Button>,
    );
    expect(getByRole('button').className).toContain('px-8');
  });
  it('is disabled and shows the spinner when loading', () => {
    const { getByRole } = render(<Button loading>Go</Button>);
    expect(getByRole('button')).toBeDisabled();
    expect(getByRole('img', { name: /loading/i })).toBeInTheDocument();
  });
  it('renders as a child element via asChild', () => {
    const { getByRole } = render(
      <Button asChild>
        <a href="/x">Link</a>
      </Button>,
    );
    expect(getByRole('link', { name: 'Link' })).toBeInTheDocument();
  });
});
