import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip, TooltipProvider } from './Tooltip';
import { Button } from './Button';

const meta: Meta<typeof Tooltip> = {
  title: 'UI/Tooltip',
  component: Tooltip,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
};
export default meta;

export const OnButton: StoryObj<typeof Tooltip> = {
  render: () => (
    <Tooltip content="House edge on this table is 0.5%.">
      <Button variant="secondary">House edge</Button>
    </Tooltip>
  ),
};
