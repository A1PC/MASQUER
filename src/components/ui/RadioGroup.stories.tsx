import type { Meta, StoryObj } from '@storybook/react';
import { RadioGroup, RadioGroupItem } from './RadioGroup';

const meta: Meta<typeof RadioGroup> = {
  title: 'UI/RadioGroup',
  component: RadioGroup,
  parameters: { layout: 'centered' },
};
export default meta;
type S = StoryObj<typeof RadioGroup>;

export const Stakes: S = {
  render: () => (
    <RadioGroup defaultValue="mid" aria-label="Stake">
      {(['low', 'mid', 'high'] as const).map((v) => (
        <label
          key={v}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: '#efe6d2' }}
        >
          <RadioGroupItem value={v} id={`stake-${v}`} />
          <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{v}</span>
        </label>
      ))}
    </RadioGroup>
  ),
};
