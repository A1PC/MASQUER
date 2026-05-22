import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';

// Default the effective-reduced-motion signal so the dialog mounts/unmounts
// instantly (no AnimatePresence exit hold, which never resolves under jsdom).
// Individual tests flip this to exercise the animated path.
const reduceMotion = vi.fn<() => boolean>(() => true);
vi.mock('@/motion/useEffectiveReducedMotion', () => ({
  useEffectiveReducedMotion: () => reduceMotion(),
}));

import { Modal, Drawer } from './Modal';

describe('Modal', () => {
  beforeEach(() => reduceMotion.mockReturnValue(true));

  it('opens from trigger and closes on Escape', () => {
    render(
      <Modal trigger={<button>Open</button>} title="Leave table?">
        <p>Cash out 1,840.</p>
      </Modal>,
    );
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByRole('dialog', { name: 'Leave table?' })).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes via the labelled close button', () => {
    render(
      <Modal trigger={<button>Open</button>} title="Leave table?">
        <p>Body</p>
      </Modal>,
    );
    fireEvent.click(screen.getByText('Open'));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders an optional description', () => {
    render(
      <Modal
        trigger={<button>Open</button>}
        title="Leave table?"
        description="You will keep your chips."
      >
        <p>Body</p>
      </Modal>,
    );
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByText('You will keep your chips.')).toBeInTheDocument();
  });

  it('renders its content and title under full motion (animated path)', () => {
    reduceMotion.mockReturnValue(false);
    render(
      <Modal trigger={<button>Open</button>} title="Leave table?">
        <p>Cash out 1,840.</p>
      </Modal>,
    );
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByRole('dialog', { name: 'Leave table?' })).toBeInTheDocument();
    expect(screen.getByText('Cash out 1,840.')).toBeInTheDocument();
  });
});

describe('Drawer', () => {
  beforeEach(() => reduceMotion.mockReturnValue(true));

  it('opens from trigger and renders its title', () => {
    render(
      <Drawer trigger={<button>Settings</button>} title="Table settings">
        <p>Options</p>
      </Drawer>,
    );
    fireEvent.click(screen.getByText('Settings'));
    expect(screen.getByRole('dialog', { name: 'Table settings' })).toBeInTheDocument();
  });

  it('renders content under full motion (animated path)', () => {
    reduceMotion.mockReturnValue(false);
    render(
      <Drawer trigger={<button>Settings</button>} title="Table settings">
        <p>Options</p>
      </Drawer>,
    );
    fireEvent.click(screen.getByText('Settings'));
    expect(screen.getByRole('dialog', { name: 'Table settings' })).toBeInTheDocument();
    expect(screen.getByText('Options')).toBeInTheDocument();
  });
});
