import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select';
import { Field } from './Field';

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  parameters: { layout: 'centered' },
};
export default meta;
type S = StoryObj<typeof Select>;

export const TierPicker: S = {
  render: () => (
    <div style={{ width: 240 }}>
      <Field id="tier" label="Table tier">
        <Select defaultValue="mid">
          <Select.Trigger id="tier" aria-label="Table tier">
            <Select.Value placeholder="Choose a tier" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="low">Low — 10 to 100</Select.Item>
            <Select.Item value="mid">Mid — 100 to 1,000</Select.Item>
            <Select.Item value="high">High — 1,000 to 2,500</Select.Item>
          </Select.Content>
        </Select>
      </Field>
    </div>
  ),
};
