import type { Meta, StoryObj } from '@storybook/react';
import { Field } from './Field';
import { Input } from './Input';

const meta: Meta<typeof Field> = {
  title: 'UI/Field',
  component: Field,
  args: { id: 'username', label: 'Username' },
  parameters: { layout: 'centered' },
};
export default meta;
type S = StoryObj<typeof Field>;

export const WithHelper: S = {
  args: { helper: 'This is the focus state (gold ring).' },
  render: (args) => (
    <Field {...args}>
      <Input id={args.id} defaultValue="highroller" />
    </Field>
  ),
};

export const WithError: S = {
  args: { label: 'Bet amount', error: 'Exceeds table maximum of 2,500.' },
  render: (args) => (
    <Field {...args}>
      <Input id={args.id} state="error" defaultValue="999999" />
    </Field>
  ),
};
