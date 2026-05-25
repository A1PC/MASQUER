import type { Meta, StoryObj } from '@storybook/react';
import ChipDenominationButton from './ChipDenominationButton';

const meta: Meta<typeof ChipDenominationButton> = {
  title: 'Games/Shared/ChipDenominationButton',
  component: ChipDenominationButton,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ background: '#06120c', padding: 24 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type S = StoryObj<typeof ChipDenominationButton>;

export const Five: S = { args: { denomination: 5 } };
export const TwentyFive: S = { args: { denomination: 25 } };
export const Hundred: S = { args: { denomination: 100 } };
export const TwoFifty: S = { args: { denomination: 250 } };
export const FiveHundred: S = { args: { denomination: 500 } };
export const Thousand: S = { args: { denomination: 1000 } };

export const Selected: S = { args: { denomination: 100, selected: true } };
export const Disabled: S = { args: { denomination: 100, disabled: true } };

export const FullLadder: S = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {[1, 5, 25, 100, 250, 500, 1000].map((d) => (
        <ChipDenominationButton key={d} denomination={d} />
      ))}
    </div>
  ),
};

export const RouletteSet: S = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {[5, 25, 100, 250, 500, 1000].map((d) => (
        <ChipDenominationButton
          key={d}
          denomination={d}
          selected={d === 100}
          ariaLabel={`Select ${d}-chip`}
          ariaPressed={d === 100}
        />
      ))}
    </div>
  ),
};

export const BlackjackSet: S = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {[1, 5, 25, 100, 500, 1000].map((d) => (
        <ChipDenominationButton key={d} denomination={d} ariaLabel={`Add ${d} chips to bet`} />
      ))}
    </div>
  ),
};
