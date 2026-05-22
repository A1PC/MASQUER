import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './EmptyState';
import { Button } from './Button';

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  parameters: { layout: 'centered' },
  args: {
    title: 'No rounds yet',
    description: 'Sit down at a table and your hands will appear here.',
  },
};
export default meta;
type S = StoryObj<typeof EmptyState>;

export const Default: S = {};
export const WithAction: S = {
  args: { action: <Button>Find a table</Button> },
};
