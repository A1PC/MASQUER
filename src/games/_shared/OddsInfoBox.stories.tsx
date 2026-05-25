import type { Meta, StoryObj } from '@storybook/react';
import OddsInfoBox from './OddsInfoBox';

const meta: Meta<typeof OddsInfoBox> = {
  title: 'Games/Shared/OddsInfoBox',
  component: OddsInfoBox,
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
type S = StoryObj<typeof OddsInfoBox>;

export const Blackjack: S = {
  args: { children: 'Blackjack 3:2 · Win 1:1 · Insurance 2:1 · 5-Card Charlie 3:2' },
};

export const CoinFlip: S = { args: { children: 'Win 1:1' } };

export const CustomTitle: S = {
  args: { title: 'HOUSE EDGE', children: '0% · Fair coin, no house take.' },
};

export const NoTitle: S = { args: { title: null, children: 'Win 1:1' } };
