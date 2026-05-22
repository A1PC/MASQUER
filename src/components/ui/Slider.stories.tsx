import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from './Slider';
import { Field } from './Field';

const meta: Meta<typeof Slider> = {
  title: 'UI/Slider',
  component: Slider,
  parameters: { layout: 'centered' },
};
export default meta;
type S = StoryObj<typeof Slider>;

export const BetSlider: S = {
  render: () => (
    <div style={{ width: 280 }}>
      <Field id="bet" label="Bet amount" helper="10 to 2,500">
        <Slider
          id="bet"
          aria-label="Bet amount"
          min={10}
          max={2500}
          step={10}
          defaultValue={[500]}
        />
      </Field>
    </div>
  ),
};
