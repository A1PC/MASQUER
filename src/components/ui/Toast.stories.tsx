import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider } from './Toast';
import { useToast } from './toast-context';
import { Button } from './Button';

function Demo(): React.ReactElement {
  const { toast } = useToast();
  return (
    <div className="flex gap-2.5">
      <Button
        variant="secondary"
        onClick={() =>
          toast({ title: 'Round recorded', description: 'Your hand was logged.', tone: 'info' })
        }
      >
        Info
      </Button>
      <Button
        onClick={() =>
          toast({ title: 'Jackpot!', description: 'You won 5,000 chips on Plinko.', tone: 'win' })
        }
      >
        Win
      </Button>
      <Button
        variant="danger"
        onClick={() => toast({ title: 'Busted', description: 'You lost 250 chips.', tone: 'loss' })}
      >
        Loss
      </Button>
    </div>
  );
}

const meta: Meta<typeof ToastProvider> = {
  title: 'UI/Toast',
  component: ToastProvider,
  parameters: { layout: 'centered' },
};
export default meta;

export const Tones: StoryObj<typeof ToastProvider> = {
  render: () => (
    <ToastProvider>
      <Demo />
    </ToastProvider>
  ),
};
