import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

// Control the effective-reduced-motion signal directly.
const reduceMotion = vi.fn<() => boolean>();
vi.mock('./useEffectiveReducedMotion', () => ({
  useEffectiveReducedMotion: () => reduceMotion(),
}));

import { PageTransition } from './PageTransition';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PageTransition>
        <p data-testid="page-content">route body</p>
      </PageTransition>
    </MemoryRouter>,
  );
}

describe('PageTransition', () => {
  beforeEach(() => reduceMotion.mockReset());

  it('renders children with the animated wrapper when motion is allowed', () => {
    reduceMotion.mockReturnValue(false);
    const { container } = renderAt('/lobby');
    expect(screen.getByTestId('page-content')).toHaveTextContent('route body');
    // The framer motion.div wrapper carries the layout class.
    expect(container.querySelector('.h-full')).not.toBeNull();
  });

  it('renders children directly with no motion wrapper under reduced motion', () => {
    reduceMotion.mockReturnValue(true);
    const { container } = renderAt('/lobby');
    expect(screen.getByTestId('page-content')).toHaveTextContent('route body');
    // No animated wrapper div is inserted around the content.
    expect(container.querySelector('.h-full')).toBeNull();
  });
});
