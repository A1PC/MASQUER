import type { JSX } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider } from './Toast';
import { useToast, type ToastTone } from './toast-context';

const { playSpy } = vi.hoisted(() => ({ playSpy: vi.fn() }));
vi.mock('@/systems/sound/useSound', () => ({ useSound: () => ({ play: playSpy }) }));

beforeEach(() => playSpy.mockClear());

function Trigger({ tone }: { tone?: ToastTone }): JSX.Element {
  const { toast } = useToast();
  return (
    <button
      onClick={() =>
        toast({
          title: 'Jackpot!',
          description: 'You won 5,000 chips on Plinko.',
          ...(tone ? { tone } : {}),
        })
      }
    >
      Fire
    </button>
  );
}

describe('useToast / ToastProvider', () => {
  it('renders a toast with title + description in a live region', async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Fire'));
    await screen.findAllByText('Jackpot!');
    // The visible toast lives in the bottom-right notifications viewport region.
    const viewport = screen.getByRole('region', { name: /notifications/i });
    expect(viewport).toHaveTextContent('Jackpot!');
    expect(viewport).toHaveTextContent('You won 5,000 chips on Plinko.');
    // Radix mirrors it into a polite live region for screen readers.
    await waitFor(() =>
      expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent('Jackpot!'),
    );
  });

  it('dismisses when the close button is pressed', async () => {
    render(
      <ToastProvider>
        <Trigger tone="win" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Fire'));
    await screen.findByText('Jackpot!');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(screen.queryByText('Jackpot!')).not.toBeInTheDocument());
  });

  it('plays the tone-mapped sound when a toast fires', async () => {
    render(
      <ToastProvider>
        <Trigger tone="win" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Fire'));
    await screen.findAllByText('Jackpot!');
    expect(playSpy).toHaveBeenCalledWith('win.medium');
  });

  it('plays loss / ui.toggle for loss and info tones', () => {
    const { rerender } = render(
      <ToastProvider>
        <Trigger tone="loss" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Fire'));
    expect(playSpy).toHaveBeenLastCalledWith('loss');
    playSpy.mockClear();
    rerender(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Fire'));
    expect(playSpy).toHaveBeenLastCalledWith('ui.toggle');
  });

  it('throws when useToast is used outside a provider', () => {
    function Orphan(): JSX.Element {
      useToast();
      return <span />;
    }
    expect(() => render(<Orphan />)).toThrow(/ToastProvider/);
  });
});
