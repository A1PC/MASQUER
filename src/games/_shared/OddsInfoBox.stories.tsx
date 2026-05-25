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

export const Roulette: S = {
  args: {
    children:
      'Straight 35:1 · Split 17:1 · Street 11:1 · Corner 8:1 · Six-line 5:1 · Column 2:1 · Dozen 2:1 · Red/Black/Odd/Even/Low/High 1:1',
  },
};

export const CustomTitle: S = {
  args: { title: 'HOUSE EDGE', children: '0% · Fair coin, no house take.' },
};

export const NoTitle: S = { args: { title: null, children: 'Win 1:1' } };
