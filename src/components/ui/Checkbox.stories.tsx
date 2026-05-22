import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'UI/Checkbox',
  component: Checkbox,
  args: { 'aria-label': 'I am 21 or older' },
  parameters: { layout: 'centered' },
};
export default meta;
type S = StoryObj<typeof Checkbox>;

export const Unchecked: S = {};
export const Checked: S = { args: { defaultChecked: true } };
export const WithLabel: S = {
  render: () => (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: '#efe6d2' }}>
      <Checkbox defaultChecked id="terms" />
      <span style={{ fontSize: 13 }}>I am 21 or older</span>
    </label>
  ),
};
