import type { Meta, StoryObj } from '@storybook/react';
import { Input, Textarea } from './Input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  args: { placeholder: 'highroller' },
  argTypes: { state: { control: 'select', options: ['default', 'error'] } },
  parameters: { layout: 'centered' },
};
export default meta;
type S = StoryObj<typeof Input>;

export const Default: S = {};
export const Filled: S = { args: { defaultValue: 'highroller' } };
export const Error: S = { args: { state: 'error', defaultValue: '999999' } };
export const Disabled: S = { args: { disabled: true, defaultValue: 'locked' } };

export const TextareaDefault: StoryObj<typeof Textarea> = {
  render: () => <Textarea placeholder="Add a note about this hand…" />,
};
