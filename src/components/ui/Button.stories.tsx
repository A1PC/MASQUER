import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Deal' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'danger', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  parameters: { layout: 'centered' },
};
export default meta;
type S = StoryObj<typeof Button>;
export const Primary: S = {};
export const Secondary: S = { args: { variant: 'secondary', children: 'Cash Out' } };
export const Danger: S = { args: { variant: 'danger', children: 'Fold' } };
export const Ghost: S = { args: { variant: 'ghost', children: 'Cancel' } };
export const Loading: S = { args: { loading: true, children: 'Dealing…' } };
export const Disabled: S = { args: { disabled: true, children: 'Disabled' } };

export const Sizes: S = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
