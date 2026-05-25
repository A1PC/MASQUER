import type { Meta, StoryObj } from '@storybook/react';
import PlayingCard, { type Rank, type Suit } from './PlayingCard';

const meta: Meta<typeof PlayingCard> = {
  title: 'Brand/PlayingCard',
  component: PlayingCard,
  args: { rank: 7, suit: 'h', size: 'lg' },
  argTypes: {
    rank: {
      control: 'select',
      options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] satisfies Rank[],
    },
    suit: { control: 'select', options: ['h', 'd', 'c', 's'] satisfies Suit[] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    faceDown: { control: 'boolean' },
  },
  parameters: { layout: 'centered' },
};
export default meta;
type S = StoryObj<typeof PlayingCard>;
export const Number: S = {};
export const Ace: S = { args: { rank: 1, suit: 's' } };
export const Jack: S = { args: { rank: 11, suit: 'h' } };
export const Queen: S = { args: { rank: 12, suit: 'h' } };
export const King: S = { args: { rank: 13, suit: 's' } };
export const Back: S = { args: { faceDown: true } };
